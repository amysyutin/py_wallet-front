import { AlertTriangle, CheckCircle2, Clock3, Database, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PortfolioSummary } from "../api/types";

type Props = {
  summary?: PortfolioSummary;
  isLoading?: boolean;
  isError?: boolean;
  language?: "ru" | "en";
};

const copy = {
  ru: {
    title: "Состояние данных",
    close: "Закрыть состояние данных",
    loading: "Проверяем данные…",
    error: "Не удалось проверить данные",
    noWallets: "Добавьте кошелёк, чтобы начать сбор данных.",
    coverage: "кошельков учтено",
    asOf: "Автоматические данные на",
    noTime: "Время автоматических данных пока неизвестно",
    sources: "Источники",
    snapshot: "snapshot",
    manual: "вручную",
    missing: "без данных",
    issues: "Проблемные сети",
    refreshing: "Сейчас выполняется обновление.",
    price: "Качество цен",
    states: { fresh: "Свежие", updating: "Обновляются", partial: "Частичные", stale: "Устарели" },
    prices: {
      complete: "Все ненулевые позиции оценены",
      estimated: "Есть тестовые оценочные цены",
      incomplete: "Не для всех активов найдена цена",
      unknown: "Источник цен пока неизвестен",
    },
  },
  en: {
    title: "Data health",
    close: "Close data health",
    loading: "Checking data…",
    error: "Could not check data",
    noWallets: "Add a wallet to start collecting data.",
    coverage: "wallets covered",
    asOf: "Automated data as of",
    noTime: "Automated data time is not available yet",
    sources: "Sources",
    snapshot: "snapshot",
    manual: "manual",
    missing: "missing",
    issues: "Affected networks",
    refreshing: "A refresh is currently running.",
    price: "Price quality",
    states: { fresh: "Fresh", updating: "Updating", partial: "Partial", stale: "Stale" },
    prices: {
      complete: "All non-zero positions are priced",
      estimated: "Test-only estimated prices are present",
      incomplete: "Some assets do not have a price",
      unknown: "Price source is not known yet",
    },
  },
} as const;

function StateIcon({ state }: { state: "fresh" | "updating" | "partial" | "stale" }) {
  if (state === "fresh") return <CheckCircle2 size={17} aria-hidden="true" />;
  if (state === "updating") return <LoaderCircle className="spin" size={17} aria-hidden="true" />;
  if (state === "stale") return <Clock3 size={17} aria-hidden="true" />;
  return <AlertTriangle size={17} aria-hidden="true" />;
}

export function PortfolioHealthDrawer({
  summary,
  isLoading = false,
  isError = false,
  language = "ru",
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const text = copy[language];
  const health = summary?.data_health;
  const state = health?.state ?? "partial";
  const isNeutral = isLoading || isError || !summary || summary.active_wallets_count === 0;
  const triggerLabel = isLoading
    ? text.loading
    : isError
      ? text.error
      : summary?.active_wallets_count === 0
        ? text.noWallets
        : health
          ? text.states[state]
          : text.title;

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    const background = Array.from(document.body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && !element.classList.contains("data-health-overlay"))
      .map((element) => ({ element, inert: element.inert }));
    for (const item of background) item.element.inert = true;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      for (const item of background) item.element.inert = item.inert;
      trigger?.focus();
    };
  }, [open]);

  const uniqueIssues = health
    ? Array.from(new Map(health.chain_issues.map((issue) => [issue.chain, issue])).values())
    : [];

  return (
    <>
      <button
        ref={triggerRef}
        className={`data-health-trigger data-health-${isNeutral ? "neutral" : state}`}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="portfolio-data-health-drawer"
        aria-label={`${text.title}: ${triggerLabel}`}
        onClick={() => setOpen(true)}
      >
        {isLoading ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : isNeutral ? <Database size={17} aria-hidden="true" /> : <StateIcon state={state} />}
        <span>{triggerLabel}</span>
      </button>
      {open
        ? createPortal(
            <div className="data-health-overlay" role="presentation" onMouseDown={() => setOpen(false)}>
              <aside
                ref={drawerRef}
                id="portfolio-data-health-drawer"
                className={`data-health-drawer data-health-${state}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="data-health-title"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <header>
                  <div>
                    <span className="eyebrow">{text.title}</span>
                    <h2 id="data-health-title">{health ? text.states[state] : text.title}</h2>
                  </div>
                  <button ref={closeRef} className="round-button" type="button" aria-label={text.close} onClick={() => setOpen(false)}>
                    <X size={19} />
                  </button>
                </header>
                {isLoading ? (
                  <p className="drawer-state"><LoaderCircle className="spin" size={20} />{text.loading}</p>
                ) : isError ? (
                  <p className="drawer-state"><AlertTriangle size={20} />{text.error}</p>
                ) : !summary || summary.active_wallets_count === 0 ? (
                  <p className="drawer-state"><Database size={20} />{text.noWallets}</p>
                ) : health ? (
                  <div className="data-health-details">
                    <div className="data-health-coverage">
                      <strong>{health.wallets_covered}/{health.wallets_total}</strong>
                      <span>{text.coverage}</span>
                    </div>
                    <p>{health.as_of ? `${text.asOf} ${new Date(health.as_of).toLocaleString(language === "ru" ? "ru-RU" : "en-US")}` : text.noTime}</p>
                    <p>{text.sources}: {health.snapshot_wallets} {text.snapshot} · {health.manual_wallets} {text.manual} · {health.missing_wallets} {text.missing}</p>
                    {health.price_quality ? (
                      <section className={`drawer-quality price-quality-${health.price_quality.state}`}>
                        <strong>{text.price}</strong>
                        <span>{text.prices[health.price_quality.state]}</span>
                        {health.price_quality.assets_total > 0 ? <small>{health.price_quality.assets_priced}/{health.price_quality.assets_total}</small> : null}
                      </section>
                    ) : null}
                    {health.refresh_in_progress ? <em>{text.refreshing}</em> : null}
                    {uniqueIssues.length > 0 ? (
                      <section className="drawer-issues">
                        <strong>{text.issues}</strong>
                        <div>{uniqueIssues.map((issue) => <span key={issue.chain}>{issue.chain} ({issue.wallets_count})</span>)}</div>
                      </section>
                    ) : null}
                  </div>
                ) : (
                  <p className="drawer-state"><Database size={20} />{text.noTime}</p>
                )}
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
