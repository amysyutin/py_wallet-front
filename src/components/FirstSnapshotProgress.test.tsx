import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLanguage } from "../telegram/i18n";
import { FirstSnapshotProgress, type FirstSnapshotProgressStatus } from "./FirstSnapshotProgress";

describe("FirstSnapshotProgress", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    useLanguage.setState({ language: "ru" });
  });

  it.each([
    ["starting", "Первый snapshot запускается"],
    ["pending", "Snapshot в очереди"],
    ["running", "Собираем балансы"],
    ["success", "Первый snapshot готов"],
    ["partial_success", "Snapshot готов частично"],
    ["failed", "Snapshot не завершён"],
    ["unavailable", "Статус snapshot пока недоступен"],
  ] satisfies Array<[FirstSnapshotProgressStatus, string]>)(
    "renders the %s outcome",
    (status, title) => {
      render(
        <FirstSnapshotProgress
          walletLabel="Main wallet"
          status={status}
          jobId={412}
          onDismiss={() => undefined}
        />,
      );

      expect(screen.getByRole("status")).toHaveTextContent(title);
      expect(screen.getByRole("status")).toHaveTextContent("Main wallet");
      expect(screen.getByRole("status")).toHaveTextContent("#412");
    },
  );

  it("lets the user dismiss a terminal state", () => {
    const onDismiss = vi.fn();
    render(
      <FirstSnapshotProgress
        walletLabel="Main wallet"
        status="failed"
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Скрыть статус snapshot" }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
