
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Gauge,
  Layers3,
  ShieldCheck,
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

const colors = ["#ec6046", "#f2a35e", "#161616", "#d9cfc8", "#8f9b92"];

export function Dashboard() {
  const summaryQuery = useQuery({ queryKey: ["portfolio", "summary"], queryFn: getPortfolioSummary });
  const historyQuery = useQuery({
    queryKey: ["portfolio", "history", 30],
    queryFn: () => getPortfolioHistory({ days: 30 }),
  });

  if (summaryQuery.isLoading) {
    return <PageState title="Загружаем портфель" message="Получаем summary и последние снапшоты." />;
  }

  if (summaryQuery.isError) {
    return <PageState title="Не удалось загрузить dashboard" message="Проверьте backend и авторизацию." />;
  }

  const summary = summaryQuery.data;

  if (!summary) {
    return <PageState title="Нет данных portfolio summary" />;
  }

  const topAssets = summary.top_assets ?? [];
  const history = historyQuery.data?.points ?? [];
  const chartData = history.map((point) => ({
    date: new Date(point.snapshot_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }),
    total: toNumber(point.total_usd),
  }));
  const topShare = topAssets[0]?.share_pct ?? "0";

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
        <button className="accent-button" type="button">
          Create snapshot
        </button>
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
            <span>Снапшотов пока нет</span>
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
              <Tooltip formatter={(value) => formatUsd(Number(value))} labelFormatter={(label) => `Дата: ${label}`} />
              <Area type="monotone" dataKey="total" stroke="#ec6046" strokeWidth={4} fill="url(#snapshotFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="metrics-grid soft-row">
        <Metric label="Total USD" value={formatUsd(summary.total_usd)} helper="latest snapshots" icon={<CircleDollarSign size={20} />} />
        <Metric label="Wallets" value={String(summary.wallets_count)} helper="included in summary" icon={<WalletCards size={20} />} />
        <Metric label="Top assets" value={String(topAssets.length)} helper="portfolio share" icon={<Layers3 size={20} />} />
      </section>

      <article className="content-band allocation-card">
        <SectionHeader eyebrow="Assets" title="Allocation" />
        {topAssets.length === 0 ? (
          <PageState title="Нет активов" message="Сделайте первый снапшот EVM-кошельков." />
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
          <PageState title="Нет истории" message="Сделайте первый снапшот." />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ left: -18, right: 12, top: 18, bottom: 4 }}>
              <XAxis dataKey="date" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => formatUsd(Number(value))} />
              <Line type="monotone" dataKey="total" stroke="#ec6046" strokeWidth={4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </article>

      <article className="mini-card lock-card">
        <ShieldCheck size={23} />
        <strong>System Lock</strong>
        <span>JWT protected routes</span>
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

      <article className="mini-card growth-card">
        <Gauge size={22} />
        <strong>{topShare}%</strong>
        <span>top asset share</span>
        <div className="gauge-ring" />
      </article>

      <article className="content-band review-card">
        <SectionHeader eyebrow="Portfolio health" title="How is your wallet structure going?" />
        <p className="muted">Manual balances are tracked separately from EVM summary until backend aggregation combines them.</p>
        <div className="rating-row" aria-hidden="true">
          <span />
          <span />
          <span className="neutral" />
          <span className="happy" />
          <span className="happy" />
        </div>
      </article>

      <article className="content-band calendar-card">
        <SectionHeader eyebrow="Snapshots" title="Latest activity" actions={<CalendarDays size={20} />} />
        <div className="timeline-bars" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <p className="muted">Snapshot history powers charts and top asset analytics.</p>
      </article>

      <article className="content-band stocks-card">
        <BarChart3 size={24} />
        <div>
          <strong>{formatUsd(summary.total_usd)}</strong>
          <span>Main portfolio</span>
        </div>
        <b>+ {topShare}%</b>
      </article>
    </div>
  );
}
