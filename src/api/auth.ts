import { apiFetch } from "./client";
import type { Token, UserRead } from "./types";

export type AuthPayload = { email: string; password: string };
export type ChangePasswordPayload = { current_password: string; new_password: string };

export const registerUser = (payload: AuthPayload) =>
  apiFetch<UserRead>("/auth/register", { method: "POST", auth: false, body: JSON.stringify(payload) });

export const loginUser = (payload: AuthPayload) =>
  apiFetch<Token>("/auth/login", { method: "POST", auth: false, body: JSON.stringify(payload) });

export const getMe = () => apiFetch<UserRead>("/auth/me");

export const changePassword = (payload: ChangePasswordPayload) =>
  apiFetch<void>("/auth/change-password", { method: "POST", body: JSON.stringify(payload) });
