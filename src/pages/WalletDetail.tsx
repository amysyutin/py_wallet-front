
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Copy, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { createSnapshot } from "../api/snapshots";
import type { ChainType } from "../api/types";
import {
  deleteManualBalance,
  getManualBalances,
  getWallet,
  saveManualBalances,
  updateWallet,
} from "../api/wallets";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { formatUsd } from "../lib/format";

const evmChains: ChainType[] = ["mainnet", "base", "bnb", "arbitrum", "linea", "binance"];

export function WalletDetail() {
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
  const balancesQuery = useQuery({
    queryKey: ["wallet", walletId, "balances"],
    queryFn: () => getManualBalances(walletId),
    enabled: walletQuery.data?.wallet_type === "manual",
  });
  const snapshotMutation = useMutation({
    mutationFn: () => createSnapshot(walletId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["wallet", walletId] });
    },
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

  if (walletQuery.isLoading) return <PageState title="Загружаем кошелек" />;
  if (walletQuery.isError || !walletQuery.data) return <PageState title="Кошелек не найден" />;

  const wallet = walletQuery.data;
  const isEvm = wallet.wallet_type === "evm";

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
        actions={isEvm ? (
          <button className="primary-button" type="button" onClick={() => snapshotMutation.mutate()} disabled={snapshotMutation.isPending}>
            <Camera size={18} />
            {snapshotMutation.isPending ? "Снимаем..." : "Снапшот"}
          </button>
        ) : null}
      />

      <div className="detail-grid wallet-detail-grid">
        <p className="full-address-line"><b>Адрес:</b> {wallet.address || "manual wallet"}</p>
        <p><b>Сеть:</b> {wallet.chain_type}</p>
        <p><b>Статус:</b> {wallet.is_active ? "active" : "archived"}</p>
      </div>

      {isEvm ? (
        <form className="wallet-settings-form" onSubmit={handleWalletUpdate}>
          <label>
            Сеть
            <select value={chainType} onChange={(event) => setChainType(event.target.value as ChainType)}>
              {evmChains.map((chain) => (
                <option key={chain} value={chain}>{chain}</option>
              ))}
            </select>
          </label>
          <label>
            Полный адрес кошелька
            <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x..." required maxLength={128} />
          </label>
          <button className="primary-button" type="submit" disabled={updateMutation.isPending}>
            <Save size={18} />
            {updateMutation.isPending ? "Сохраняем..." : "Сохранить сеть"}
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
      {snapshotMutation.isError ? <p className="form-error">{getErrorMessage(snapshotMutation.error)}</p> : null}

      {wallet.wallet_type === "manual" ? (
        <section className="nested-section">
          <SectionHeader eyebrow="Manual" title={`Балансы ${formatUsd(balancesQuery.data?.total_usd)}`} />
          <form className="inline-form" onSubmit={handleAddBalance}>
            <input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} placeholder="BTC" required />
            <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" required />
            <input value={priceUsd} onChange={(event) => setPriceUsd(event.target.value)} placeholder="Price USD" />
            <button className="primary-button" type="submit">
              <Plus size={18} />
              Сохранить
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
    </section>
  );
}
