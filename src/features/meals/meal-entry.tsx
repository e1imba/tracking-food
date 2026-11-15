"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "../../components/ui/dialog";
import type { MealSuggestion } from "./suggestions";
import { MealForm } from "./meal-form";

export function MealEntry({ catalog, suggestions }: { catalog: { id: string; name: string }[]; suggestions: MealSuggestion[] }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const visual = window.visualViewport;
    const update = () => setViewport({ height: visual.height, top: visual.offsetTop });
    update();
    visual.addEventListener("resize", update);
    visual.addEventListener("scroll", update);
    return () => { visual.removeEventListener("resize", update); visual.removeEventListener("scroll", update); };
  }, [open]);
  const dirty = useRef(false);
  const saving = useRef(false);
  function changeOpen(next: boolean) {
    if (!next && (saving.current || (dirty.current && !window.confirm("Odbaciti unete izmene?")))) return;
    dirty.current = false;
    setOpen(next);
    if (next) setMessage("");
  }
  return <>
    <p role="status" className="save-confirmation">{message}</p>
    <Dialog open={open} onOpenChange={changeOpen}>
      <div className="entry-island"><DialogTrigger asChild><button className="add-meal" aria-label="Dodaj obrok"><span aria-hidden="true" className="text-2xl">＋</span><svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v6m3-6v6m-6-6v6c0 3 6 3 6 0M5 12v9M17 3c-3 3-4 7-3 10h4M18 3v18" /></svg><span role="tooltip" className="add-tooltip">Dodaj obrok</span></button></DialogTrigger></div>
      <DialogContent style={viewport ? { "--visible-height": `${viewport.height}px`, "--visible-top": `${viewport.top}px` } as React.CSSProperties : undefined} className="meal-dialog" onInteractOutside={event => event.preventDefault()}>
        <header className="panel-heading"><div><DialogTitle>Novi obrok</DialogTitle><DialogDescription>Sačuvajte obrok u svoj privatni dnevnik.</DialogDescription></div><button className="icon-button" aria-label="Zatvori unos" onClick={() => changeOpen(false)}>×</button></header>
        <MealForm catalog={catalog} suggestions={suggestions} onDirtyChange={value => { dirty.current = value; }} onSavingChange={value => { saving.current = value; }} onSuccess={() => { dirty.current = false; saving.current = false; setOpen(false); setMessage("Obrok je sačuvan."); }} />
      </DialogContent>
    </Dialog>
  </>;
}
