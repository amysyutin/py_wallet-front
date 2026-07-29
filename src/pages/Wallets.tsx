
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Check, Copy, ExternalLink, Plus, RefreshCw } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { getGroups } from "../api/groups";
import { getSnapshotJobs } from "../api/snapshots";
import type { WalletType } from "../api/types";
import { archiveWallet, createWallet, getWalletAssets, getWallets } from "../api/wallets";
import { FirstSnapshotProgress, type FirstSnapshotProgressStatus } from "../components/FirstSnapshotProgress";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { formatUsd, shortAddress } from "../lib/format";
import { usePageCopy } from "../telegram/i18n";

const firstSnapshotLookupTimeoutMs = 15_000;
const terminalSnapshotStatuses = new Set(["success", "partial_success", "failed"]);

function hasUsableLiveBalance(data: Awaited<ReturnType<typeof getWalletAssets>> | undefined) {
  if (!data) return false;
  if (data.chains.length === 0) return true;
  return data.chains.some((chain) => chain.status !== "skipped" || chain.error_type !== "missing_rpc_url");
}

export function Wallets() {
  const copy = usePageCopy();
  const queryClient = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const [walletType, setWalletType] = useState<WalletType>("evm");
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [groupId, setGroupId] = useState("");
  const [copiedWalletId, setCopiedWalletId] = useState<number | null>(null);
  const [firstSnapshot, setFirstSnapshot] = useState<{
    walletId: number;
    walletLabel: string;
    startedAt: number;
  } | null>(null);

  const walletsQuery = useQuery({ queryKey: ["wallets", activeOnly], queryFn: () => getWallets({ activeOnly }) });
  const groupsQuery = useQuery({ queryKey: ["wallet-groups"], queryFn: getGroups });
  const firstSnapshotQuery = useQuery({
    queryKey: ["snapshot-jobs", "first-wallet", firstSnapshot?.walletId],
    queryFn: async () => {
      const jobs = await getSnapshotJobs({
        limit: 1,
        walletId: firstSnapshot?.walletId,
        triggerType: "auto",
      });
      return { job: jobs[0] ?? null, checkedAt: Date.now() };
    },
    enabled: firstSnapshot !== null,
    retry: false,
    refetchInterval: (query) => {
      if (!firstSnapshot || query.state.error) return false;
      const result = query.state.data;
      if (result?.job) {
        return terminalSnapshotStatuses.has(result.job.status) ? false : 1_000;
      }
      if (result && result.checkedAt - firstSnapshot.startedAt >= firstSnapshotLookupTimeoutMs) {
        return false;
      }
      return 1_000;
    },
  });
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
    onSuccess: (wallet) => {
      setLabel("");
      setAddress("");
      setFirstSnapshot(
        wallet.wallet_type === "evm"
          ? {
              walletId: wallet.id,
              walletLabel: wallet.label,
              startedAt: Date.now(),
            }
          : null,
      );
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
    },
  });
  const archiveMutation = useMutation({
    mutationFn: archiveWallet,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wallets"] }),
  });
  const firstSnapshotJob = firstSnapshotQuery.data?.job;
  const firstSnapshotTimedOut = Boolean(
    firstSnapshot
    && firstSnapshotQuery.data
    && !firstSnapshotJob
    && firstSnapshotQuery.data.checkedAt - firstSnapshot.startedAt >= firstSnapshotLookupTimeoutMs,
  );
  const firstSnapshotStatus: FirstSnapshotProgressStatus | string | null = firstSnapshot
    ? firstSnapshotJob?.status
      ?? (firstSnapshotQuery.isError || firstSnapshotTimedOut ? "unavailable" : "starting")
    : null;

  useEffect(() => {
    if (!firstSnapshotJob || !terminalSnapshotStatuses.has(firstSnapshotJob.status)) return;
    void queryClient.invalidateQueries({ queryKey: ["wallets"] });
    void queryClient.invalidateQueries({ queryKey: ["portfolio"] });
  }, [firstSnapshotJob, queryClient]);

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate({
      label,
      wallet_type: walletType,
      chain_type: walletType === "manual" ? "manual" : "all",
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
        title={copy.walletsTitle}
        actions={
          <label className="toggle">
            <input type="checkbox" checked={!activeOnly} onChange={(event) => setActiveOnly(!event.target.checked)} />
            {copy.showArchived}
          </label>
        }
      />

      <form className="wallet-form" onSubmit={handleCreate}>
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder={copy.name} required minLength={1} maxLength={100} />
        <select value={walletType} onChange={(event) => setWalletType(event.target.value as WalletType)}>
          <option value="evm">EVM</option>
          <option value="manual">Manual</option>
        </select>
        {walletType === "evm" ? (
          <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x..." required maxLength={42} />
        ) : null}
        <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
          <option value="">{copy.noGroup}</option>
          {(groupsQuery.data ?? []).map((group) => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
        <button className="primary-button" type="submit" disabled={createMutation.isPending}>
          <Plus size={18} />
          {copy.add}
        </button>
      </form>

      {firstSnapshot && firstSnapshotStatus ? (
        <FirstSnapshotProgress
          walletLabel={firstSnapshot.walletLabel}
          status={firstSnapshotStatus}
          jobId={firstSnapshotJob?.job_id}
          onDismiss={() => setFirstSnapshot(null)}
        />
      ) : null}

      {walletType === "evm" ? <p className="muted">{copy.allNetworksHint}</p> : null}
      {createMutation.isError ? <p className="form-error">{getErrorMessage(createMutation.error)}</p> : null}
      {walletsQuery.isLoading ? <PageState title={copy.loadingWallets} /> : null}
      {walletsQuery.isError ? <PageState title={copy.walletsFailed} /> : null}

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
                <Link className="wallet-title-link" to={`${wallet.id}`}>
                  <strong>{wallet.label}</strong>
                </Link>
                <span>
                  {wallet.wallet_type} / {wallet.wallet_type === "evm" ? copy.allNetworks : wallet.chain_type}
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
                    {isLiveLoading ? copy.checkingLive : copy.checkLive}
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
                title={wallet.address ? copy.copyAddress : copy.copyAddress}
                aria-label={wallet.address ? `Скопировать адрес ${wallet.label}` : `У кошелька ${wallet.label} нет адреса`}
              >
                {copiedWalletId === wallet.id ? <Check size={14} /> : <Copy size={14} />}
                {copiedWalletId === wallet.id ? copy.copied : shortAddress(wallet.address)}
              </button>
              <span className={wallet.is_active ? "status-pill active" : "status-pill"}>{wallet.is_active ? "active" : "archived"}</span>
              <Link className="open-wallet-button" to={`${wallet.id}`} aria-label={`Открыть кошелек ${wallet.label}`}>
                {copy.open}
                <ExternalLink size={16} />
              </Link>
              <button className="icon-button" type="button" onClick={() => archiveMutation.mutate(wallet.id)} aria-label={copy.archive}>
                <Archive size={17} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
