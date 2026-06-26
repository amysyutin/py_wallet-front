import { apiFetch } from "./client";
import type { WalletGroupRead } from "./types";
export type GroupPayload = { name: string; description?: string; sort_order?: number };
export const getGroups = () => apiFetch<WalletGroupRead[]>("/wallet-groups");
export const createGroup = (payload: GroupPayload) => apiFetch<WalletGroupRead>("/wallet-groups", { method: "POST", body: JSON.stringify(payload) });
export const updateGroup = (id: number, payload: Partial<GroupPayload>) => apiFetch<WalletGroupRead>(`/wallet-groups/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteGroup = (id: number) => apiFetch<void>(`/wallet-groups/${id}`, { method: "DELETE" });
