"use client";

import { useRef, useState } from "react";
import { JournalEntryDialogContent } from "../../components/journal-entry-dialog";
import { Dialog, DialogTrigger } from "../../components/ui/dialog";
import { SymptomForm } from "./symptom-form";

export function SymptomEntry() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
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
      <div className="entry-island"><DialogTrigger asChild><button className="add-meal" aria-label="Dodaj simptom"><span aria-hidden="true" className="text-2xl">＋</span><svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h5l3-8 4 16 3-8h5" /></svg><span role="tooltip" className="add-tooltip">Dodaj simptom</span></button></DialogTrigger></div>
      <JournalEntryDialogContent>
        <SymptomForm onClose={() => changeOpen(false)} onDirtyChange={value => { dirty.current = value; }} onSavingChange={value => { saving.current = value; }} onSuccess={() => { dirty.current = false; saving.current = false; setOpen(false); setMessage("Simptom je sačuvan."); }} />
      </JournalEntryDialogContent>
    </Dialog>
  </>;
}
