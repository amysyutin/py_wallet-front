
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Copy, ExternalLink, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { getGroups } from "../api/groups";
import type { ChainType, WalletType } from "../api/types";
import { archiveWallet, createWallet, getWallets } from "../api/wallets";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { shortAddress } from "../lib/format";

const chains: ChainType[] = ["mainnet", "base", "bnb", "arbitrum", "linea", "binance"];

export function Wallets() {
  const queryClient = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const [walletType, setWalletType] = useState<WalletType>("evm");
  const [chainType, setChainType] = useState<ChainType>("mainnet");
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [groupId, setGroupId] = useState("");

  const walletsQuery = useQuery({ queryKey: ["wallets", activeOnly], queryFn: () => getWallets(activeOnly) });
  const groupsQuery = useQuery({ queryKey: ["wallet-groups"], queryFn: getGroups });
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
        {(walletsQuery.data ?? []).map((wallet) => (
          <article className="table-row wallet-row" key={wallet.id}>
            <div className="wallet-cell-main">
              <Link className="wallet-title-link" to={`/wallets/${wallet.id}`}>
                <strong>{wallet.label}</strong>
              </Link>
              <span>{wallet.wallet_type} / {wallet.chain_type}</span>
            </div>
            <button className="chip" type="button" onClick={() => wallet.address && navigator.clipboard.writeText(wallet.address)}>
              <Copy size={14} />
              {shortAddress(wallet.address)}
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
        ))}
      </div>
    </section>
  );
}
