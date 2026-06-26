export type UserRole = "user" | "admin";

export type UserRead = {
  id: number;
  email: string;
  role: UserRole;
  created_at: string;
};

export type Token = {
  access_token: string;
  token_type: string;
};

export type WalletType = "evm" | "manual";
export type ChainType = "mainnet" | "base" | "bnb" | "arbitrum" | "linea" | "binance" | "manual";

export type WalletGroupRead = {
  id: number;
  name: string;
  description?: string | null;
  sort_order: number;
  wallets_count?: number;
  created_at: string;
  updated_at?: string;
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

export type SnapshotRead = {
  id: number;
  wallet_id: number;
  snapshot_at: string;
  total_usd: string;
  balances: Array<{ symbol: string; amount: string; usd_value: string }>;
};

export type PortfolioSummary = {
  total_usd: string;
  wallets_count: number;
  top_assets: Array<{ symbol: string; usd_value: string; share_pct: string }>;
};

export type PortfolioHistory = {
  wallet_id?: number | null;
  days: number;
  points: Array<{ snapshot_at: string; total_usd: string }>;
};

export type LivePortfolioSummary = {
  address: string;
  total_usd: string;
  chains: Array<{
    chain: string;
    native_symbol: string;
    native_amount: string;
    usdt_amount: string;
    usdc_amount: string;
    tokens: Array<{ symbol: string; amount: string; usd: string }>;
  }>;
};

export type BinanceBalance = {
  assets: Array<{ asset: string; amount: string; usd?: string; source?: string }>;
  total_usdt: string;
  source?: string;
  error?: string | null;
};
