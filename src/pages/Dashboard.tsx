
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock3,
  Layers3,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Area,
  AreaChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
  total: number;
  previousTotal: number | null;
  delta: number | null;
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

function buildDailyHistoryData(points: PortfolioChartPoint[]): DailyHistoryPoint[] {
  const byDay = new Map<string, PortfolioChartPoint[]>();

  for (const point of points) {
    const date = new Date(point.timestamp);
    const day = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    const bucket = byDay.get(day) ?? [];
    bucket.push(point);
    byDay.set(day, bucket);
  }

  const dailyPoints = Array.from(byDay.entries()).map(([day, bucket]) => {
    const date = new Date(bucket[0].timestamp);
    const total = bucket.at(-1)?.total ?? 0;

    return {
      day,
      label: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", ""),
      fullLabel: date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
      total,
      previousTotal: null,
      delta: null,
    };
  });

  return dailyPoints.map((point, index) => {
    const previousTotal = dailyPoints[index - 1]?.total ?? null;
    return {
      ...point,
      previousTotal,
      delta: previousTotal === null ? null : point.total - previousTotal,
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
      <p>Портфель: {formatUsd(point.total)}</p>
      {point.previousTotal !== null ? <p>День до этого: {formatUsd(point.previousTotal)}</p> : null}
    </div>
  );
}

export function Dashboard() {
  const copy = usePageCopy();
  const [historyDays, setHistoryDays] = useState<(typeof historyPeriods)[number]>(30);
  const summaryQuery = useQuery({ queryKey: ["portfolio", "summary"], queryFn: getPortfolioSummary });
  const historyQuery = useQuery({
    queryKey: ["portfolio", "history", historyDays],
    queryFn: () => getPortfolioHistory({ days: historyDays + 1 }),
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
  const chartData = buildPortfolioChartData(history);
  const dailyHistoryData = buildDailyHistoryData(chartData).slice(-historyDays);
  const movementData = chartData.map((point, index) => {
    const previous = chartData[index - 1]?.total ?? point.total;
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
      <section className="hero-card">
        <div className="date-orb">
          <strong>{new Date().getDate()}</strong>
          <span>{new Date().toLocaleDateString("ru-RU", { month: "short" })}</span>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">Portfolio value</p>
          <h2>{formatUsd(summary.total_usd)}</h2>
          <span>Based on the latest EVM wallet snapshots</span>
        </div>
      </section>

      <section className="snapshot-card">
        <div className="snapshot-card-header">
          <div>
            <p className="eyebrow">Snapshots</p>
            <h2>{historyDays}-day value</h2>
          </div>
          <strong>{chartData.length > 0 ? formatUsd(chartData.at(-1)?.total) : formatUsd(0)}</strong>
        </div>
        {chartData.length === 0 ? (
          <div className="compact-empty">
            <span>{copy.noSnapshots}</span>
            <p>Создайте первый snapshot, чтобы увидеть график портфеля.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={118}>
            <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="snapshotFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec6046" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#ec6046" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Tooltip formatter={(value) => formatUsd(Number(value))} labelFormatter={(_, payload) => `Дата: ${payload?.[0]?.payload?.tooltipLabel ?? ""}`} />
              <Area type="linear" dataKey="total" stroke="#ec6046" strokeWidth={4} fill="url(#snapshotFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>

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
          title="Изменение по дням"
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
              <ComposedChart data={dailyHistoryData} margin={{ left: 0, right: 8, top: 28, bottom: 4 }} barCategoryGap="24%">
                <CartesianGrid vertical={false} stroke="#eee9e5" strokeDasharray="4 6" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis axisLine={false} tickLine={false} width={76} tickFormatter={(value) => formatSignedUsd(Number(value))} />
                <ReferenceLine y={0} stroke="#aaa29d" strokeWidth={1.5} />
                <Tooltip
                  cursor={{ fill: "rgba(236, 96, 70, 0.06)" }}
                  content={<HistoryTooltip />}
                />
                <Bar dataKey="delta" name="Изменение за день" radius={[6, 6, 3, 3]} maxBarSize={42}>
                  {dailyHistoryData.map((point) => (
                    <Cell key={point.day} fill={point.delta !== null && point.delta < 0 ? "#ec6046" : "#2bbf6a"} />
                  ))}
                </Bar>
                <Line type="linear" dataKey="delta" name="Динамика" stroke="#181716" strokeWidth={2.5} connectNulls={false} dot={{ r: 4, fill: "#ffffff", stroke: "#181716", strokeWidth: 2 }} activeDot={{ r: 6 }}>
                  {dailyHistoryData.length <= 14 ? (
                    <LabelList dataKey="delta" position="top" formatter={(value: unknown) => formatSignedUsd(Number(value))} className="history-value-label" />
                  ) : null}
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
            <div className="history-legend" aria-hidden="true">
              <span><i className="up" />Плюс за день</span>
              <span><i className="down" />Снижение</span>
              <span><i className="trend" />Линия изменений</span>
            </div>
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
