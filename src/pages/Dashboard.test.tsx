import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGroups } from "../api/groups";
import {
  getPortfolioAllocation,
  getPortfolioHistory,
  getPortfolioSummary,
  replacePortfolioAllocationTargets,
} from "../api/portfolio";
import { useLanguage } from "../telegram/i18n";
import { Dashboard } from "./Dashboard";

vi.mock("../api/portfolio", () => ({
  getPortfolioAllocation: vi.fn(),
  getPortfolioHistory: vi.fn(),
  getPortfolioSummary: vi.fn(),
  replacePortfolioAllocationTargets: vi.fn(),
}));
vi.mock("../api/groups", () => ({ getGroups: vi.fn() }));

const getGroupsMock = vi.mocked(getGroups);
const getPortfolioAllocationMock = vi.mocked(getPortfolioAllocation);
const getPortfolioHistoryMock = vi.mocked(getPortfolioHistory);
const getPortfolioSummaryMock = vi.mocked(getPortfolioSummary);
const replacePortfolioAllocationTargetsMock = vi.mocked(replacePortfolioAllocationTargets);

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
    getPortfolioAllocationMock.mockReset();
    getGroupsMock.mockReset();
    getPortfolioSummaryMock.mockReset();
    replacePortfolioAllocationTargetsMock.mockReset();
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

describe("dashboard history cleanup", () => {
  beforeEach(() => {
    localStorage.clear();
    useLanguage.setState({ language: "en" });
    getPortfolioHistoryMock.mockReset();
    getPortfolioAllocationMock.mockReset();
    getGroupsMock.mockReset();
    getPortfolioSummaryMock.mockReset();
    replacePortfolioAllocationTargetsMock.mockReset();
    getGroupsMock.mockResolvedValue([]);
    getPortfolioAllocationMock.mockResolvedValue({
      scope: { mode: "all" },
      wallets_count: 1,
      total_usd: "0",
      items: [],
      data_quality: { state: "empty", sources: [], assets_priced: 0, assets_total: 0 },
    });
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

    expect(await screen.findByText("No history", {}, { timeout: 3_000 })).toBeInTheDocument();
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

  it("applies a wallet-group scope to Allocation", async () => {
    getGroupsMock.mockResolvedValue([
      { id: 7, name: "Treasury", sort_order: 0, created_at: "2026-07-30T00:00:00Z" },
    ]);
    getPortfolioAllocationMock
      .mockResolvedValueOnce({
        scope: { mode: "all" },
        wallets_count: 1,
        total_usd: "125.50",
        items: [{ asset_key: "native:base:ETH", symbol: "ETH", usd_value: "125.50", share_pct: 100 }],
        data_quality: { state: "complete", sources: ["coingecko"], assets_priced: 1, assets_total: 1 },
      })
      .mockResolvedValueOnce({
        scope: { mode: "selection", group_ids: [7], include_ungrouped: false },
        wallets_count: 1,
        total_usd: "125.50",
        items: [{ asset_key: "native:base:ETH", symbol: "ETH", usd_value: "125.50", share_pct: 100 }],
        data_quality: { state: "complete", sources: ["coingecko"], assets_priced: 1, assets_total: 1 },
      });
    getPortfolioHistoryMock.mockResolvedValue({ days: 32, points: [] });

    renderDashboard("/", "/", "/wallets");
    fireEvent.click(await screen.findByRole("button", { name: /All wallets/ }));
    fireEvent.click(await screen.findByText("Treasury"));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(getPortfolioAllocationMock).toHaveBeenLastCalledWith({
      mode: "selection",
      group_ids: [7],
      include_ungrouped: false,
    }));
    expect(await screen.findByText("ETH")).toBeInTheDocument();
  });

  it("edits global targets and shows deterministic rebalancing hints", async () => {
    getPortfolioAllocationMock.mockResolvedValue({
      scope: { mode: "all" },
      wallets_count: 1,
      total_usd: "100",
      items: [
        { asset_key: "manual:BTC", symbol: "BTC", usd_value: "60", share_pct: 60 },
        { asset_key: "manual:ETH", symbol: "ETH", usd_value: "40", share_pct: 40 },
      ],
      available_assets: [
        { asset_key: "manual:BTC", symbol: "BTC", usd_value: "60", share_pct: 60 },
        { asset_key: "manual:ETH", symbol: "ETH", usd_value: "40", share_pct: 40 },
      ],
      targets: [
        { asset_key: "manual:BTC", symbol: "BTC", target_pct: "50.00" },
        { asset_key: "manual:ETH", symbol: "ETH", target_pct: "50.00" },
      ],
      rebalancing: {
        status: "ready",
        tolerance_pct: 1,
        items: [
          {
            asset_key: "manual:BTC",
            symbol: "BTC",
            current_usd: "60",
            current_pct: 60,
            target_pct: 50,
            deviation_pct: 10,
            suggested_usd: "-10",
            action: "reduce",
          },
          {
            asset_key: "manual:ETH",
            symbol: "ETH",
            current_usd: "40",
            current_pct: 40,
            target_pct: 50,
            deviation_pct: -10,
            suggested_usd: "10",
            action: "increase",
          },
        ],
      },
      data_quality: { state: "complete", sources: ["manual"], assets_priced: 2, assets_total: 2 },
    });
    getPortfolioHistoryMock.mockResolvedValue({ days: 32, points: [] });
    replacePortfolioAllocationTargetsMock.mockResolvedValue({ items: [] });

    renderDashboard("/", "/", "/wallets");

    expect(await screen.findByText("Target deviations")).toBeInTheDocument();
    expect(screen.getByText(/Reduce by/)).toHaveTextContent("$10.00");
    expect(screen.getByText(/never submits orders or transactions/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit targets" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Target for BTC" }), { target: { value: "55" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Target for ETH" }), { target: { value: "45" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(replacePortfolioAllocationTargetsMock).toHaveBeenCalledWith([
      { asset_key: "manual:BTC", symbol: "BTC", target_pct: "55" },
      { asset_key: "manual:ETH", symbol: "ETH", target_pct: "45" },
    ]));
  });
});
