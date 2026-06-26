import { apiFetch } from "./client";
import type { SnapshotRead } from "./types";
export const createSnapshot = (walletId?: number | null) => apiFetch<SnapshotRead[]>("/snapshot", { method: "POST", body: JSON.stringify(walletId ? { wallet_id: walletId } : {}) });
