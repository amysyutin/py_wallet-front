import { AlertTriangle, ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useId, useState } from "react";
import type { PortfolioSummary } from "../api/types";

type Props = {
  change: PortfolioSummary["change_24h"];
  language?: "ru" | "en";
};

export function PortfolioDailyChange({ change, language = "ru" }: Props) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  if (!change) return null;

  const complete = change.status === "complete" && change.percent !== null;
  const isIncomplete = change.status === "incomplete";
  const direction = complete
    ? change.percent! > 0
      ? "positive"
      : change.percent! < 0
        ? "negative"
        : "neutral"
    : isIncomplete
      ? "warning"
      : "neutral";
  const Icon = complete
    ? direction === "positive"
      ? ArrowUpRight
      : direction === "negative"
        ? ArrowDownRight
        : Minus
    : isIncomplete
      ? AlertTriangle
      : Minus;
  const prefix = complete && change.percent! > 0 ? "+" : "";
  const value = complete ? `${prefix}${change.percent!.toFixed(2)}%` : "—";
  const label = complete
    ? language === "ru"
      ? `Изменение стоимости портфеля за 24 часа: ${value}`
      : `Portfolio value change over 24 hours: ${value}`
    : language === "ru"
      ? `Изменение стоимости за 24 часа недоступно: ${isIncomplete ? "данные неполные" : "недостаточно истории"}`
      : `24-hour value change unavailable: ${isIncomplete ? "data is incomplete" : "not enough history"}`;

  return (
    <>
      <button
        type="button"
        className={`portfolio-daily-change ${direction}`}
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        <Icon size={15} aria-hidden="true" />
        {value}
      </button>
      {open ? (
        <span id={tooltipId} role="tooltip" className="portfolio-daily-tooltip">
          <strong>{label}</strong>
          {complete && change.start_observed_to && change.end_observed_to ? (
            <span>
              {language === "ru" ? "Наблюдения: " : "Observed: "}
              {new Date(change.start_observed_to).toLocaleString(language === "ru" ? "ru-RU" : "en-US")}
              {" → "}
              {new Date(change.end_observed_to).toLocaleString(language === "ru" ? "ru-RU" : "en-US")}
            </span>
          ) : null}
          <small>{language === "ru" ? "Это изменение стоимости, не инвестиционный P&L." : "This is a value change, not investment P&L."}</small>
        </span>
      ) : null}
    </>
  );
}
