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

describe("portfolio data health", () => {
  beforeEach(() => {
    localStorage.clear();
    useLanguage.setState({ language: "en" });
    getPortfolioHistoryMock.mockReset();
    getPortfolioSummaryMock.mockReset();
    getPortfolioHistoryMock.mockResolvedValue({ days: 30, points: [] });
  });

  it("shows conservative coverage, sources and affected networks", async () => {
    getPortfolioSummaryMock.mockResolvedValue({
      total_usd: "125.50",
      wallets_count: 3,
      active_wallets_count: 3,
      last_snapshot_at: "2026-07-28T08:30:00Z",
      top_assets: [],
      data_health: {
        state: "partial",
        freshness: "fresh",
        as_of: "2026-07-28T08:00:00Z",
        wallets_covered: 2,
        wallets_total: 3,
        snapshot_wallets: 1,
        manual_wallets: 1,
        missing_wallets: 1,
        refresh_in_progress: false,
        price_quality: {
          state: "incomplete",
          sources: ["coingecko", "unknown"],
          assets_priced: 2,
          assets_total: 3,
        },
        chain_issues: [
          {
            chain: "base",
            status: "failed",
            error_type: "rpc_unavailable",
            wallets_count: 1,
          },
        ],
      },
    });

    renderDashboard("/", "/", "/wallets");

    expect(await screen.findByRole("article", { name: "Data health" })).toHaveTextContent("Partial");
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByText(/1 snapshot · 1 manual · 1 missing/)).toBeInTheDocument();
    expect(screen.getByText("base (1)")).toBeInTheDocument();
    expect(screen.getByText(/Some assets do not have a price/)).toBeInTheDocument();
    expect(screen.getByText(/2\/3 positions priced/)).toBeInTheDocument();
    expect(screen.getByText(/CoinGecko, unknown/)).toBeInTheDocument();
    expect(screen.queryByText(/rpc_unavailable/)).not.toBeInTheDocument();
  });

  it("makes an active refresh explicit without hiding the persisted total", async () => {
    getPortfolioSummaryMock.mockResolvedValue({
      total_usd: "125.50",
      wallets_count: 1,
      active_wallets_count: 1,
      last_snapshot_at: "2026-07-28T08:30:00Z",
      top_assets: [],
      data_health: {
        state: "updating",
        freshness: "aging",
        as_of: "2026-07-28T08:30:00Z",
        wallets_covered: 1,
        wallets_total: 1,
        snapshot_wallets: 1,
        manual_wallets: 0,
        missing_wallets: 0,
        refresh_in_progress: true,
        chain_issues: [],
        price_quality: {
          state: "complete",
          sources: ["coingecko"],
          assets_priced: 2,
          assets_total: 2,
        },
      },
    });

    renderDashboard("/", "/", "/wallets");

    expect(await screen.findByRole("article", { name: "Data health" })).toHaveTextContent("Updating");
    expect(screen.getByText("A refresh is currently running.")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByText(/All non-zero positions are priced/)).toBeInTheDocument();
  });
});

describe("dashboard history cleanup", () => {
  beforeEach(() => {
    localStorage.clear();
    useLanguage.setState({ language: "en" });
    getPortfolioHistoryMock.mockReset();
    getPortfolioSummaryMock.mockReset();
    getPortfolioSummaryMock.mockResolvedValue({
      total_usd: "125.50",
      wallets_count: 1,
      active_wallets_count: 1,
      last_snapshot_at: "2026-07-30T08:30:00Z",
      top_assets: [],
    });
  });

  it("uses one history request and removes the duplicate dashboard cards", async () => {
    getPortfolioHistoryMock.mockResolvedValue({ days: 32, points: [] });

    renderDashboard("/", "/", "/wallets");

    expect(await screen.findByText("No history")).toBeInTheDocument();
    expect(getPortfolioHistoryMock).toHaveBeenCalledTimes(1);
    expect(getPortfolioHistoryMock).toHaveBeenCalledWith({ days: 32 });
    expect(screen.queryByText("30 Days")).not.toBeInTheDocument();
    expect(screen.queryByText("Balance movement")).not.toBeInTheDocument();
    expect(screen.queryByText("Движение баланса")).not.toBeInTheDocument();
  });

  it("does not present a history API failure as an empty history", async () => {
    getPortfolioHistoryMock.mockRejectedValue(new Error("history unavailable"));

    renderDashboard("/", "/", "/wallets");

    expect(await screen.findByText("Could not load history")).toBeInTheDocument();
    expect(screen.getByText(/saved portfolio value is still available/i)).toBeInTheDocument();
    expect(screen.queryByText("No history")).not.toBeInTheDocument();
  });
});
