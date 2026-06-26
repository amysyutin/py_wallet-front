import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { type FormEvent, useState } from "react";
import { getDemoBinanceBalance, getLiveAssets } from "../api/extras";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { formatUsd } from "../lib/format";
export function Explore() {
  const [draft, setDraft] = useState(""); const [address, setAddress] = useState(""); const liveQuery = useQuery({ queryKey: ["assets", address], queryFn: () => getLiveAssets(address), enabled: Boolean(address) }); const demoQuery = useQuery({ queryKey: ["demo", "binance"], queryFn: getDemoBinanceBalance });
  function handleSubmit(event: FormEvent) { event.preventDefault(); setAddress(draft); }
  return <section className="two-column"><article className="content-band"><SectionHeader eyebrow="Live" title="EVM-баланс по адресу" /><form className="inline-form" onSubmit={handleSubmit}><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="0x..." /><button className="primary-button" type="submit"><Search size={18} />Проверить</button></form>{liveQuery.isLoading ? <PageState title="Смотрим сети" /> : null}{liveQuery.data ? <div className="table-list"><article className="table-row"><strong>Total</strong><b>{formatUsd(liveQuery.data.total_usd)}</b></article>{liveQuery.data.chains.map((chain) => <article className="table-row" key={chain.chain}><div><strong>{chain.chain}</strong><span>{chain.native_symbol}: {chain.native_amount}</span></div><b>{formatUsd(chain.tokens.reduce((sum, token) => sum + Number(token.usd || 0), 0))}</b></article>)}</div> : null}</article><article className="content-band"><SectionHeader eyebrow="Demo" title="Binance mock" />{demoQuery.isLoading ? <PageState title="Загружаем demo" /> : null}{demoQuery.data ? <div className="table-list"><article className="table-row"><strong>Total USDT</strong><b>{formatUsd(demoQuery.data.total_usdt)}</b></article>{demoQuery.data.assets.map((asset) => <article className="table-row" key={asset.asset}><span>{asset.asset}</span><b>{asset.amount}</b></article>)}</div> : null}</article></section>;
}
