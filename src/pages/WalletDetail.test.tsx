import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getWallet,
  getWalletAssets,
  getWalletSnapshots,
  getWalletSummary,
} from "../api/wallets";
import { useLanguage } from "../telegram/i18n";
import { WalletDetail } from "./WalletDetail";

vi.mock("../api/wallets", () => ({
  deleteManualBalance: vi.fn(),
  getManualBalances: vi.fn(),
  getWallet: vi.fn(),
  getWalletAssets: vi.fn(),
  getWalletSnapshots: vi.fn(),
  getWalletSummary: vi.fn(),
  saveManualBalances: vi.fn(),
  updateWallet: vi.fn(),
}));

const getWalletMock = vi.mocked(getWallet);
const getWalletAssetsMock = vi.mocked(getWalletAssets);
const getWalletSnapshotsMock = vi.mocked(getWalletSnapshots);
const getWalletSummaryMock = vi.mocked(getWalletSummary);

function renderWalletDetail(path = "/wallets/41") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/wallets/:walletId" element={<WalletDetail />} />
          <Route path="/telegram/wallets/:walletId" element={<WalletDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("wallet detail data health", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    useLanguage.setState({ language: "ru" });
    getWalletMock.mockReset();
    getWalletAssetsMock.mockReset();
    getWalletSnapshotsMock.mockReset();
    getWalletSummaryMock.mockReset();
    const wallet = {
      id: 41,
      label: "Primary",
      wallet_type: "evm" as const,
      chain_type: "all",
      address: "0x0000000000000000000000000000000000000041",
      group_id: null,
      notes: null,
      is_active: true,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    };
    getWalletMock.mockResolvedValue(wallet);
    getWalletSnapshotsMock.mockResolvedValue([]);
    getWalletSummaryMock.mockResolvedValue({
      wallet,
      balance_usd: "150.00",
      last_snapshot_at: "2026-08-01T05:00:00Z",
      assets: [
        { symbol: "ETH", chain: "mainnet", amount: "1", usd_value: "150.00", price_usd: "150.00" },
      ],
      data_health: {
        state: "partial",
        freshness: "fresh",
        as_of: "2026-08-01T05:00:00Z",
        source: "latest_snapshot",
        refresh_in_progress: false,
        chain_issues: [{ chain: "arbitrum", status: "failed", error_type: "rpc_unavailable" }],
        price_quality: {
          state: "complete",
          sources: ["coingecko"],
          assets_priced: 1,
          assets_total: 1,
        },
      },
    });
    getWalletAssetsMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000041",
      total_usd: "151.00",
      chains: [],
    });
  });

  it("keeps the saved partial value primary and runs live lookup only on request", async () => {
    renderWalletDetail();

    expect(await screen.findByText("Сохранённая стоимость")).toBeInTheDocument();
    expect(screen.getByText("Частичные")).toBeInTheDocument();
    expect(screen.getByText("arbitrum")).toBeInTheDocument();
    expect(screen.getByText(/Основной итог из последнего сохранённого snapshot/)).toBeInTheDocument();
    expect(screen.getByText(/не заменяет сохранённую стоимость и историю/)).toBeInTheDocument();
    expect(getWalletAssetsMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Проверить live" }));

    await waitFor(() => expect(getWalletAssetsMock).toHaveBeenCalledWith(41));
    expect(await screen.findByText(/Live баланс:/)).toBeInTheDocument();
    expect(screen.getByText(/\$151\.00/)).toBeInTheDocument();
  });

  it("uses the same saved-versus-live hierarchy in English Telegram", async () => {
    window.history.replaceState({}, "", "/telegram/wallets/41");
    useLanguage.setState({ language: "en" });

    renderWalletDetail("/telegram/wallets/41");

    expect(await screen.findByText("Saved value")).toBeInTheDocument();
    expect(screen.getByText("Partial")).toBeInTheDocument();
    expect(screen.getByText("Diagnostic live check")).toBeInTheDocument();
    expect(screen.getByText(/does not replace the saved value or history/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check live" })).toBeInTheDocument();
    expect(getWalletAssetsMock).not.toHaveBeenCalled();
  });
});
