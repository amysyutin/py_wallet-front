import { useQuery } from "@tanstack/react-query";
import { BarChart3, CircleDollarSign, WalletCards } from "lucide-react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getPortfolioHistory, getPortfolioSummary } from "../api/portfolio";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { formatUsd, toNumber } from "../lib/format";
import { Metric } from "../components/Metric";
const colors = ["#1d7354", "#d48b36", "#315f8f", "#8a5a44", "#6a7b3f"];
export function Dashboard() {
  const summaryQuery = useQuery({ queryKey: ["portfolio", "summary"], queryFn: getPortfolioSummary });
  const historyQuery = useQuery({ queryKey: ["portfolio", "history", 30], queryFn: () => getPortfolioHistory({ days: 30 }) });
  if (summaryQuery.isLoading) return <PageState title="Загружаем портфель" message="Получаем summary и последние снапшоты." />;
  if (summaryQuery.isError) return <PageState title="Не удалось загрузить dashboard" message="Проверьте backend и авторизацию." />;
  const summary = summaryQuery.data;
  if (!summary) return <PageState title="Нет данных portfolio summary" />;
  const topAssets = summary.top_assets ?? []; const history = historyQuery.data?.points ?? [];
  return <><section className="metrics-grid"><Metric label="Стоимость" value={formatUsd(summary.total_usd)} helper="по последним EVM-снапшотам" icon={<CircleDollarSign size={20} />} /><Metric label="Кошельки" value={String(summary.wallets_count)} helper="в summary" icon={<WalletCards size={20} />} /><Metric label="Top assets" value={String(topAssets.length)} helper="активы с долей" icon={<BarChart3 size={20} />} /></section><section className="two-column"><article className="content-band"><SectionHeader eyebrow="Активы" title="Top-5 по доле" />{topAssets.length === 0 ? <PageState title="Нет активов" message="Сделайте первый снапшот EVM-кошельков." /> : <div className="chart-grid"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={topAssets} dataKey={(item) => toNumber(item.share_pct)} nameKey="symbol" innerRadius={54} outerRadius={86}>{topAssets.map((asset, index) => <Cell key={asset.symbol} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="asset-list">{topAssets.map((asset) => <div className="asset-row" key={asset.symbol}><span>{asset.symbol}</span><b>{formatUsd(asset.usd_value)}</b><em>{asset.share_pct}%</em></div>)}</div></div>}<p className="muted">Ручные балансы пока не входят в /portfolio/summary.</p></article><article className="content-band"><SectionHeader eyebrow="История" title="30 дней" />{history.length === 0 ? <PageState title="Нет истории" message="Сделайте первый снапшот." /> : <ResponsiveContainer width="100%" height={260}><LineChart data={history.map((point) => ({ date: new Date(point.snapshot_at).toLocaleDateString("ru-RU"), total: toNumber(point.total_usd) }))}><XAxis dataKey="date" /><YAxis /><Tooltip formatter={(value) => formatUsd(Number(value))} /><Line type="monotone" dataKey="total" stroke="#1d7354" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer>}</article></section></>;
}
