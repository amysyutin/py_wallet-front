import type { ReactNode } from "react";
type SectionHeaderProps = { eyebrow?: string; title: string; actions?: ReactNode };
export function SectionHeader({ eyebrow, title, actions }: SectionHeaderProps) {
  return <div className="section-heading"><div>{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}<h2>{title}</h2></div>{actions}</div>;
}
