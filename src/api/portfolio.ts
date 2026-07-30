import { apiFetch } from "./client";
import type {
  PortfolioAllocation,
  PortfolioAllocationScope,
  PortfolioHistory,
  PortfolioSummary,
} from "./types";
export const getPortfolioSummary = () => apiFetch<PortfolioSummary>("/portfolio/summary");
export function getPortfolioAllocation(scope: PortfolioAllocationScope) {
  const search = new URLSearchParams({ mode: scope.mode });
  if (scope.mode === "selection") {
    for (const groupId of scope.group_ids) search.append("group_id", String(groupId));
    search.set("include_ungrouped", String(scope.include_ungrouped));
  }
  return apiFetch<PortfolioAllocation>(`/portfolio/allocation?${search.toString()}`);
}
export function getPortfolioHistory(params: { walletId?: number | null; days: number }) {
  const search = new URLSearchParams({ days: String(params.days) });
  if (params.walletId) search.set("wallet_id", String(params.walletId));
  return apiFetch<PortfolioHistory>(`/portfolio/history?${search.toString()}`);
}
