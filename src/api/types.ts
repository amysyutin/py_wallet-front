export type UserRole = "user" | "admin";

export type UserRead = {
  id: number;
  email: string | null;
  role: UserRole;
  created_at: string;
};

export type Token = {
  access_token: string;
  token_type: string;
};

export type WalletType = "evm" | "manual";
export type ChainType = "all" | "mainnet" | "base" | "bnb" | "arbitrum" | "linea" | "binance" | "manual";

export type WalletGroupRead = {
  id: number;
  name: string;
  description?: string | null;
  sort_order: number;
  wallets_count?: number;
  created_at: string;
  updated_at?: string;
};

export type WalletTopAsset = {
  symbol: string;
  amount: string;
  usd_value: string;
};

export type WalletRead = {
  id: number;
  label: string;
  wallet_type: WalletType;
  chain_type: ChainType | string;
  address?: string | null;
  group_id?: number | null;
  group?: WalletGroupRead | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
};

export type WalletSummaryRead = WalletRead & {
  group_name?: string | null;
  balance_usd: string;
  balance_source: "latest_snapshot" | "manual" | "none";
  last_snapshot_at: string | null;
  balances_count: number;
  top_assets: WalletTopAsset[];
};

export type WalletAssetDetail = {
  symbol: string;
  chain: string;
  amount: string;
  usd_value: string;
  price_usd?: string | null;
};

export type WalletDetailSummary = {
  wallet: WalletRead;
  balance_usd: string;
  last_snapshot_at: string | null;
  assets: WalletAssetDetail[];
};

export type ManualBalance = {
  asset_id: number;
  symbol: string;
  chain: string;
  amount: string;
  price_usd?: string | null;
  value_usd: string;
};

export type ManualBalancesRead = {
  wallet_id: number;
  wallet_label: string;
  wallet_type: WalletType;
  balances: ManualBalance[];
  total_usd: string;
};

export type WalletSnapshotRead = {
  id: number;
  snapshot_run_id: number;
  status: string;
  total_usd: string;
  snapshot_at: string;
};

export type SnapshotJobRead = {
  job_id: number;
  status: string;
};

export type SnapshotJobDetail = SnapshotJobRead & {
  scope_type: "all" | "group" | "wallet" | string;
  wallet_id: number | null;
  group_id?: number | null;
  trigger_type: string;
  created_at: string;
  finished_at: string | null;
  error_message: string | null;
};

export type PortfolioSummary = {
  total_usd: string;
  wallets_count: number;
  active_wallets_count: number;
  last_snapshot_at?: string | null;
  top_assets: Array<{ symbol: string; usd_value: string; share_pct: number }>;
  data_health?: {
    state: "fresh" | "updating" | "partial" | "stale";
    freshness: "fresh" | "aging" | "stale" | "unknown";
    as_of: string | null;
    wallets_covered: number;
    wallets_total: number;
    snapshot_wallets: number;
    manual_wallets: number;
    missing_wallets: number;
    refresh_in_progress: boolean;
    chain_issues: Array<{
      chain: string;
      status: string;
      error_type: string | null;
      wallets_count: number;
    }>;
    price_quality?: {
      state: "complete" | "estimated" | "incomplete" | "unknown";
      sources: Array<"coingecko" | "manual" | "static_dev" | "unknown">;
      assets_priced: number;
      assets_total: number;
    };
  };
  change_24h?: {
    status: "complete" | "incomplete" | "unavailable";
    kind: "value_change";
    start_usd: string | null;
    end_usd: string | null;
    absolute_usd: string | null;
    percent: number | null;
    reference_at: string;
    cutoff_at: string;
    start_observed_from: string | null;
    start_observed_to: string | null;
    end_observed_from: string | null;
    end_observed_to: string | null;
    reason_codes: string[];
  };
};

export type PortfolioAllocationScope =
  | { mode: "all" }
  | { mode: "selection"; group_ids: number[]; include_ungrouped: boolean };

export type PortfolioAllocation = {
  scope: PortfolioAllocationScope;
  wallets_count: number;
  total_usd: string;
  items: Array<{
    asset_key: string;
    symbol: string;
    usd_value: string;
    share_pct: number;
  }>;
  data_quality: {
    state: "complete" | "estimated" | "incomplete" | "unknown" | "empty";
    sources: Array<"coingecko" | "manual" | "static_dev" | "unknown">;
    assets_priced: number;
    assets_total: number;
  };
};

export type PortfolioHistory = {
  wallet_id?: number | null;
  group_id?: number | null;
  days: number;
  points: Array<{ snapshot_at: string; total_usd: string }>;
};

export type LivePortfolioSummary = {
  address: string;
  total_usd: string | number;
  chains: Array<{
    chain: string;
    native_symbol: string;
    native_amount: string | number;
    usdt_amount: string | number;
    usdc_amount: string | number;
    tokens: Array<{ symbol: string; amount: string | number; usd: string | number }>;
    status?: string;
    error_type?: string | null;
    error_message?: string | null;
  }>;
};

export type BinanceBalance = {
  assets: Array<{ asset: string; amount: string; usd?: string; source?: string }>;
  total_usdt: string;
  source?: string;
  error?: string | null;
};
