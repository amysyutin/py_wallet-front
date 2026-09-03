
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
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
import { getGroups } from "../api/groups";
import { getPortfolioAllocation, getPortfolioHistory, getPortfolioSummary } from "../api/portfolio";
import type { PortfolioAllocationScope } from "../api/types";
import { AllocationGroupFilter } from "../components/AllocationGroupFilter";
import { FirstWalletActivation } from "../components/FirstWalletActivation";
import { Metric } from "../components/Metric";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { formatUsd, toNumber } from "../lib/format";
import {
  buildDailyHistoryData,
  buildPortfolioChartData,
  type DailyHistoryPoint,
} from "../lib/portfolioHistory";
import { useLanguage, usePageCopy } from "../telegram/i18n";

const colors = ["#ec6046", "#f2a35e", "#161616", "#d9cfc8", "#8f9b92"];
const historyPeriods = [7, 14, 30, 90] as const;

function formatSignedUsd(value: number | null, noPreviousDate: string) {
  if (value === null) return noPreviousDate;
  return value > 0 ? `+${formatUsd(value)}` : formatUsd(value);
}

function allocationScopeKey(scope: PortfolioAllocationScope) {
  return scope.mode === "all"
    ? "all"
    : `selection:${[...scope.group_ids].sort((left, right) => left - right).join(",")}:${scope.include_ungrouped}`;
}

function HistoryTooltip({
  active,
  payload,
  copy,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: DailyHistoryPoint }>;
  copy: ReturnType<typeof usePageCopy>["dashboard"];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="history-tooltip">
      <span>{point.fullLabel}</span>
      <strong className={point.delta !== null && point.delta < 0 ? "negative" : "positive"}>{formatSignedUsd(point.delta, copy.noPreviousDate)}</strong>
      {point.total !== null ? <p>{copy.portfolio}: {formatUsd(point.total)}</p> : null}
      {point.onchain !== null ? <p>{copy.onchain}: {formatUsd(point.onchain)}</p> : null}
      {point.cex !== null ? <p>{copy.cex}: {formatUsd(point.cex)}</p> : null}
      {point.manual !== null ? <p>{copy.manual}: {formatUsd(point.manual)}</p> : null}
      {point.previousTotal !== null ? <p>{copy.previousDay}: {formatUsd(point.previousTotal)}</p> : null}
      {!point.hasSnapshot ? <em>{copy.noNewSnapshot}</em> : null}
    </div>
  );
}

