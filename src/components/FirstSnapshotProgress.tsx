import { CheckCircle2, Clock3, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { usePageCopy } from "../telegram/i18n";

export type FirstSnapshotProgressStatus =
  | "starting"
  | "pending"
  | "running"
  | "success"
  | "partial_success"
  | "failed"
  | "unavailable";

type FirstSnapshotProgressProps = {
  walletLabel: string;
  status: FirstSnapshotProgressStatus | string;
  jobId?: number;
  onDismiss: () => void;
};

function normalizeStatus(status: string): FirstSnapshotProgressStatus {
  if (
    status === "starting"
    || status === "pending"
    || status === "running"
    || status === "success"
    || status === "partial_success"
    || status === "failed"
    || status === "unavailable"
  ) {
    return status;
  }
  return "unavailable";
}

export function FirstSnapshotProgress({
  walletLabel,
  status,
  jobId,
  onDismiss,
}: FirstSnapshotProgressProps) {
  const copy = usePageCopy();
  const normalizedStatus = normalizeStatus(status);
  const content = copy.snapshotProgress[normalizedStatus];
  const isActive = normalizedStatus === "starting" || normalizedStatus === "pending" || normalizedStatus === "running";
  const isSuccess = normalizedStatus === "success";

  return (
    <aside
      className={`first-snapshot-progress snapshot-progress-${normalizedStatus}`}
      role="status"
      aria-live="polite"
    >
      <span className="snapshot-progress-icon" aria-hidden="true">
        {isActive ? <LoaderCircle className="spin" size={21} /> : null}
        {isSuccess ? <CheckCircle2 size={21} /> : null}
        {normalizedStatus === "partial_success" || normalizedStatus === "failed" ? <TriangleAlert size={21} /> : null}
        {normalizedStatus === "unavailable" ? <Clock3 size={21} /> : null}
      </span>
      <div>
        <p className="eyebrow">
          {copy.snapshotProgressWallet} “{walletLabel}”
          {jobId ? ` · #${jobId}` : ""}
        </p>
        <strong>{content.title}</strong>
        <p>{content.description}</p>
      </div>
      <button
        className="icon-button snapshot-progress-dismiss"
        type="button"
        onClick={onDismiss}
        aria-label={copy.snapshotProgressDismiss}
      >
        <X size={17} />
      </button>
    </aside>
  );
}
