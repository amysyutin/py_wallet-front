
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock3,
  Layers3,
  WalletCards,
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Area,
  AreaChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { getPortfolioHistory, getPortfolioSummary } from "../api/portfolio";
import { Metric } from "../components/Metric";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { formatUsd, toNumber } from "../lib/format";
import { usePageCopy } from "../telegram/i18n";

const colors = ["#ec6046", "#f2a35e", "#161616", "#d9cfc8", "#8f9b92"];
const historyPeriods = [7, 14, 30, 90] as const;

type PortfolioChartPoint = ReturnType<typeof buildPortfolioChartData>[number];

type DailyHistoryPoint = {
  day: string;
  label: string;
  fullLabel: string;
  total: number | null;
  previousTotal: number | null;
  delta: number | null;
  hasSnapshot: boolean;
};

function buildPortfolioChartData(points: Array<{ snapshot_at: string; total_usd: string }>) {
  const byTimestamp = new Map<string, number>();

  for (const point of points) {
    const timestamp = new Date(point.snapshot_at).toISOString();
    byTimestamp.set(timestamp, (byTimestamp.get(timestamp) ?? 0) + toNumber(point.total_usd));
  }

  return Array.from(byTimestamp.entries())
    .sort(([left], [right]) => new Date(left).getTime() - new Date(right).getTime())
    .map(([timestamp, total]) => {
      const date = new Date(timestamp);
      return {
        timestamp,
        label: date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }),
        tooltipLabel: date.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
        total,
      };
    });
}

function localDayKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function buildDailyHistoryData(points: PortfolioChartPoint[], days: number): DailyHistoryPoint[] {
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
  const earlierDay = Array.from(byDay.keys()).filter((day) => day < firstDay).sort().at(-1);
  let previousTotal = earlierDay ? byDay.get(earlierDay)?.at(-1)?.total ?? null : null;

  return dates.map((date) => {
    const day = localDayKey(date);
    const bucket = byDay.get(day);
    const hasSnapshot = Boolean(bucket?.length);
    const total = bucket?.at(-1)?.total ?? previousTotal;
    const delta = total === null || previousTotal === null ? null : total - previousTotal;
    const point = {
      day,
      label: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", ""),
      fullLabel: date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
      total,
      previousTotal,
      delta,
      hasSnapshot,
    };
    previousTotal = total;
    return {
      ...point,
    };
  });
}

function formatSignedUsd(value: number | null) {
  if (value === null) return "Нет предыдущей даты";
  return value > 0 ? `+${formatUsd(value)}` : formatUsd(value);
}

function HistoryTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload: DailyHistoryPoint }> }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="history-tooltip">
      <span>{point.fullLabel}</span>
      <strong className={point.delta !== null && point.delta < 0 ? "negative" : "positive"}>{formatSignedUsd(point.delta)}</strong>
      {point.total !== null ? <p>Портфель: {formatUsd(point.total)}</p> : null}
      {point.previousTotal !== null ? <p>День до этого: {formatUsd(point.previousTotal)}</p> : null}
      {!point.hasSnapshot ? <em>Нового snapshot не было</em> : null}
    </div>
  );
}

