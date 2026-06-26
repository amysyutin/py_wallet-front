import { apiFetch } from "./client";
import type { BinanceBalance, LivePortfolioSummary } from "./types";
export const getLiveAssets = (address: string) => apiFetch<LivePortfolioSummary>(`/assets?address=${encodeURIComponent(address)}`, { auth: false });
export const getDemoBinanceBalance = () => apiFetch<BinanceBalance>("/demo/binance/balance", { auth: false });
export const getAdminBinanceBalance = () => apiFetch<BinanceBalance>("/binance/balance");
