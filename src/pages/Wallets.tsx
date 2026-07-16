
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Check, Copy, ExternalLink, Plus, RefreshCw } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { getGroups } from "../api/groups";
import type { ChainType, WalletType } from "../api/types";
import { archiveWallet, createWallet, getWalletAssets, getWallets } from "../api/wallets";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { formatUsd, shortAddress } from "../lib/format";

const chains: ChainType[] = ["mainnet", "base", "bnb", "arbitrum", "linea", "binance"];

function hasUsableLiveBalance(data: Awaited<ReturnType<typeof getWalletAssets>> | undefined) {
  if (!data) return false;
  if (data.chains.length === 0) return true;
  return data.chains.some((chain) => chain.status !== "skipped" || chain.error_type !== "missing_rpc_url");
}

export function Wallets() {
  const queryClient = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const [walletType, setWalletType] = useState<WalletType>("evm");
  const [chainType, setChainType] = useState<ChainType>("mainnet");
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [groupId, setGroupId] = useState("");
  const [copiedWalletId, setCopiedWalletId] = useState<number | null>(null);

  const walletsQuery = useQuery({ queryKey: ["wallets", activeOnly], queryFn: () => getWallets({ activeOnly }) });
  const groupsQuery = useQuery({ queryKey: ["wallet-groups"], queryFn: getGroups });
  const liveAssetsQueries = useQueries({
    queries: (walletsQuery.data ?? [])
      .filter((wallet) => wallet.wallet_type === "evm" && wallet.is_active)
      .map((wallet) => ({
        queryKey: ["wallet", wallet.id, "assets"],
        queryFn: () => getWalletAssets(wallet.id),
        enabled: false,
        staleTime: 30_000,
      })),
  });
  const liveAssetsByWalletId = new Map(
    (walletsQuery.data ?? [])
      .filter((wallet) => wallet.wallet_type === "evm" && wallet.is_active)
      .map((wallet, index) => [wallet.id, liveAssetsQueries[index]]),
  );
  const createMutation = useMutation({
    mutationFn: createWallet,
    onSuccess: () => {
      setLabel("");
      setAddress("");
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
    },
  });
  const archiveMutation = useMutation({
    mutationFn: archiveWallet,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wallets"] }),
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate({
      label,
      wallet_type: walletType,
      chain_type: walletType === "manual" ? "manual" : chainType,
      address: walletType === "manual" ? null : address,
      group_id: groupId ? Number(groupId) : null,
    });
  }

  async function copyAddress(walletId: number, walletAddress?: string | null) {
    if (!walletAddress) return;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(walletAddress);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = walletAddress;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopiedWalletId(walletId);
    window.setTimeout(() => setCopiedWalletId((current) => (current === walletId ? null : current)), 1600);
  }

  return (
    <section className="content-band">
      <SectionHeader
        eyebrow="Wallets"
        title="Кошельки"
        actions={
          <label className="toggle">
            <input type="checkbox" checked={!activeOnly} onChange={(event) => setActiveOnly(!event.target.checked)} />
            Показать архивные
          </label>
        }
      />

      <form className="wallet-form" onSubmit={handleCreate}>
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Название" required minLength={1} maxLength={100} />
        <select value={walletType} onChange={(event) => setWalletType(event.target.value as WalletType)}>
          <option value="evm">EVM</option>
          <option value="manual">Manual</option>
        </select>
        {walletType === "evm" ? (
          <>
            <select value={chainType} onChange={(event) => setChainType(event.target.value as ChainType)}>
              {chains.map((chain) => (
                <option key={chain} value={chain}>{chain}</option>
              ))}
            </select>
            <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x..." required maxLength={128} />
          </>
        ) : null}
        <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
          <option value="">Без группы</option>
          {(groupsQuery.data ?? []).map((group) => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
        <button className="primary-button" type="submit" disabled={createMutation.isPending}>
          <Plus size={18} />
          Добавить
        </button>
      </form>

      {chainType === "binance" && walletType === "evm" ? <p className="muted">Binance chain не участвует в снапшотах.</p> : null}
      {createMutation.isError ? <p className="form-error">{getErrorMessage(createMutation.error)}</p> : null}
      {walletsQuery.isLoading ? <PageState title="Загружаем кошельки" /> : null}
      {walletsQuery.isError ? <PageState title="Не удалось загрузить кошельки" /> : null}

      <div className="table-list">
        {(walletsQuery.data ?? []).map((wallet) => {
          const liveAssetsQuery = liveAssetsByWalletId.get(wallet.id);
          const liveBalance = liveAssetsQuery?.data?.total_usd;
          const hasLiveBalance = liveBalance !== undefined && liveAssetsQuery?.isError !== true && hasUsableLiveBalance(liveAssetsQuery?.data);
          const isLiveLoading = liveAssetsQuery?.isFetching === true;
          const isLiveError = liveAssetsQuery?.isError === true;
          const isLiveUnavailable = liveAssetsQuery?.data && !hasUsableLiveBalance(liveAssetsQuery.data);
          const snapshotSource = wallet.balance_source === "latest_snapshot"
            ? "latest snapshot"
            : wallet.balance_source === "manual"
              ? "manual"
              : "no snapshot";
          const balanceSource = hasLiveBalance
            ? "live"
            : isLiveLoading
              ? `${snapshotSource} · live loading`
              : isLiveError || isLiveUnavailable
                ? `${snapshotSource} · live unavailable`
                : snapshotSource;
          const balanceLabel = formatUsd(hasLiveBalance ? liveBalance : wallet.balance_usd);

          return (
            <article className="table-row wallet-row" key={wallet.id}>
              <div className="wallet-cell-main">
                <Link className="wallet-title-link" to={`/wallets/${wallet.id}`}>
                  <strong>{wallet.label}</strong>
                </Link>
                <span>
                  {wallet.wallet_type} / {wallet.chain_type}
                  {wallet.group_name ? ` / ${wallet.group_name}` : ""}
                </span>
              </div>
              <div className="wallet-balance-cell">
                <strong>{balanceLabel}</strong>
                <span>
                  {balanceSource}
                  {!hasLiveBalance && wallet.last_snapshot_at ? ` · ${new Date(wallet.last_snapshot_at).toLocaleDateString("ru-RU")}` : ""}
                </span>
                {wallet.wallet_type === "evm" && wallet.is_active ? (
                  <button
                    className="live-balance-button"
                    type="button"
                    onClick={() => void liveAssetsQuery?.refetch()}
                    disabled={isLiveLoading}
                  >
                    <RefreshCw size={13} className={isLiveLoading ? "spin" : undefined} />
                    {isLiveLoading ? "Проверяем live" : "Проверить live"}
                  </button>
                ) : null}
              </div>
              <span className="wallet-assets-preview">
                {wallet.top_assets.length > 0
                  ? wallet.top_assets.slice(0, 2).map((asset) => asset.symbol).join(", ")
                  : `${wallet.balances_count} assets`}
              </span>
              <button
                className={`chip copy-chip${copiedWalletId === wallet.id ? " copied" : ""}`}
                type="button"
                onClick={() => void copyAddress(wallet.id, wallet.address)}
                disabled={!wallet.address}
                title={wallet.address ? "Скопировать адрес" : "У кошелька нет адреса"}
                aria-label={wallet.address ? `Скопировать адрес ${wallet.label}` : `У кошелька ${wallet.label} нет адреса`}
              >
                {copiedWalletId === wallet.id ? <Check size={14} /> : <Copy size={14} />}
                {copiedWalletId === wallet.id ? "Скопировано" : shortAddress(wallet.address)}
              </button>
              <span className={wallet.is_active ? "status-pill active" : "status-pill"}>{wallet.is_active ? "active" : "archived"}</span>
              <Link className="open-wallet-button" to={`/wallets/${wallet.id}`} aria-label={`Открыть кошелек ${wallet.label}`}>
                Открыть
                <ExternalLink size={16} />
              </Link>
              <button className="icon-button" type="button" onClick={() => archiveMutation.mutate(wallet.id)} aria-label="Архивировать">
                <Archive size={17} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
