import { Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PortfolioAllocationScope, WalletGroupRead } from "../api/types";

type Props = {
  groups: WalletGroupRead[];
  value: PortfolioAllocationScope;
  onApply: (scope: PortfolioAllocationScope) => void;
  language?: "ru" | "en";
};

export function AllocationGroupFilter({ groups, value, onApply, language = "ru" }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>(value.mode === "selection" ? value.group_ids : []);
  const [includeUngrouped, setIncludeUngrouped] = useState(value.mode === "selection" && value.include_ungrouped);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const text = language === "ru"
    ? { all: "Все кошельки", groups: "Группы", ungrouped: "Без группы", reset: "Все", apply: "Применить", close: "Закрыть фильтр" }
    : { all: "All wallets", groups: "Groups", ungrouped: "Ungrouped", reset: "All", apply: "Apply", close: "Close filter" };

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    if (window.matchMedia?.("(max-width: 719px)").matches) {
      document.body.style.overflow = "hidden";
    }
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);

  const count = value.mode === "selection" ? value.group_ids.length + Number(value.include_ungrouped) : 0;
  const label = value.mode === "all" ? text.all : `${text.groups}: ${count}`;

  function openFilter() {
    setSelected(value.mode === "selection" ? value.group_ids : []);
    setIncludeUngrouped(value.mode === "selection" && value.include_ungrouped);
    setOpen(true);
  }

  function reset() {
    setSelected([]);
    setIncludeUngrouped(false);
    onApply({ mode: "all" });
    setOpen(false);
  }

  function apply() {
    if (selected.length === 0 && !includeUngrouped) return;
    onApply({ mode: "selection", group_ids: selected, include_ungrouped: includeUngrouped });
    setOpen(false);
  }

  return (
    <div className="allocation-filter">
      <button
        ref={triggerRef}
        className="allocation-filter-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="allocation-group-filter"
        onClick={openFilter}
      >
        <SlidersHorizontal size={16} />
        <span>{label}</span>
        <ChevronDown size={15} />
      </button>
      {open ? (
        <>
          <div className="allocation-filter-backdrop" role="presentation" onMouseDown={() => setOpen(false)} />
          <div ref={panelRef} id="allocation-group-filter" className="allocation-filter-panel" role="dialog" aria-modal="true" aria-label={text.groups}>
          <header>
            <strong>{text.groups}</strong>
            <button type="button" aria-label={text.close} onClick={() => setOpen(false)}><X size={17} /></button>
          </header>
          <div className="allocation-filter-options">
            {groups.map((group) => {
              const checked = selected.includes(group.id);
              return (
                <label key={group.id}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setSelected((current) => checked ? current.filter((id) => id !== group.id) : [...current, group.id])}
                  />
                  <span>{checked ? <Check size={15} /> : null}</span>
                  {group.name}
                </label>
              );
            })}
            <label>
              <input type="checkbox" checked={includeUngrouped} onChange={(event) => setIncludeUngrouped(event.target.checked)} />
              <span>{includeUngrouped ? <Check size={15} /> : null}</span>
              {text.ungrouped}
            </label>
          </div>
          <footer>
            <button type="button" className="ghost-action" onClick={reset}>{text.reset}</button>
            <button type="button" className="primary-action" disabled={selected.length === 0 && !includeUngrouped} onClick={apply}>{text.apply}</button>
          </footer>
          </div>
        </>
      ) : null}
    </div>
  );
}
