import type { ReactNode } from "react";

type MetricProps = {
  label: string;
  value: string;
  helper?: string;
  icon: ReactNode;
};

export function Metric({ label, value, helper, icon }: MetricProps) {
  return (
    <article className="metric">
      <div className="metric-icon">{icon}</div>
      <div>
        <p className="muted">{label}</p>
        <strong>{value}</strong>
        {helper ? <span>{helper}</span> : null}
      </div>
    </article>
  );
}
