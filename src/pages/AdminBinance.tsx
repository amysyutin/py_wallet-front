import { useQuery } from "@tanstack/react-query";
import { getAdminBinanceBalance } from "../api/extras";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { formatUsd } from "../lib/format";
import { usePageCopy } from "../telegram/i18n";
export function AdminBinance() {
  const copy = usePageCopy();
  const balanceQuery = useQuery({ queryKey: ["admin", "binance"], queryFn: getAdminBinanceBalance });
  return <section className="content-band"><SectionHeader eyebrow={copy.layout.admin} title={copy.adminPage.title} />{balanceQuery.isLoading ? <PageState title={copy.adminPage.loading} /> : null}{balanceQuery.isError ? <PageState title={copy.adminPage.failed} /> : null}{balanceQuery.data?.error ? <p className="form-error">{balanceQuery.data.error}</p> : null}{balanceQuery.data ? <div className="table-list"><article className="table-row"><strong>{copy.explorePage.total} USDT</strong><b>{formatUsd(balanceQuery.data.total_usdt)}</b></article>{balanceQuery.data.assets.map((asset) => <article className="table-row" key={asset.asset}><span>{asset.asset}</span><b>{asset.amount}</b></article>)}</div> : null}</section>;
}
