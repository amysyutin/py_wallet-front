
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  getPortfolioAllocation,
  getPortfolioHistory,
  getPortfolioSummary,
  replacePortfolioAllocationTargets,
} from "../api/portfolio";
import type { PortfolioAllocation, PortfolioAllocationScope } from "../api/types";
import { AllocationGroupFilter } from "../components/AllocationGroupFilter";
import { FirstWalletActivation } from "../components/FirstWalletActivation";
import { Metric } from "../components/Metric";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { formatUsd, toNumber } from "../lib/format";
import { getErrorMessage } from "../api/client";
import { useLanguage, usePageCopy } from "../telegram/i18n";

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

function buildPortfolioChartData(points: Array<{ snapshot_at: string; total_usd: string }>, locale = "ru-RU") {
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
        label: date.toLocaleDateString(locale, { day: "2-digit", month: "short" }),
        tooltipLabel: date.toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
        total,
      };
    });
}

function localDayKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function buildDailyHistoryData(points: PortfolioChartPoint[], days: number, locale = "ru-RU"): DailyHistoryPoint[] {
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
      label: date.toLocaleDateString(locale, { day: "numeric", month: "short" }).replace(".", ""),
      fullLabel: date.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }),
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

function formatSignedUsd(value: number | null, noPreviousDate: string) {
  if (value === null) return noPreviousDate;
  return value > 0 ? `+${formatUsd(value)}` : formatUsd(value);
}

function allocationScopeKey(scope: PortfolioAllocationScope) {
  return scope.mode === "all"
    ? "all"
    : `selection:${[...scope.group_ids].sort((left, right) => left - right).join(",")}:${scope.include_ungrouped}`;
}

function targetableAssets(allocation: PortfolioAllocation) {
  const assets = new Map(
    (allocation.available_assets ?? allocation.items.filter((item) => item.asset_key !== "__other__"))
      .map((item) => [item.asset_key, { asset_key: item.asset_key, symbol: item.symbol }]),
  );
  for (const target of allocation.targets ?? []) {
    if (!assets.has(target.asset_key)) {
      assets.set(target.asset_key, { asset_key: target.asset_key, symbol: target.symbol });
    }
  }
  return Array.from(assets.values());
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
      {point.previousTotal !== null ? <p>{copy.previousDay}: {formatUsd(point.previousTotal)}</p> : null}
      {!point.hasSnapshot ? <em>{copy.noNewSnapshot}</em> : null}
    </div>
  );
}

