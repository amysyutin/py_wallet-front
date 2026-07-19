import { useQuery } from "@tanstack/react-query";
import { ExternalLink, RefreshCw, WalletCards } from "lucide-react";
import type { ReactNode } from "react";
import { getErrorMessage } from "../api/client";
import { loginWithTelegram } from "../api/telegram";
import { useAuthStore } from "../store/auth";
import { getTelegramInitData } from "./runtime";
import { telegramCopy, useLanguage } from "./i18n";

export function TelegramAuth({ children }: { children: ReactNode }) {
  const language = useLanguage((state) => state.language);
  const copy = telegramCopy[language];
  const setToken = useAuthStore((state) => state.setToken);
  const initData = getTelegramInitData();
  const authQuery = useQuery({
    queryKey: ["auth", "telegram", initData],
    queryFn: async () => {
      const token = await loginWithTelegram(initData);
      setToken(token.access_token);
      return token;
    },
    enabled: Boolean(initData),
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });

  if (!initData) {
    return (
      <main className="telegram-gate">
        <section className="telegram-gate-card">
          <span className="telegram-wallet-logo"><WalletCards size={36} /></span>
          <h1>{copy.unavailable}</h1>
          <p>{copy.unavailableHint}</p>
          <a className="primary-button" href="/">
            {copy.openWebsite}<ExternalLink size={18} />
          </a>
        </section>
      </main>
    );
  }

  if (authQuery.isPending) {
    return (
      <main className="telegram-gate">
        <section className="telegram-gate-card">
          <span className="telegram-wallet-logo pulse"><WalletCards size={36} /></span>
          <h1>{copy.loading}</h1>
          <p>{copy.loadingHint}</p>
        </section>
      </main>
    );
  }

  if (authQuery.isError) {
    return (
      <main className="telegram-gate">
        <section className="telegram-gate-card">
          <span className="telegram-wallet-logo"><WalletCards size={36} /></span>
          <h1>{copy.unavailable}</h1>
          <p className="form-error">{getErrorMessage(authQuery.error)}</p>
          <button className="primary-button" type="button" onClick={() => authQuery.refetch()}>
            <RefreshCw size={18} /> Retry
          </button>
        </section>
      </main>
    );
  }

  return children;
}