export function Dashboard() {
  const copy = usePageCopy();
  const [historyDays, setHistoryDays] = useState<(typeof historyPeriods)[number]>(30);
  const summaryQuery = useQuery({ queryKey: ["portfolio", "summary"], queryFn: getPortfolioSummary });
  const snapshotHistoryQuery = useQuery({
    queryKey: ["portfolio", "history", "snapshot-card", 30],
    queryFn: () => getPortfolioHistory({ days: 30 }),
  });
  const historyQuery = useQuery({
    queryKey: ["portfolio", "history", "daily", historyDays],
    queryFn: () => getPortfolioHistory({ days: historyDays + 2 }),
    placeholderData: (previousData) => previousData,
  });

  if (summaryQuery.isLoading) {
    return <PageState title={copy.loadingPortfolio} message="Portfolio summary & snapshots" />;
  }

  if (summaryQuery.isError) {
    return <PageState title={copy.portfolioFailed} message="Check backend and authentication." />;
  }

  const summary = summaryQuery.data;

  if (!summary) {
    return <PageState title="Нет данных portfolio summary" />;
  }

  const topAssets = summary.top_assets ?? [];
  const history = historyQuery.data?.points ?? [];
  const snapshotChartData = buildPortfolioChartData(snapshotHistoryQuery.data?.points ?? []);
  const historyChartData = buildPortfolioChartData(history);
  const dailyHistoryData = buildDailyHistoryData(historyChartData, historyDays);
  const movementData = snapshotChartData.map((point, index) => {
    const previous = snapshotChartData[index - 1]?.total ?? point.total;
    return {
      ...point,
      delta: point.total - previous,
    };
  });
  const recentMovements = movementData.slice(-10);
  const lastDelta = movementData.at(-1)?.delta ?? 0;
  const maxAbsDelta = Math.max(...recentMovements.map((point) => Math.abs(point.delta)), 1);

  return (
    <div className="dashboard-grid">
      <section className="metrics-grid soft-row">
        <Metric label="Wallets" value={String(summary.active_wallets_count ?? summary.wallets_count)} helper="active in summary" icon={<WalletCards size={20} />} />
        <Metric label="Top assets" value={String(topAssets.length)} helper="portfolio share" icon={<Layers3 size={20} />} />
      </section>

      <article className="content-band allocation-card">
        <SectionHeader eyebrow="Assets" title="Allocation" />
        {topAssets.length === 0 ? (
          <PageState title={copy.noAssets} message="Portfolio allocation will appear after wallet processing." />
        ) : (
          <div className="chart-grid">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={topAssets} dataKey={(item) => toNumber(item.share_pct)} nameKey="symbol" innerRadius={62} outerRadius={96} paddingAngle={3}>
                  {topAssets.map((asset, index) => (
                    <Cell key={asset.symbol} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="asset-list">
              {topAssets.map((asset, index) => (
                <div className="asset-row" key={asset.symbol}>
                  <i style={{ backgroundColor: colors[index % colors.length] }} />
                  <span>{asset.symbol}</span>
                  <b>{formatUsd(asset.usd_value)}</b>
                  <em>{asset.share_pct}%</em>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>

      <article className="content-band history-card">
        <SectionHeader
          eyebrow="History"
          title="Стоимость по дням"
          actions={
            <div className="history-periods" role="group" aria-label="Период истории портфеля">
              {historyPeriods.map((days) => (
                <button
                  key={days}
                  type="button"
                  className={historyDays === days ? "active" : ""}
                  aria-pressed={historyDays === days}
                  onClick={() => setHistoryDays(days)}
                >
                  {days}д
                </button>
              ))}
            </div>
          }
        />
        {historyQuery.isLoading ? (
          <PageState title="Загружаем историю" />
        ) : history.length === 0 ? (
          <PageState title={copy.noHistory} message="Create the first snapshot." />
        ) : (
          <div className="history-chart" role="img" aria-label={`График изменения портфеля по дням за ${historyDays} дней`} aria-busy={historyQuery.isFetching}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyHistoryData} margin={{ left: 0, right: 8, top: 18, bottom: 4 }}>
                <defs>
                  <linearGradient id="historyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec6046" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#ec6046" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#eee9e5" strokeDasharray="4 6" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <Tooltip
                  cursor={{ stroke: "#d9cfc8", strokeDasharray: "4 4" }}
                  content={<HistoryTooltip />}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Стоимость портфеля"
                  stroke="#ec6046"
                  strokeWidth={4}
                  fill="url(#historyFill)"
                  connectNulls={false}
                  dot={false}
                  activeDot={{ r: 6, fill: "#ec6046", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <p className="history-note">Наведите на линию или коснитесь графика, чтобы увидеть стоимость и изменение за день.</p>
          </div>
        )}
      </article>

      <article className="mini-card days-card">
        <Clock3 size={22} />
        <strong>30 Days</strong>
        <span>portfolio window</span>
        <div className="dot-matrix" aria-hidden="true">
          {Array.from({ length: 24 }, (_, index) => (
            <i key={index} className={index < 13 ? "active" : ""} />
          ))}
        </div>
      </article>

      <article className="mini-card portfolio-health-card">
        <div className="health-card-header">
          <span>Portfolio health</span>
          <strong className={lastDelta >= 0 ? "positive" : "negative"}>{lastDelta >= 0 ? "Up" : "Down"}</strong>
        </div>
        <div className="candles-row" aria-label="Свечи движения портфеля">
          {recentMovements.map((point, index) => (
            <i
              key={`${point.timestamp}-${index}`}
              className={point.delta >= 0 ? "green" : "red"}
              style={{ height: `${Math.max(22, (Math.abs(point.delta) / maxAbsDelta) * 76)}px` }}
              title={`${point.tooltipLabel}: ${formatUsd(point.delta)}`}
            />
          ))}
        </div>
        <em>{formatUsd(lastDelta)} за последнюю точку</em>
      </article>

      <article className="content-band balance-movement-card">
        <SectionHeader eyebrow="Balance movement" title="Движение баланса" />
        <div className="balance-histogram" aria-label="Гистограмма движения баланса кошелька">
          {recentMovements.map((point, index) => (
            <i key={`${point.timestamp}-bar-${index}`} className={point.delta >= 0 ? "green" : "red"}>
              <span style={{ height: `${Math.max(16, (Math.abs(point.delta) / maxAbsDelta) * 130)}px` }} />
            </i>
          ))}
        </div>
        <p className="muted">Красный показывает снижение между снапшотами, зеленый - рост.</p>
      </article>
    </div>
  );
}
