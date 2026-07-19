import { apiFetch } from "./client";
import type { Token } from "./types";
import type { AppLanguage } from "../telegram/i18n";

export type TelegramSettings = {
  enabled: boolean;
  language: AppLanguage;
  timezone: string;
  daily_at: string;
};

export const loginWithTelegram = (initData: string) =>
  apiFetch<Token>("/auth/telegram", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ init_data: initData }),
  });

export const linkTelegramEmail = (payload: { email: string; password: string }) =>
  apiFetch<Token | { linked: boolean }>("/auth/telegram/link-email", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getTelegramSettings = () => apiFetch<TelegramSettings>("/telegram/settings");

export const updateTelegramSettings = (settings: TelegramSettings) =>
  apiFetch<TelegramSettings>("/telegram/settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