export function Dashboard() {
  const copy = usePageCopy();
  const queryClient = useQueryClient();
  const language = useLanguage((state) => state.language);
  const [historyDays, setHistoryDays] = useState<(typeof historyPeriods)[number]>(30);
  const [allocationScope, setAllocationScope] = useState<PortfolioAllocationScope>({ mode: "all" });
  const [targetEditorOpen, setTargetEditorOpen] = useState(false);
  const [draftTargets, setDraftTargets] = useState<Record<string, string>>({});
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
  const targetsMutation = useMutation({
    mutationFn: (items: Parameters<typeof replacePortfolioAllocationTargets>[0]) =>
      replacePortfolioAllocationTargets(items),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["portfolio", "allocation"] });
      setTargetEditorOpen(false);
    },
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
  const allocation = allocationScopeMatches ? allocationQuery.data : undefined;
  const targets = allocation?.targets ?? [];
  const targetAssets = allocation ? targetableAssets(allocation) : [];
  const targetTotal = Math.round(
    Object.values(draftTargets).reduce((total, value) => total + (Number(value) || 0), 0) * 100,
  ) / 100;

  function openTargetEditor() {
    if (!allocation) return;
    const configured = new Map((allocation.targets ?? []).map((target) => [target.asset_key, target.target_pct]));
    setDraftTargets(Object.fromEntries(targetableAssets(allocation).map((asset) => [asset.asset_key, configured.get(asset.asset_key) ?? ""])));
    targetsMutation.reset();
    setTargetEditorOpen(true);
  }

  function saveTargets() {
    if (!allocation || targetTotal !== 100) return;
    const byKey = new Map(targetAssets.map((asset) => [asset.asset_key, asset]));
    const items = Object.entries(draftTargets)
      .filter(([, value]) => Number(value) > 0)
      .map(([asset_key, target_pct]) => ({
        asset_key,
        symbol: byKey.get(asset_key)?.symbol ?? asset_key,
        target_pct,
      }));
    targetsMutation.mutate(items);
  }
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
            <div className="allocation-actions">
              {allocationScope.mode === "all" ? (
                <button type="button" className="secondary-button" onClick={openTargetEditor} disabled={!allocation}>
                  {targets.length ? copy.dashboard.editTargets : copy.dashboard.setTargets}
                </button>
              ) : null}
              <AllocationGroupFilter
                groups={groupsQuery.data ?? []}
                value={allocationScope}
                onApply={(scope) => {
                  setTargetEditorOpen(false);
                  setAllocationScope(scope);
                }}
                language={language}
              />
            </div>
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
        {targetEditorOpen && allocationScope.mode === "all" ? (
          <form
            className="allocation-target-editor"
            onSubmit={(event) => {
              event.preventDefault();
              saveTargets();
            }}
          >
            <div className="allocation-target-heading">
              <div>
                <strong>{copy.dashboard.targetEditorTitle}</strong>
                <span>{copy.dashboard.targetEditorHint}</span>
              </div>
              <b className={targetTotal === 100 || targetTotal === 0 ? "" : "negative"}>{targetTotal.toFixed(2)}%</b>
            </div>
            <div className="allocation-target-inputs">
              {targetAssets.map((asset) => (
                <label key={asset.asset_key}>
                  <span><strong>{asset.symbol}</strong><small>{asset.asset_key}</small></span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={draftTargets[asset.asset_key] ?? ""}
                    aria-label={`${copy.dashboard.targetFor} ${asset.symbol}`}
                    onChange={(event) => setDraftTargets({ ...draftTargets, [asset.asset_key]: event.target.value })}
                  />
                  <em>%</em>
                </label>
              ))}
            </div>
            {targetsMutation.isError ? <p className="form-error">{getErrorMessage(targetsMutation.error)}</p> : null}
            <div className="allocation-target-buttons">
              <button type="submit" disabled={targetTotal !== 100 || targetsMutation.isPending}>{copy.save}</button>
              {targets.length ? (
                <button type="button" className="secondary-button" disabled={targetsMutation.isPending} onClick={() => targetsMutation.mutate([])}>
                  {copy.dashboard.clearTargets}
                </button>
              ) : null}
              <button type="button" className="secondary-button" onClick={() => setTargetEditorOpen(false)}>{copy.dashboard.cancelTargets}</button>
            </div>
          </form>
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
        {allocationScope.mode === "all" && allocation?.rebalancing ? (
          <section className="rebalancing-panel" aria-label={copy.dashboard.rebalancingTitle}>
            <div className="rebalancing-heading">
              <div>
                <strong>{copy.dashboard.rebalancingTitle}</strong>
                <span>{copy.dashboard.rebalancingHint}</span>
              </div>
              {allocation.rebalancing.status === "incomplete" ? <em>{copy.dashboard.rebalancingIncomplete}</em> : null}
            </div>
            {allocation.rebalancing.status === "not_configured" ? (
              <p>{copy.dashboard.targetsEmpty}</p>
            ) : allocation.rebalancing.status === "empty" ? (
              <p>{copy.dashboard.targetsNoValue}</p>
            ) : (
              <div className="rebalancing-list">
                {allocation.rebalancing.items.map((item) => (
                  <div key={item.asset_key} className="rebalancing-row">
                    <span><strong>{item.symbol}</strong><small>{item.current_pct}% → {item.target_pct}%</small></span>
                    <b className={item.action === "reduce" ? "negative" : item.action === "increase" ? "positive" : ""}>
                      {item.action === "within_target"
                        ? copy.dashboard.withinTarget
                        : `${item.action === "increase" ? copy.dashboard.increase : copy.dashboard.reduce} ${formatUsd(Math.abs(toNumber(item.suggested_usd)))}`}
                    </b>
                  </div>
                ))}
              </div>
            )}
            <small className="rebalancing-disclaimer">{copy.dashboard.rebalancingDisclaimer}</small>
          </section>
        ) : null}
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
                  dataKey="total"
                  name={copy.dashboard.chartName}
                  stroke="#ec6046"
                  strokeWidth={4}
                  fill="url(#historyFill)"
                  connectNulls={false}
                  dot={false}
                  activeDot={{ r: 6, fill: "#ec6046", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <p className="history-note">{copy.dashboard.chartHint}</p>
          </div>
        )}
      </article>

    </div>
  );
}
