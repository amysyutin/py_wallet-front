import { apiFetch } from "./client";
import type { SnapshotJobDetail, SnapshotJobRead } from "./types";

export type SnapshotScope = {
  scope_type?: "all" | "group" | "wallet";
  wallet_id?: number | null;
  group_id?: number | null;
};

export function createSnapshot(walletId?: number | null) {
  const payload: SnapshotScope = walletId ? { scope_type: "wallet", wallet_id: walletId } : { scope_type: "all" };
  return apiFetch<SnapshotJobRead>("/snapshots", { method: "POST", body: JSON.stringify(payload) });
}

export const getSnapshotJob = (jobId: number) => apiFetch<SnapshotJobDetail>(`/snapshot-jobs/${jobId}`);

export const retryFailedSnapshotJob = (jobId: number) => apiFetch<SnapshotJobRead>(
  `/snapshot-jobs/${jobId}/retry-failed`,
  { method: "POST" },
);

export function getSnapshotJobs(
  params: {
    limit?: number;
    status?: string | null;
    walletId?: number | null;
    triggerType?: string | null;
  } = {},
) {
  const search = new URLSearchParams({ limit: String(params.limit ?? 20) });
  if (params.status) search.set("status", params.status);
  if (params.walletId) search.set("wallet_id", String(params.walletId));
  if (params.triggerType) search.set("trigger_type", params.triggerType);
  return apiFetch<SnapshotJobDetail[]>(`/snapshot-jobs?${search.toString()}`);
}
