import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGroups } from "../api/groups";
import { getSnapshotJobs } from "../api/snapshots";
import { createWallet, getWalletAssets, getWallets } from "../api/wallets";
import { useLanguage } from "../telegram/i18n";
import { Wallets } from "./Wallets";

vi.mock("../api/groups", () => ({ getGroups: vi.fn() }));
vi.mock("../api/snapshots", () => ({ getSnapshotJobs: vi.fn() }));
vi.mock("../api/wallets", () => ({
  archiveWallet: vi.fn(),
  createWallet: vi.fn(),
  getWalletAssets: vi.fn(),
  getWallets: vi.fn(),
}));

const createWalletMock = vi.mocked(createWallet);
const getGroupsMock = vi.mocked(getGroups);
const getSnapshotJobsMock = vi.mocked(getSnapshotJobs);
const getWalletAssetsMock = vi.mocked(getWalletAssets);
const getWalletsMock = vi.mocked(getWallets);

function renderWallets() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Wallets />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("first wallet snapshot progress", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    useLanguage.setState({ language: "ru" });
    createWalletMock.mockReset();
    getGroupsMock.mockReset();
    getSnapshotJobsMock.mockReset();
    getWalletAssetsMock.mockReset();
    getWalletsMock.mockReset();
    getGroupsMock.mockResolvedValue([]);
    getWalletsMock.mockResolvedValue([]);
  });

  it("shows an immediate starting state and then the owner-scoped auto job", async () => {
    let resolveJobs: (
      jobs: Awaited<ReturnType<typeof getSnapshotJobs>>,
    ) => void = () => undefined;
    const jobsPromise = new Promise<Awaited<ReturnType<typeof getSnapshotJobs>>>((resolve) => {
      resolveJobs = resolve;
    });
    createWalletMock.mockResolvedValue({
      id: 37,
      label: "Primary",
      wallet_type: "evm",
      chain_type: "mainnet",
      address: "0x0000000000000000000000000000000000000037",
      group_id: null,
      notes: null,
      is_active: true,
      created_at: "2026-07-24T00:00:00Z",
      updated_at: "2026-07-24T00:00:00Z",
    });
    getSnapshotJobsMock.mockReturnValue(jobsPromise);
    renderWallets();

    fireEvent.change(await screen.findByPlaceholderText("Название"), {
      target: { value: "Primary" },
    });
    fireEvent.change(screen.getByPlaceholderText("0x..."), {
      target: { value: "0x0000000000000000000000000000000000000037" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Добавить" }));

    expect(await screen.findByText("Первый snapshot запускается")).toBeInTheDocument();
    await waitFor(() => {
      expect(getSnapshotJobsMock).toHaveBeenCalledWith({
        limit: 1,
        walletId: 37,
        triggerType: "auto",
      });
    });

    resolveJobs([
      {
        job_id: 412,
        status: "pending",
        scope_type: "wallet",
        wallet_id: 37,
        group_id: null,
        trigger_type: "auto",
        created_at: "2026-07-24T00:00:01Z",
        finished_at: null,
        error_message: null,
      },
    ]);

    expect(await screen.findByText("Snapshot в очереди")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("#412");
    expect(createWalletMock.mock.calls[0]?.[0]).toEqual({
      label: "Primary",
      wallet_type: "evm",
      chain_type: "all",
      address: "0x0000000000000000000000000000000000000037",
      group_id: null,
    });
    expect(screen.getByText("Адрес будет автоматически проверяться во всех доступных EVM-сетях.")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });
});
