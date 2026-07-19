
import { useQuery } from "@tanstack/react-query";
import {
  Clock3,
  Layers3,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Area,
  AreaChart,
  Pie,
  PieChart,
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

type PortfolioChartPoint = ReturnType<typeof buildPortfolioChartData>[number];

type DailyHistoryPoint = {
  day: string;
  label: string;
  total: number;
  last: number;
  min: number;
  max: number;
  samples: number;
  delta: number;
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
    const totals = bucket.map((point) => point.total).sort((left, right) => left - right);
    const middle = Math.floor(totals.length / 2);
    const median = totals.length % 2 === 0 ? (totals[middle - 1] + totals[middle]) / 2 : totals[middle];
    const date = new Date(bucket[0].timestamp);

    return {
      day,
      label: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", ""),
      total: median,
      last: bucket.at(-1)?.total ?? median,
      min: totals[0],
      max: totals.at(-1) ?? median,
      samples: totals.length,
      delta: 0,
    };
  });

  return dailyPoints.map((point, index) => ({
    ...point,
    delta: index === 0 ? 0 : point.total - dailyPoints[index - 1].total,
  }));
}

function HistoryTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload: DailyHistoryPoint }> }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="history-tooltip">
      <span>{point.label} · {point.samples} замеров</span>
      <strong>{formatUsd(point.total)}</strong>
      <p>Последний: {formatUsd(point.last)}</p>
      <p>Диапазон: {formatUsd(point.min)}–{formatUsd(point.max)}</p>
    </div>
  );
}

export function Dashboard() {
  const copy = usePageCopy();
  const summaryQuery = useQuery({ queryKey: ["portfolio", "summary"], queryFn: getPortfolioSummary });
  const historyQuery = useQuery({
    queryKey: ["portfolio", "history", 30],
    queryFn: () => getPortfolioHistory({ days: 30 }),
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
  const dailyHistoryData = buildDailyHistoryData(chartData);
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
            <h2>30-day value</h2>
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
          title="Portfolio по дням"
          actions={dailyHistoryData.length > 0 ? <span className="history-sample-count">{chartData.length} замеров · {dailyHistoryData.length} дн.</span> : null}
        />
        {history.length === 0 ? (
          <PageState title={copy.noHistory} message="Create the first snapshot." />
        ) : (
          <div className="history-chart" role="img" aria-label="Гистограмма типичной стоимости портфеля по дням">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyHistoryData} margin={{ left: 0, right: 8, top: 18, bottom: 4 }} barCategoryGap="24%">
                <CartesianGrid vertical={false} stroke="#eee9e5" strokeDasharray="4 6" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis axisLine={false} tickLine={false} width={72} tickFormatter={(value) => formatUsd(Number(value))} />
                <Tooltip
                  cursor={{ fill: "rgba(236, 96, 70, 0.06)" }}
                  content={<HistoryTooltip />}
                />
                <Bar dataKey="total" name="Типичное значение" radius={[8, 8, 3, 3]} maxBarSize={54}>
                  {dailyHistoryData.map((point) => (
                    <Cell key={point.day} fill={point.delta < 0 ? "#ec6046" : "#2bbf6a"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="history-legend" aria-hidden="true">
              <span><i className="up" />Рост или без изменений</span>
              <span><i className="down" />Снижение</span>
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
