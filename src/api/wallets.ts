import { apiFetch } from "./client";
import type {
  ChainType,
  LivePortfolioSummary,
  ManualBalancesRead,
  WalletDetailSummary,
  WalletRead,
  WalletSnapshotRead,
  WalletSummaryRead,
  WalletType,
} from "./types";

export type WalletPayload = { label: string; wallet_type: WalletType; chain_type: ChainType | string; address?: string | null; group_id?: number | null; notes?: string };
export type WalletPatch = Partial<Pick<WalletRead, "label" | "group_id" | "is_active" | "notes" | "chain_type" | "address">>;
export type ManualBalancePayload = { balances: Array<{ symbol: string; chain?: string; amount: string; price_usd?: string | null }> };
export type WalletFilters = {
  activeOnly?: boolean;
  groupId?: number | null;
  walletType?: WalletType | "";
  chainType?: ChainType | string;
};

export function getWallets(filters: WalletFilters | boolean = {}) {
  const options = typeof filters === "boolean" ? { activeOnly: filters } : filters;
  const search = new URLSearchParams({ active_only: String(options.activeOnly ?? true) });
  if (options.groupId) search.set("group_id", String(options.groupId));
  if (options.walletType) search.set("wallet_type", options.walletType);
  if (options.chainType) search.set("chain_type", options.chainType);
  return apiFetch<WalletSummaryRead[]>(`/wallets?${search.toString()}`).then((wallets) =>
    wallets.map((wallet) => ({
      ...wallet,
      balances_count: wallet.balances_count ?? 0,
      top_assets: Array.isArray(wallet.top_assets) ? wallet.top_assets : [],
    })),
  );
}

export const getWallet = (id: number) => apiFetch<WalletRead>(`/wallets/${id}`);
export const getWalletSummary = (id: number) => apiFetch<WalletDetailSummary>(`/wallets/${id}/summary`);
export const getWalletSnapshots = (id: number, limit = 30) => apiFetch<WalletSnapshotRead[]>(`/wallets/${id}/snapshots?limit=${limit}`);
export const getWalletAssets = (id: number) => apiFetch<LivePortfolioSummary>(`/wallets/${id}/assets`);
export const createWallet = (payload: WalletPayload) => apiFetch<WalletRead>("/wallets", { method: "POST", body: JSON.stringify(payload) });
export const updateWallet = (id: number, payload: WalletPatch) => apiFetch<WalletRead>(`/wallets/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const archiveWallet = (id: number) => apiFetch<WalletRead>(`/wallets/${id}`, { method: "DELETE" });
export const getManualBalances = (id: number) => apiFetch<ManualBalancesRead>(`/wallets/${id}/balances`);
export const saveManualBalances = (id: number, payload: ManualBalancePayload) => apiFetch<ManualBalancesRead>(`/wallets/${id}/balances`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteManualBalance = (walletId: number, assetId: number) => apiFetch<void>(`/wallets/${walletId}/balances/${assetId}`, { method: "DELETE" });
