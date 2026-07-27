import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./client";
import { useAuthStore } from "../store/auth";

const fetchMock = vi.fn<typeof fetch>();

describe("apiFetch", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null });
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds the bearer token to authenticated requests", async () => {
    useAuthStore.getState().setToken("access-token");
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiFetch<void>("/auth/me")).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/me");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer access-token");
    expect(new Headers(init?.headers).get("X-Client-Channel")).toBe("web");
  });

  it("marks requests made inside the Telegram Mini App", async () => {
    Object.defineProperty(window, "Telegram", {
      configurable: true,
      value: { WebApp: { initData: "signed-init-data" } },
    });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiFetch<void>("/wallets")).resolves.toBeUndefined();

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init?.headers).get("X-Client-Channel")).toBe("telegram");

    delete window.Telegram;
  });

  it("logs out and preserves the backend message on 401", async () => {
    useAuthStore.getState().setToken("expired-token");
    useAuthStore.setState({
      user: { id: 7, email: "owner@example.com", role: "admin", created_at: "2026-01-01" },
    });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Session expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(apiFetch("/auth/me")).rejects.toMatchObject({
      status: 401,
      message: "Session expired",
    });
    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null });
    expect(localStorage.getItem("py_wallet.access_token")).toBeNull();
  });

  it("returns a stable error when the backend is unreachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("network details"));

    await expect(apiFetch("/health", { auth: false })).rejects.toMatchObject({
      status: 0,
      message: "Backend недоступен. Проверьте локальный backend или Vite proxy",
    });
  });
});