export function Dashboard() {
  const copy = usePageCopy();
  const language = useLanguage((state) => state.language);
  const [historyDays, setHistoryDays] = useState<(typeof historyPeriods)[number]>(30);
  const [allocationScope, setAllocationScope] = useState<PortfolioAllocationScope>({ mode: "all" });
  const summaryQuery = useQuery({ queryKey: ["portfolio", "summary"], queryFn: getPortfolioSummary });
  const hasActiveWallets = (summaryQuery.data?.active_wallets_count ?? summaryQuery.data?.wallets_count ?? 0) > 0;
  const groupsQuery = useQuery({ queryKey: ["wallet-groups"], queryFn: getGroups, enabled: hasActiveWallets });
  const allocationQuery = useQuery({
    queryKey: ["portfolio", "allocation", allocationScope],
    queryFn: () => getPortfolioAllocation(allocationScope),
    placeholderData: (previousData) => previousData,
    enabled: hasActiveWallets,
  });
  const historyQuery = useQuery({
    queryKey: ["portfolio", "history", "daily", historyDays],
    queryFn: () => getPortfolioHistory({ days: historyDays + 2 }),
    placeholderData: (previousData) => previousData,
    enabled: hasActiveWallets,
  });

  if (summaryQuery.isLoading) {
    return <PageState title={copy.loadingPortfolio} message={copy.dashboard.summaryLoadingHint} />;
  }

  if (summaryQuery.isError) {
    return <PageState title={copy.portfolioFailed} message={copy.dashboard.summaryErrorHint} />;
  }

  const summary = summaryQuery.data;

  if (!summary) {
    return <PageState title={copy.dashboard.noSummary} />;
  }

  if (!hasActiveWallets) {
    return (
      <div className="dashboard-grid">
        <FirstWalletActivation />
      </div>
    );
  }

  const allocationScopeMatches = allocationQuery.data
    ? allocationScopeKey(allocationQuery.data.scope) === allocationScopeKey(allocationScope)
    : false;
  const topAssets = allocationScopeMatches ? allocationQuery.data?.items ?? [] : [];
  const allocationLoading = allocationQuery.isLoading || (allocationQuery.isFetching && !allocationScopeMatches);
  const history = historyQuery.data?.points ?? [];
  const historyChartData = buildPortfolioChartData(history, copy.locale);
  const dailyHistoryData = buildDailyHistoryData(historyChartData, historyDays, copy.locale);
  return (
    <div className="dashboard-grid">
      <section className="metrics-grid soft-row">
        <Metric label={copy.dashboard.wallets} value={String(summary.active_wallets_count ?? summary.wallets_count)} helper={copy.dashboard.activeInSummary} icon={<WalletCards size={20} />} />
        <Metric label={copy.dashboard.topAssets} value={String(topAssets.length)} helper={copy.dashboard.portfolioShare} icon={<Layers3 size={20} />} />
      </section>

      <article className="content-band allocation-card">
        <SectionHeader
          eyebrow={copy.dashboard.assets}
          title={copy.dashboard.allocation}
          actions={
            <AllocationGroupFilter
              groups={groupsQuery.data ?? []}
              value={allocationScope}
              onApply={setAllocationScope}
              language={language}
            />
          }
        />
        {allocationScopeMatches && allocationQuery.data ? (
          <p className="allocation-scope-summary">
            <strong>{allocationScope.mode === "all" ? copy.dashboard.allActiveWallets : copy.dashboard.selectedGroups}</strong>
            {" · "}{copy.dashboard.subtotal}: {formatUsd(allocationQuery.data.total_usd)}
            {" · "}{allocationQuery.data.wallets_count} {copy.dashboard.walletsShort}
            <span>{copy.dashboard.globalHint}</span>
          </p>
        ) : null}
        {allocationLoading ? (
          <PageState title={copy.dashboard.loadingAllocation} />
        ) : allocationQuery.isError ? (
          <PageState title={copy.dashboard.allocationFailed} />
        ) : topAssets.length === 0 ? (
          <PageState title={copy.noAssets} message={copy.dashboard.allocationEmptyHint} />
        ) : (
          <div className="chart-grid">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={topAssets} dataKey={(item) => toNumber(item.share_pct)} nameKey="symbol" innerRadius={62} outerRadius={96} paddingAngle={3}>
                  {topAssets.map((asset, index) => (
                    <Cell key={asset.asset_key} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="asset-list">
              {topAssets.map((asset, index) => (
                <div className="asset-row" key={asset.asset_key}>
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
          eyebrow={copy.dashboard.history}
          title={copy.dashboard.valueByDay}
          actions={
            <div className="history-periods" role="group" aria-label={copy.dashboard.historyPeriod}>
              {historyPeriods.map((days) => (
                <button
                  key={days}
                  type="button"
                  className={historyDays === days ? "active" : ""}
                  aria-pressed={historyDays === days}
                  onClick={() => setHistoryDays(days)}
                >
                  {days}{copy.dashboard.daySuffix}
                </button>
              ))}
            </div>
          }
        />
        {historyQuery.isLoading ? (
          <PageState title={copy.dashboard.loadingHistory} />
        ) : historyQuery.isError ? (
          <PageState title={copy.historyFailed} message={copy.historyFailedHint} />
        ) : history.length === 0 ? (
          <PageState title={copy.noHistory} message={copy.dashboard.createSnapshotHint} />
        ) : (
          <div className="history-chart" role="img" aria-label={`${copy.dashboard.chartAria} ${historyDays} ${copy.dashboard.chartDays}`} aria-busy={historyQuery.isFetching}>
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
                  content={<HistoryTooltip copy={copy.dashboard} />}
                />
                <Area
                  type="monotone"
                  dataKey="onchain"
                  name={copy.dashboard.onchain}
                  stackId="sources"
                  stroke="#ec6046"
                  strokeWidth={3}
                  fill="url(#historyFill)"
                  connectNulls={false}
                  dot={false}
                  activeDot={{ r: 6, fill: "#ec6046", stroke: "#ffffff", strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="cex"
                  name={copy.dashboard.cex}
                  stackId="sources"
                  stroke="#f2a35e"
                  strokeWidth={3}
                  fill="#f2a35e"
                  fillOpacity={0.18}
                  connectNulls={false}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="manual"
                  name={copy.dashboard.manual}
                  stackId="sources"
                  stroke="#161616"
                  strokeWidth={3}
                  fill="#161616"
                  fillOpacity={0.1}
                  connectNulls={false}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="history-source-legend" aria-label={copy.dashboard.sourceLegend}>
              <span><i className="onchain" />{copy.dashboard.onchain}</span>
              <span><i className="cex" />{copy.dashboard.cex}</span>
              <span><i className="manual" />{copy.dashboard.manual}</span>
            </div>
            <p className="history-note">{copy.dashboard.chartHint}</p>
          </div>
        )}
      </article>

    </div>
  );
}
