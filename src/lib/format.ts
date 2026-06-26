import BigNumber from "bignumber.js";
export function formatUsd(value?: string | number | null) {
  const amount = new BigNumber(value ?? 0);
  if (!amount.isFinite()) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: amount.gte(1000) ? 0 : 2 }).format(amount.toNumber());
}
export function toNumber(value?: string | number | null) { const amount = new BigNumber(value ?? 0); return amount.isFinite() ? amount.toNumber() : 0; }
export function shortAddress(address?: string | null) { if (!address) return "manual"; return address.length <= 12 ? address : `${address.slice(0, 6)}...${address.slice(-4)}`; }
