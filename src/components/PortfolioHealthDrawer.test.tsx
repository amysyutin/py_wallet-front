import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PortfolioSummary } from "../api/types";
import { PortfolioDailyChange } from "./PortfolioDailyChange";
import { PortfolioHealthDrawer } from "./PortfolioHealthDrawer";

const summary: PortfolioSummary = {
  total_usd: "125.50",
  wallets_count: 3,
  active_wallets_count: 3,
  last_snapshot_at: "2026-07-30T08:30:00Z",
  top_assets: [],
  data_health: {
    state: "partial",
    freshness: "fresh",
    as_of: "2026-07-30T08:00:00Z",
    wallets_covered: 2,
    wallets_total: 3,
    snapshot_wallets: 1,
    manual_wallets: 1,
    missing_wallets: 1,
    refresh_in_progress: false,
    price_quality: {
      state: "incomplete",
      sources: ["coingecko", "unknown"],
      assets_priced: 2,
      assets_total: 3,
    },
    chain_issues: [
      { chain: "base", status: "failed", error_type: "rpc_unavailable", wallets_count: 1 },
      { chain: "base", status: "failed", error_type: "timeout", wallets_count: 1 },
    ],
  },
};

describe("portfolio header utility", () => {
  it("keeps severity visible and opens details in a side dialog", () => {
    render(<PortfolioHealthDrawer summary={summary} language="en" />);

    fireEvent.click(screen.getByRole("button", { name: /Partial/ }));

    const drawer = screen.getByRole("dialog", { name: "Partial" });
    expect(drawer).toHaveTextContent("2/3");
    expect(drawer).toHaveTextContent("1 snapshot · 1 manual · 1 missing");
    expect(screen.getAllByText("base (1)")).toHaveLength(1);
    expect(drawer).not.toHaveTextContent("rpc_unavailable");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a signed 24-hour value change only when comparison is complete", () => {
    const { rerender } = render(
      <PortfolioDailyChange
        language="en"
        change={{
          status: "complete",
          kind: "value_change",
          start_usd: "100",
          end_usd: "105",
          absolute_usd: "5",
          percent: 5,
          reference_at: "2026-07-30T09:00:00Z",
          cutoff_at: "2026-07-29T09:00:00Z",
          start_observed_from: "2026-07-29T08:55:00Z",
          start_observed_to: "2026-07-29T09:00:00Z",
          end_observed_from: "2026-07-30T08:55:00Z",
          end_observed_to: "2026-07-30T09:00:00Z",
          reason_codes: [],
        }}
      />,
    );

    const changeButton = screen.getByLabelText(/Portfolio value change/);
    expect(changeButton).toHaveTextContent("+5.00%");
    fireEvent.click(changeButton);
    expect(screen.getByRole("tooltip")).toHaveTextContent("not investment P&L");
    fireEvent.keyDown(changeButton, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    rerender(
      <PortfolioDailyChange
        change={{
          status: "incomplete",
          kind: "value_change",
          start_usd: null,
          end_usd: "105",
          absolute_usd: null,
          percent: null,
          reference_at: "2026-07-30T09:00:00Z",
          cutoff_at: "2026-07-29T09:00:00Z",
          start_observed_from: null,
          start_observed_to: null,
          end_observed_from: null,
          end_observed_to: null,
          reason_codes: ["current_snapshot_partial"],
        }}
      />,
    );
    expect(screen.getByLabelText(/недоступно/i)).toHaveTextContent("—");
  });
});
