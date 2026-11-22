"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEventHandler, type ReactElement, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EntryFormHeader, JournalEntryDialogContent } from "../../components/journal-entry-dialog";
import { Dialog, DialogTrigger } from "../../components/ui/dialog";

type EditorControls = {
  close: () => void;
  submit: (save: () => Promise<{ ok: boolean; message: string }>) => Promise<void>;
  trackDirty: (dirty: boolean) => void;
  message: string;
};

const EditorContext = createContext<EditorControls | null>(null);

export function useCatalogEditor() {
  const editor = useContext(EditorContext);
  if (!editor) throw new Error("Catalog form outside dialog");
  return editor;
}

export function CatalogDialog({ trigger, onSaved, children }: {
  trigger: ReactElement; onSaved: (message: string) => void; children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const dirty = useRef(false);
  const saving = useRef(false);
  const trackDirty = useCallback((value: boolean) => { dirty.current = value; }, []);
  function changeOpen(next: boolean) {
    if (!next && (saving.current || (dirty.current && !window.confirm("Odbaciti unete izmene?")))) return;
    dirty.current = false;
    setMessage("");
    setOpen(next);
  }
  async function submit(save: () => Promise<{ ok: boolean; message: string }>) {
    setMessage("");
    saving.current = true;
    try {
      const result = await save();
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      dirty.current = false;
      setOpen(false);
      onSaved(result.message);
      router.refresh();
    } catch {
      setMessage("Izmene nisu sačuvane. Pokušajte ponovo.");
    } finally {
      saving.current = false;
    }
  }
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild>{trigger}</DialogTrigger>
    <JournalEntryDialogContent>
      {open && <EditorContext.Provider value={{ close: () => changeOpen(false), submit, trackDirty, message }}>
        {children}
      </EditorContext.Provider>}
    </JournalEntryDialogContent>
  </Dialog>;
}

export function CatalogForm({ title, description, saveLabel, isSubmitting, isDirty, onSubmit, children }: {
  title: string; description: string; saveLabel: string; isSubmitting: boolean; isDirty: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>; children: ReactNode;
}) {
  const { trackDirty, close, message } = useCatalogEditor();
  useEffect(() => { trackDirty(isDirty); }, [trackDirty, isDirty]);
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
  const label = isSubmitting ? "Čuvanje…" : saveLabel;
  return <form className="entry-form" onSubmit={onSubmit}>
    <EntryFormHeader title={title} description={description} saveLabel={label} isSubmitting={isSubmitting} onClose={close} />
    <p role="status" className="entry-save-status">{message}</p>
    <div className="form-scroll"><fieldset disabled={isSubmitting} className="min-w-0">{children}</fieldset></div>
    <footer className="form-footer"><button type="submit" className="primary" disabled={isSubmitting}>{label}</button></footer>
  </form>;
}
