import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { type FormEvent, useState } from "react";
import { getDemoBinanceBalance, getLiveAssets } from "../api/extras";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { formatUsd } from "../lib/format";
import { usePageCopy } from "../telegram/i18n";
export function Explore() {
  const copy = usePageCopy();
  const [draft, setDraft] = useState(""); const [address, setAddress] = useState(""); const liveQuery = useQuery({ queryKey: ["assets", address], queryFn: () => getLiveAssets(address), enabled: Boolean(address) }); const demoQuery = useQuery({ queryKey: ["demo", "binance"], queryFn: getDemoBinanceBalance });
  function handleSubmit(event: FormEvent) { event.preventDefault(); setAddress(draft); }
  return <section className="two-column"><article className="content-band"><SectionHeader eyebrow={copy.wallet.live} title={copy.explorePage.title} /><form className="inline-form" onSubmit={handleSubmit}><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="0x..." /><button className="primary-button" type="submit"><Search size={18} />{copy.explorePage.check}</button></form>{liveQuery.isLoading ? <PageState title={copy.explorePage.loadingNetworks} /> : null}{liveQuery.data ? <div className="table-list"><article className="table-row"><strong>{copy.explorePage.total}</strong><b>{formatUsd(liveQuery.data.total_usd)}</b></article>{liveQuery.data.chains.map((chain) => <article className="table-row" key={chain.chain}><div><strong>{chain.chain}</strong><span>{chain.native_symbol}: {chain.native_amount}</span></div><b>{formatUsd(chain.tokens.reduce((sum, token) => sum + Number(token.usd || 0), 0))}</b></article>)}</div> : null}</article><article className="content-band"><SectionHeader eyebrow={copy.explorePage.demoEyebrow} title={copy.explorePage.demoTitle} />{demoQuery.isLoading ? <PageState title={copy.explorePage.loadingDemo} /> : null}{demoQuery.data ? <div className="table-list"><article className="table-row"><strong>{copy.explorePage.total} USDT</strong><b>{formatUsd(demoQuery.data.total_usdt)}</b></article>{demoQuery.data.assets.map((asset) => <article className="table-row" key={asset.asset}><span>{asset.asset}</span><b>{asset.amount}</b></article>)}</div> : null}</article></section>;
}
