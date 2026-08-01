import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSnapshot, getSnapshotJob } from "../api/snapshots";
import type { PortfolioSummary } from "../api/types";
import { PortfolioDailyChange } from "./PortfolioDailyChange";
import { PortfolioHealthDrawer } from "./PortfolioHealthDrawer";

vi.mock("../api/snapshots", () => ({
  createSnapshot: vi.fn(),
  getSnapshotJob: vi.fn(),
}));

const createSnapshotMock = vi.mocked(createSnapshot);
const getSnapshotJobMock = vi.mocked(getSnapshotJob);

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

function renderDrawer() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <PortfolioHealthDrawer summary={summary} language="en" />
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

describe("portfolio header utility", () => {
  beforeEach(() => {
    createSnapshotMock.mockReset();
    getSnapshotJobMock.mockReset();
  });

  it("keeps severity visible and opens details in a side dialog", () => {
    renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: /Partial/ }));

    const drawer = screen.getByRole("dialog", { name: "Partial" });
    expect(drawer).toHaveTextContent("2/3");
    expect(drawer).toHaveTextContent("1 snapshot · 1 manual · 1 missing");
    expect(screen.getAllByText("base (1)")).toHaveLength(1);
    expect(drawer).not.toHaveTextContent("rpc_unavailable");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("refreshes the portfolio, polls the job, and keeps terminal feedback in the drawer", async () => {
    createSnapshotMock.mockResolvedValue({ job_id: 44, status: "pending", reused: false });
    getSnapshotJobMock.mockResolvedValue({
      job_id: 44,
      status: "success",
      scope_type: "all",
      wallet_id: null,
      group_id: null,
      trigger_type: "manual",
      created_at: "2026-07-31T08:00:00Z",
      finished_at: "2026-07-31T08:00:05Z",
      error_message: null,
    });
    const { queryClient } = renderDrawer();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(screen.getByRole("button", { name: /Partial/ }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));

    await waitFor(() => expect(createSnapshotMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getSnapshotJobMock).toHaveBeenCalledWith(44));
    await screen.findByText("Data refreshed.");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["portfolio"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["wallets"] });
  });

  it("does not enqueue another refresh while data health reports an active job", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PortfolioHealthDrawer
          summary={{
            ...summary,
            data_health: {
              ...summary.data_health!,
              state: "updating",
              refresh_in_progress: true,
            },
          }}
          language="en"
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Updating/ }));
    expect(screen.getByRole("button", { name: "Refresh data" })).toBeDisabled();
    expect(screen.getByText("A refresh is currently running.")).toBeInTheDocument();
    expect(createSnapshotMock).not.toHaveBeenCalled();
  });

  it("explains a failed refresh without implying that saved data was removed", async () => {
    createSnapshotMock.mockResolvedValue({ job_id: 45, status: "pending" });
    getSnapshotJobMock.mockResolvedValue({
      job_id: 45,
      status: "failed",
      scope_type: "all",
      wallet_id: null,
      group_id: null,
      trigger_type: "manual",
      created_at: "2026-07-31T08:00:00Z",
      finished_at: "2026-07-31T08:00:05Z",
      error_message: "provider details are not shown",
    });
    renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: /Partial/ }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));

    expect(
      await screen.findByText(
        "Refresh did not complete. Your current saved data was not removed.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/provider details/)).not.toBeInTheDocument();
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
