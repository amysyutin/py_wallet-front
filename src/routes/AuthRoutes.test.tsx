import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMe } from "../api/auth";
import { useAuthStore } from "../store/auth";
import { AdminRoute } from "./AdminRoute";
import { ProtectedRoute } from "./ProtectedRoute";

vi.mock("../api/auth", () => ({ getMe: vi.fn() }));

const getMeMock = vi.mocked(getMe);

function queryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderProtectedRoute() {
  return render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route
            path="/private"
            element={<ProtectedRoute><p>Private page</p></ProtectedRoute>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderAdminRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/" element={<p>Dashboard</p>} />
        <Route path="/admin" element={<AdminRoute><p>Admin page</p></AdminRoute>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("authentication route guards", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null });
    getMeMock.mockReset();
  });

  it("redirects an unauthenticated visitor to login", () => {
    renderProtectedRoute();

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(getMeMock).not.toHaveBeenCalled();
  });

  it("loads the user before rendering protected content", async () => {
    useAuthStore.getState().setToken("access-token");
    getMeMock.mockResolvedValue({
      id: 7,
      email: "owner@example.com",
      role: "admin",
      created_at: "2026-01-01",
    });

    renderProtectedRoute();

    expect(await screen.findByText("Private page")).toBeInTheDocument();
    await waitFor(() => expect(useAuthStore.getState().user?.role).toBe("admin"));
  });

  it("redirects a non-admin away from the admin route", () => {
    useAuthStore.setState({
      user: { id: 8, email: "user@example.com", role: "user", created_at: "2026-01-01" },
    });

    renderAdminRoute();

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Admin page")).not.toBeInTheDocument();
  });

  it("allows an administrator to open the admin route", () => {
    useAuthStore.setState({
      user: { id: 7, email: "owner@example.com", role: "admin", created_at: "2026-01-01" },
    });

    renderAdminRoute();

    expect(screen.getByText("Admin page")).toBeInTheDocument();
  });
});
