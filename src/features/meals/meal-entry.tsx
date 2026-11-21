"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "../../components/ui/dialog";
import type { MealSuggestion } from "./suggestions";
import { MealForm } from "./meal-form";

function revealFocusedField(dialog: HTMLDivElement | null) {
  const scroll = dialog?.querySelector<HTMLElement>(".form-scroll");
  const field = document.activeElement;
  if (!scroll || !field || !scroll.contains(field)) return;
  const pane = scroll.getBoundingClientRect();
  const bounds = field.getBoundingClientRect();
  const padding = 8;
  const dropdown = field.matches('input[aria-expanded="true"]')
    ? field.closest(".autocomplete")?.querySelector(".autocomplete-dropdown")
    : null;
  const firstOption = dropdown?.querySelector('[role="option"]');
  const bottom = dropdown && firstOption && getComputedStyle(dropdown).position === "static"
    ? Math.min(firstOption.getBoundingClientRect().bottom, bounds.top + pane.height - 2 * padding)
    : bounds.bottom;
  if (bounds.top < pane.top + padding || bounds.height > pane.height - 2 * padding) {
    scroll.scrollTop += bounds.top - pane.top - padding;
  } else if (bottom > pane.bottom - padding) {
    scroll.scrollTop += bottom - pane.bottom + padding;
  }
}

export function MealEntry({ catalog, suggestions }: { catalog: { id: string; name: string }[]; suggestions: MealSuggestion[] }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const visual = window.visualViewport;
    const update = () => {
      const { height, offsetTop: top } = visual;
      setViewport(current => current?.height === height && current.top === top ? current : { height, top });
    };
    update();
    visual.addEventListener("resize", update);
    visual.addEventListener("scroll", update);
    return () => { visual.removeEventListener("resize", update); visual.removeEventListener("scroll", update); };
  }, [open]);
  useLayoutEffect(() => {
    if (open) revealFocusedField(dialog.current);
  }, [open, viewport]);
  const dirty = useRef(false);
  const saving = useRef(false);
  function changeOpen(next: boolean) {
    if (!next && (saving.current || (dirty.current && !window.confirm("Odbaciti unete izmene?")))) return;
    dirty.current = false;
    setOpen(next);
    if (next) {
      setViewport(null);
      setMessage("");
    }
  }
  return <>
    <p role="status" className="save-confirmation">{message}</p>
    <Dialog open={open} onOpenChange={changeOpen}>
      <div className="entry-island"><DialogTrigger asChild><button className="add-meal" aria-label="Dodaj obrok"><span aria-hidden="true" className="text-2xl">＋</span><svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v6m3-6v6m-6-6v6c0 3 6 3 6 0M5 12v9M17 3c-3 3-4 7-3 10h4M18 3v18" /></svg><span role="tooltip" className="add-tooltip">Dodaj obrok</span></button></DialogTrigger></div>
      <DialogContent ref={dialog} className="meal-dialog meal-entry-dialog"
        style={viewport ? { "--visible-height": `${viewport.height}px`, "--visible-top": `${viewport.top}px` } as React.CSSProperties : undefined}
        onInteractOutside={event => event.preventDefault()}
        onOpenAutoFocus={event => {
          const selector = window.matchMedia("(min-width: 640px)").matches ? 'input[name="name"]' : "h2";
          const target = dialog.current?.querySelector<HTMLElement>(selector);
          if (target) {
            event.preventDefault();
            target.focus({ preventScroll: true });
          }
        }}
        onFocusCapture={() => revealFocusedField(dialog.current)}
        onInput={event => {
          if (event.target instanceof HTMLInputElement && event.target.getAttribute("role") === "combobox") {
            requestAnimationFrame(() => revealFocusedField(dialog.current));
          }
        }}>
        <MealForm catalog={catalog} suggestions={suggestions} onClose={() => changeOpen(false)} onDirtyChange={value => { dirty.current = value; }} onSavingChange={value => { saving.current = value; }} onSuccess={() => { dirty.current = false; saving.current = false; setOpen(false); setMessage("Obrok je sačuvan."); }} />
      </DialogContent>
    </Dialog>
  </>;
}
