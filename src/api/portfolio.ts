import { apiFetch } from "./client";
import type { PortfolioHistory, PortfolioSummary } from "./types";
export const getPortfolioSummary = () => apiFetch<PortfolioSummary>("/portfolio/summary");
export function getPortfolioHistory(params: { walletId?: number | null; days: number }) {
  const search = new URLSearchParams({ days: String(params.days) });
  if (params.walletId) search.set("wallet_id", String(params.walletId));
  return apiFetch<PortfolioHistory>(`/portfolio?${search.toString()}`);
}
