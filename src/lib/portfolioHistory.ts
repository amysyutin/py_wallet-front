import type { PortfolioHistory } from "../api/types";
import { toNumber } from "./format";

export type PortfolioChartPoint = ReturnType<typeof buildPortfolioChartData>[number];

export type DailyHistoryPoint = {
  day: string;
  label: string;
  fullLabel: string;
  total: number | null;
  onchain: number | null;
  cex: number | null;
  manual: number | null;
  previousTotal: number | null;
  delta: number | null;
  hasSnapshot: boolean;
};

export function buildPortfolioChartData(
  points: PortfolioHistory["points"],
  locale = "ru-RU",
) {
  const byTimestamp = new Map<
    string,
    { total: number; onchain: number; cex: number | null; manual: number }
  >();

  for (const point of points) {
    const timestamp = new Date(point.snapshot_at).toISOString();
    const current = byTimestamp.get(timestamp) ?? {
      total: 0,
      onchain: 0,
      cex: null,
      manual: 0,
    };
    const cex =
      point.sources.cex_usd === null
        ? current.cex
        : (current.cex ?? 0) + toNumber(point.sources.cex_usd);
    byTimestamp.set(timestamp, {
      total: current.total + toNumber(point.total_usd),
      onchain: current.onchain + toNumber(point.sources.onchain_usd),
      cex,
      manual: current.manual + toNumber(point.sources.manual_usd),
    });
  }

  return Array.from(byTimestamp.entries())
    .sort(([left], [right]) => new Date(left).getTime() - new Date(right).getTime())
    .map(([timestamp, sources]) => {
      const date = new Date(timestamp);
      return {
        timestamp,
        label: date.toLocaleDateString(locale, { day: "2-digit", month: "short" }),
        tooltipLabel: date.toLocaleString(locale, {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        ...sources,
      };
    });
}

function localDayKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function buildDailyHistoryData(
  points: PortfolioChartPoint[],
  days: number,
  locale = "ru-RU",
): DailyHistoryPoint[] {
  const byDay = new Map<string, PortfolioChartPoint[]>();

  for (const point of points) {
    const date = new Date(point.timestamp);
    const day = localDayKey(date);
    const bucket = byDay.get(day) ?? [];
    bucket.push(point);
    byDay.set(day, bucket);
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    return date;
  });
  const firstDay = localDayKey(dates[0]);
  const earlierDay = Array.from(byDay.keys())
    .filter((day) => day < firstDay)
    .sort()
    .at(-1);
  let previousPoint = earlierDay ? (byDay.get(earlierDay)?.at(-1) ?? null) : null;
  let previousTotal = previousPoint?.total ?? null;

  return dates.map((date) => {
    const day = localDayKey(date);
    const bucket = byDay.get(day);
    const hasSnapshot = Boolean(bucket?.length);
    const observedPoint = bucket?.at(-1) ?? null;
    const currentPoint = observedPoint ?? previousPoint;
    const total = currentPoint?.total ?? null;
    const delta = total === null || previousTotal === null ? null : total - previousTotal;
    const point = {
      day,
      label: date
        .toLocaleDateString(locale, { day: "numeric", month: "short" })
        .replace(".", ""),
      fullLabel: date.toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      total,
      onchain: currentPoint?.onchain ?? null,
      cex: currentPoint?.cex ?? null,
      manual: currentPoint?.manual ?? null,
      previousTotal,
      delta,
      hasSnapshot,
    };
    previousPoint = currentPoint;
    previousTotal = total;
    return point;
  });
}
