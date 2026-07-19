
import { useQuery } from "@tanstack/react-query";
import {
  Clock3,
  Layers3,
  WalletCards,
} from "lucide-react";
import {
  Cell,
  Area,
  AreaChart,
  Line,
  LineChart,
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
        <SectionHeader eyebrow="History" title="Portfolio timeline" />
        {history.length === 0 ? (
          <PageState title={copy.noHistory} message="Create the first snapshot." />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ left: -18, right: 12, top: 18, bottom: 4 }}>
              <XAxis dataKey="label" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => formatUsd(Number(value))} labelFormatter={(_, payload) => payload?.[0]?.payload?.tooltipLabel ?? ""} />
              <Line type="linear" dataKey="total" stroke="#ec6046" strokeWidth={4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
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
