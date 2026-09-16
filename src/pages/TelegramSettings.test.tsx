import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getTelegramSettings,
  updateTelegramSettings,
} from "../api/telegram";
import { useAuthStore } from "../store/auth";
import { useLanguage } from "../telegram/i18n";
import { TelegramSettings } from "./TelegramSettings";

vi.mock("../api/telegram", () => ({
  getTelegramSettings: vi.fn(),
  updateTelegramSettings: vi.fn(),
  linkTelegramEmail: vi.fn(),
}));
vi.mock("../api/auth", () => ({ changePassword: vi.fn(), getMe: vi.fn() }));
vi.mock("../telegram/runtime", () => ({ requestTelegramWriteAccess: vi.fn() }));

const getSettingsMock = vi.mocked(getTelegramSettings);
const updateSettingsMock = vi.mocked(updateTelegramSettings);

function renderSettings() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <TelegramSettings />
    </QueryClientProvider>,
  );
}

describe("TelegramSettings threshold alerts", () => {
  beforeEach(() => {
    useLanguage.setState({ language: "en" });
    useAuthStore.setState({
      user: {
        id: 1,
        email: "owner@example.com",
        role: "user",
        created_at: "2026-09-11T00:00:00Z",
      },
    });
    getSettingsMock.mockReset();
    updateSettingsMock.mockReset();
    getSettingsMock.mockResolvedValue({
      enabled: true,
      language: "en",
      timezone: "UTC",
      daily_at: "09:00:00",
      alert_threshold_percent: null,
    });
    updateSettingsMock.mockImplementation(async (settings) => settings);
  });

  it("saves a numeric threshold and clears it with an empty input", async () => {
    renderSettings();
    const threshold = await screen.findByRole("spinbutton", {
      name: /24h alert threshold/,
    });

    fireEvent.change(threshold, { target: { value: "12.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateSettingsMock.mock.calls.at(-1)?.[0]).toEqual({
      enabled: true,
      language: "en",
      timezone: "UTC",
      daily_at: "09:00:00",
      alert_threshold_percent: 12.5,
    }));

    fireEvent.change(threshold, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateSettingsMock.mock.calls.at(-1)?.[0]).toEqual({
      enabled: true,
      language: "en",
      timezone: "UTC",
      daily_at: "09:00:00",
      alert_threshold_percent: null,
    }));
  });
});
