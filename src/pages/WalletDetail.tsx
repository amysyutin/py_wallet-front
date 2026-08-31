
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Copy, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import {
  deleteManualBalance,
  getManualBalances,
  getWallet,
  getWalletAssets,
  getWalletSnapshots,
  getWalletSummary,
  saveManualBalances,
  updateWallet,
} from "../api/wallets";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { formatUsd } from "../lib/format";
import { usePageCopy } from "../telegram/i18n";

function hasUsableLiveBalance(data: Awaited<ReturnType<typeof getWalletAssets>> | undefined) {
  if (!data) return false;
  if (data.chains.length === 0) return true;
  return data.chains.some((chain) => chain.status !== "skipped" || chain.error_type !== "missing_rpc_url");
}

export function WalletDetail() {
  const copy = usePageCopy();
  const queryClient = useQueryClient();
  const walletId = Number(useParams().walletId);
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [address, setAddress] = useState("");

  const walletQuery = useQuery({
    queryKey: ["wallet", walletId],
    queryFn: () => getWallet(walletId),
    enabled: Number.isFinite(walletId),
  });
  const summaryQuery = useQuery({
    queryKey: ["wallet", walletId, "summary"],
    queryFn: () => getWalletSummary(walletId),
    enabled: Number.isFinite(walletId),
  });
  const snapshotsQuery = useQuery({
    queryKey: ["wallet", walletId, "snapshots"],
    queryFn: () => getWalletSnapshots(walletId),
    enabled: Number.isFinite(walletId),
  });
  const liveAssetsQuery = useQuery({
    queryKey: ["wallet", walletId, "assets"],
    queryFn: () => getWalletAssets(walletId),
    enabled: false,
  });
  const balancesQuery = useQuery({
    queryKey: ["wallet", walletId, "balances"],
    queryFn: () => getManualBalances(walletId),
    enabled: walletQuery.data?.wallet_type === "manual",
  });
  const updateMutation = useMutation({
    mutationFn: () => updateWallet(walletId, { chain_type: "all", address }),
    onSuccess: (updatedWallet) => {
      queryClient.setQueryData(["wallet", walletId], updatedWallet);
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
  const saveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof saveManualBalances>[1]) => saveManualBalances(walletId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wallet", walletId, "balances"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (assetId: number) => deleteManualBalance(walletId, assetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wallet", walletId, "balances"] }),
  });

  useEffect(() => {
    if (walletQuery.data?.wallet_type === "evm") {
      setAddress(walletQuery.data.address ?? "");
    }
  }, [walletQuery.data]);

  if (walletQuery.isLoading) return <PageState title={copy.loadingWallet} />;
  if (walletQuery.isError || !walletQuery.data) return <PageState title={copy.walletMissing} />;

  const wallet = walletQuery.data;
  const isEvm = wallet.wallet_type === "evm";
  const isLiveUnavailable = liveAssetsQuery.data && !hasUsableLiveBalance(liveAssetsQuery.data);
  const health = summaryQuery.data?.data_health;
  const savedSource = (health?.source ?? (summaryQuery.data?.last_snapshot_at ? "latest_snapshot" : isEvm ? "none" : "manual")) === "latest_snapshot"
    ? copy.walletSourceSnapshot
    : (health?.source ?? (isEvm ? "none" : "manual")) === "manual"
      ? copy.walletSourceManual
      : copy.walletSourceNone;
  const liveBalanceLabel = liveAssetsQuery.data && !isLiveUnavailable
    ? formatUsd(liveAssetsQuery.data.total_usd)
    : null;

  function handleAddBalance(event: FormEvent) {
    event.preventDefault();
    const existing = balancesQuery.data?.balances.map((balance) => ({
      symbol: balance.symbol,
      chain: balance.chain,
      amount: balance.amount,
      price_usd: balance.price_usd ?? null,
    })) ?? [];
    saveMutation.mutate({ balances: [...existing, { symbol, chain: "manual", amount, price_usd: priceUsd || null }] });
    setSymbol("");
    setAmount("");
    setPriceUsd("");
  }

  function handleWalletUpdate(event: FormEvent) {
    event.preventDefault();
    updateMutation.mutate();
  }

  return (
    <section className="content-band">
      <SectionHeader
        eyebrow={wallet.wallet_type}
        title={wallet.label}
      />

      <div className="detail-grid wallet-detail-grid">
        <p className="full-address-line"><b>{copy.address}:</b> {wallet.address || copy.wallet.manualWallet}</p>
        <p><b>{copy.networks}:</b> {isEvm ? copy.allNetworks : wallet.chain_type}</p>
        <p><b>{copy.status}:</b> {wallet.is_active ? copy.wallet.active : copy.wallet.archived}</p>
      </div>

      <section className={`wallet-data-health data-health-${health?.state ?? "neutral"}`} aria-live="polite">
        <div>
          <span className="eyebrow">{copy.walletSavedValue}</span>
          <strong>{formatUsd(summaryQuery.data?.balance_usd)}</strong>
          <p>{copy.walletSavedHint}</p>
        </div>
        <div className="wallet-health-facts">
          {health ? <span className="status-pill">{copy.portfolioHealthStates[health.state]}</span> : null}
          <p><b>{copy.walletDataSource}:</b> {savedSource}</p>
          <p><b>{copy.walletAsOf}:</b> {health?.as_of ? new Date(health.as_of).toLocaleString(copy.locale) : copy.none}</p>
          {health ? (
            <p>
              <b>{copy.portfolioPriceQuality}:</b> {copy.portfolioPriceStates[health.price_quality.state]}
              {health.price_quality.assets_total > 0 ? ` (${health.price_quality.assets_priced}/${health.price_quality.assets_total})` : ""}
            </p>
          ) : null}
          {health?.refresh_in_progress ? <p>{copy.portfolioHealthRefreshing}</p> : null}
        </div>
        {health?.chain_issues.length ? (
          <div className="wallet-health-issues">
            <b>{copy.walletAffectedNetworks}</b>
            <div className="chip-row">
              {health.chain_issues.map((issue) => <span className="chip" key={issue.chain}>{issue.chain}</span>)}
            </div>
          </div>
        ) : null}
      </section>

      {isEvm ? (
        <form className="wallet-settings-form" onSubmit={handleWalletUpdate}>
          <label>
            {copy.fullAddress}
            <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x..." required maxLength={42} />
          </label>
          <button className="primary-button" type="submit" disabled={updateMutation.isPending}>
            <Save size={18} />
            {updateMutation.isPending ? copy.saving : copy.saveAddress}
          </button>
          {wallet.address ? (
            <button className="chip" type="button" onClick={() => navigator.clipboard.writeText(wallet.address ?? "")}>
              <Copy size={15} />
              {copy.copyAddress}
            </button>
          ) : null}
        </form>
      ) : null}

      {updateMutation.isError ? <p className="form-error">{getErrorMessage(updateMutation.error)}</p> : null}

      {wallet.wallet_type === "manual" ? (
        <section className="nested-section">
          <SectionHeader eyebrow={copy.wallet.manual} title={`${copy.balances} ${formatUsd(balancesQuery.data?.total_usd)}`} />
          <form className="inline-form" onSubmit={handleAddBalance}>
            <input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} placeholder="BTC" required />
            <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={copy.wallet.amount} required />
            <input value={priceUsd} onChange={(event) => setPriceUsd(event.target.value)} placeholder={copy.wallet.priceUsd} />
            <button className="primary-button" type="submit">
              <Plus size={18} />
              {copy.save}
            </button>
          </form>
          <p className="muted">{copy.wallet.manualLivePriceHint}</p>
          {saveMutation.isError ? <p className="form-error">{getErrorMessage(saveMutation.error)}</p> : null}
          <div className="table-list">
            {(balancesQuery.data?.balances ?? []).map((balance) => (
              <article className="table-row" key={balance.asset_id}>
                <div>
                  <strong>{balance.symbol}</strong>
                  <span>{balance.amount} · {balance.chain}</span>
                </div>
                <b>{formatUsd(balance.value_usd)}</b>
                <button className="icon-button danger" type="button" onClick={() => deleteMutation.mutate(balance.asset_id)} aria-label={copy.wallet.deleteAsset}>
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <p className="muted">{copy.wallet.evmHint}</p>
      )}

      {isEvm ? (
        <section className="nested-section">
          <SectionHeader eyebrow={copy.wallet.live} title={copy.walletLiveTitle} />
          <p className="muted">{copy.walletLiveHint}</p>
          <button
            className="secondary-button wallet-live-check"
            type="button"
            disabled={liveAssetsQuery.isFetching}
            onClick={() => void liveAssetsQuery.refetch()}
          >
            <Activity size={18} />
            {liveAssetsQuery.isFetching ? copy.walletCheckingLive : copy.walletCheckLive}
          </button>
          {!liveAssetsQuery.data && !liveAssetsQuery.isError && !liveAssetsQuery.isFetching ? <p className="muted">{copy.walletLiveNotRun}</p> : null}
          {liveAssetsQuery.isFetching ? <PageState title={copy.walletCheckingLive} /> : null}
          {liveAssetsQuery.isError ? <p className="form-error">{getErrorMessage(liveAssetsQuery.error)}</p> : null}
          {isLiveUnavailable ? <p className="form-error">{copy.walletLiveUnavailable}</p> : null}
          {liveBalanceLabel ? <p className="wallet-live-total"><b>{copy.liveBalance}:</b> {liveBalanceLabel}</p> : null}
          <div className="table-list">
            {(liveAssetsQuery.data?.chains ?? []).map((chain) => {
              const tokenTotal = chain.tokens.reduce((sum, token) => sum + Number(token.usd || 0), 0);
              const stableTotal = Number(chain.usdt_amount || 0) + Number(chain.usdc_amount || 0);

              return (
                <article className="table-row live-chain-row" key={chain.chain}>
                  <div>
                    <strong>{chain.chain}</strong>
                    <span>
                      {chain.native_symbol}: {chain.native_amount} · USDT: {chain.usdt_amount} · USDC: {chain.usdc_amount}
                    </span>
                  </div>
                  <b>{formatUsd(tokenTotal + stableTotal)}</b>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="nested-section">
        <SectionHeader eyebrow={copy.walletSourceSnapshot} title={`${copy.assets} ${formatUsd(summaryQuery.data?.balance_usd)}`} />
        {summaryQuery.isLoading ? <PageState title={copy.wallet.loadingSummary} /> : null}
        {summaryQuery.isError ? <p className="form-error">{getErrorMessage(summaryQuery.error)}</p> : null}
        <div className="table-list">
          {(summaryQuery.data?.assets ?? []).map((asset) => (
            <article className="table-row" key={`${asset.chain}-${asset.symbol}`}>
              <div>
                <strong>{asset.symbol}</strong>
                <span>{asset.amount} · {asset.chain}</span>
              </div>
              <b>{formatUsd(asset.usd_value)}</b>
            </article>
          ))}
        </div>
      </section>

      <section className="nested-section">
        <SectionHeader eyebrow={copy.wallet.snapshots} title={copy.recentRuns} />
        {snapshotsQuery.isError ? <p className="form-error">{getErrorMessage(snapshotsQuery.error)}</p> : null}
        <div className="table-list">
          {(snapshotsQuery.data ?? []).map((snapshot) => (
            <article className="table-row" key={snapshot.id}>
              <div>
                <strong>{formatUsd(snapshot.total_usd)}</strong>
                <span>{new Date(snapshot.snapshot_at).toLocaleString(copy.locale)} · {copy.wallet.run} #{snapshot.snapshot_run_id}</span>
              </div>
              <span className={snapshot.status === "success" ? "status-pill active" : "status-pill"}>{snapshot.status}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
