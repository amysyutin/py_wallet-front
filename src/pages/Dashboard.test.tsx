import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPortfolioHistory, getPortfolioSummary } from "../api/portfolio";
import { useLanguage } from "../telegram/i18n";
import { Dashboard } from "./Dashboard";

vi.mock("../api/portfolio", () => ({
  getPortfolioHistory: vi.fn(),
  getPortfolioSummary: vi.fn(),
}));

const getPortfolioHistoryMock = vi.mocked(getPortfolioHistory);
const getPortfolioSummaryMock = vi.mocked(getPortfolioSummary);

function renderDashboard(initialEntry: string, dashboardPath: string, walletsPath: string) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path={dashboardPath} element={<Dashboard />} />
          <Route path={walletsPath} element={<p>Wallet creation</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("first wallet activation", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    useLanguage.setState({ language: "ru" });
    getPortfolioHistoryMock.mockReset();
    getPortfolioSummaryMock.mockReset();
    getPortfolioSummaryMock.mockResolvedValue({
      total_usd: "0",
      wallets_count: 0,
      active_wallets_count: 0,
      last_snapshot_at: null,
      top_assets: [],
    });
  });

  it("guides a new web user to the wallet form with one primary action", async () => {
    renderDashboard("/", "/", "/wallets");

    expect(await screen.findByRole("heading", { name: "Добавьте публичный адрес" })).toBeInTheDocument();
    expect(screen.getByText("PyWallet никогда не просит seed-фразу, private key или подпись транзакции.")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(getPortfolioHistoryMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("link", { name: "Добавить первый кошелёк" }));

    expect(await screen.findByText("Wallet creation")).toBeInTheDocument();
  });

  it("keeps the activation path and copy inside the English Telegram Mini App", async () => {
    window.history.replaceState({}, "", "/telegram");
    useLanguage.setState({ language: "en" });
    renderDashboard("/telegram", "/telegram", "/telegram/wallets");

    expect(await screen.findByRole("heading", { name: "Add a public address" })).toBeInTheDocument();
    expect(screen.getByText("PyWallet never asks for a seed phrase, private key, or transaction signature.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Add your first wallet" }));

    await waitFor(() => expect(screen.getByText("Wallet creation")).toBeInTheDocument());
  });
});
