
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import type { ChainType } from "../api/types";
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

const evmChains: ChainType[] = ["mainnet", "base", "bnb", "arbitrum", "linea", "binance"];

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
  const [chainType, setChainType] = useState<ChainType>("mainnet");
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
    enabled: walletQuery.data?.wallet_type === "evm",
  });
  const balancesQuery = useQuery({
    queryKey: ["wallet", walletId, "balances"],
    queryFn: () => getManualBalances(walletId),
    enabled: walletQuery.data?.wallet_type === "manual",
  });
  const updateMutation = useMutation({
    mutationFn: () => updateWallet(walletId, { chain_type: chainType, address }),
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
      setChainType(walletQuery.data.chain_type as ChainType);
      setAddress(walletQuery.data.address ?? "");
    }
  }, [walletQuery.data]);

  if (walletQuery.isLoading) return <PageState title={copy.loadingWallet} />;
  if (walletQuery.isError || !walletQuery.data) return <PageState title={copy.walletMissing} />;

  const wallet = walletQuery.data;
  const isEvm = wallet.wallet_type === "evm";
  const isLiveUnavailable = liveAssetsQuery.data && !hasUsableLiveBalance(liveAssetsQuery.data);
  const liveBalanceLabel = !isEvm
    ? formatUsd(summaryQuery.data?.balance_usd)
    : liveAssetsQuery.isLoading
      ? "Загрузка..."
      : liveAssetsQuery.isError || isLiveUnavailable
        ? `${copy.liveBalance} unavailable`
        : formatUsd(liveAssetsQuery.data?.total_usd);

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
        <p className="full-address-line"><b>{copy.address}:</b> {wallet.address || "manual wallet"}</p>
        <p><b>{copy.network}:</b> {wallet.chain_type}</p>
        <p><b>{copy.status}:</b> {wallet.is_active ? "active" : "archived"}</p>
        <p><b>{copy.liveBalance}:</b> {liveBalanceLabel}</p>
        <p><b>{copy.snapshotBalance}:</b> {formatUsd(summaryQuery.data?.balance_usd)}</p>
        <p><b>{copy.lastSnapshot}:</b> {summaryQuery.data?.last_snapshot_at ? new Date(summaryQuery.data.last_snapshot_at).toLocaleString() : copy.none}</p>
      </div>

      {isEvm ? (
        <form className="wallet-settings-form" onSubmit={handleWalletUpdate}>
          <label>
            {copy.network}
            <select value={chainType} onChange={(event) => setChainType(event.target.value as ChainType)}>
              {evmChains.map((chain) => (
                <option key={chain} value={chain}>{chain}</option>
              ))}
            </select>
          </label>
          <label>
            {copy.fullAddress}
            <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x..." required maxLength={128} />
          </label>
          <button className="primary-button" type="submit" disabled={updateMutation.isPending}>
            <Save size={18} />
            {updateMutation.isPending ? copy.saving : copy.saveNetwork}
          </button>
          {wallet.address ? (
            <button className="chip" type="button" onClick={() => navigator.clipboard.writeText(wallet.address ?? "")}>
              <Copy size={15} />
              Копировать адрес
            </button>
          ) : null}
        </form>
      ) : null}

      {updateMutation.isError ? <p className="form-error">{getErrorMessage(updateMutation.error)}</p> : null}

      {wallet.wallet_type === "manual" ? (
        <section className="nested-section">
          <SectionHeader eyebrow="Manual" title={`${copy.balances} ${formatUsd(balancesQuery.data?.total_usd)}`} />
          <form className="inline-form" onSubmit={handleAddBalance}>
            <input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} placeholder="BTC" required />
            <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" required />
            <input value={priceUsd} onChange={(event) => setPriceUsd(event.target.value)} placeholder="Price USD" />
            <button className="primary-button" type="submit">
              <Plus size={18} />
              {copy.save}
            </button>
          </form>
          {saveMutation.isError ? <p className="form-error">{getErrorMessage(saveMutation.error)}</p> : null}
          <div className="table-list">
            {(balancesQuery.data?.balances ?? []).map((balance) => (
              <article className="table-row" key={balance.asset_id}>
                <div>
                  <strong>{balance.symbol}</strong>
                  <span>{balance.amount} · {balance.chain}</span>
                </div>
                <b>{formatUsd(balance.value_usd)}</b>
                <button className="icon-button danger" type="button" onClick={() => deleteMutation.mutate(balance.asset_id)} aria-label="Удалить актив">
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <p className="muted">EVM-снапшоты агрегируют этот адрес по поддерживаемым сетям.</p>
      )}

      {isEvm ? (
        <section className="nested-section">
          <SectionHeader eyebrow="Live" title={`${copy.realBalance} ${liveBalanceLabel}`} />
          {liveAssetsQuery.isLoading ? <PageState title="Смотрим live assets" /> : null}
          {liveAssetsQuery.isError ? <p className="form-error">{getErrorMessage(liveAssetsQuery.error)}</p> : null}
          {isLiveUnavailable ? <p className="form-error">Live RPC не настроен для выбранных сетей. Ниже остается snapshot summary.</p> : null}
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
        <SectionHeader eyebrow="Snapshot summary" title={`${copy.assets} ${formatUsd(summaryQuery.data?.balance_usd)}`} />
        {summaryQuery.isLoading ? <PageState title="Загружаем summary" /> : null}
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
        <SectionHeader eyebrow="Snapshots" title={copy.recentRuns} />
        {snapshotsQuery.isError ? <p className="form-error">{getErrorMessage(snapshotsQuery.error)}</p> : null}
        <div className="table-list">
          {(snapshotsQuery.data ?? []).map((snapshot) => (
            <article className="table-row" key={snapshot.id}>
              <div>
                <strong>{formatUsd(snapshot.total_usd)}</strong>
                <span>{new Date(snapshot.snapshot_at).toLocaleString("ru-RU")} · run #{snapshot.snapshot_run_id}</span>
              </div>
              <span className={snapshot.status === "success" ? "status-pill active" : "status-pill"}>{snapshot.status}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
