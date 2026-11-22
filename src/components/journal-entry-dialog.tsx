"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

function revealFocusedField(dialog: HTMLDivElement) {
  const scroll = dialog.querySelector<HTMLElement>(".form-scroll");
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

export function JournalEntryDialogContent({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDivElement>(null);
  const attachDialog = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    dialog.current = element;
    const viewport = window.visualViewport;
    const updateViewport = () => {
      if (!viewport) return;
      element.style.setProperty("--visible-height", `${viewport.height}px`);
      element.style.setProperty("--visible-top", `${viewport.offsetTop}px`);
      revealFocusedField(element);
    };
    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    return () => {
      dialog.current = null;
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
    };
  }, []);

  return <DialogContent ref={attachDialog} className="entry-dialog"
    onInteractOutside={event => event.preventDefault()}
    onOpenAutoFocus={event => {
      const headerSave = dialog.current?.querySelector(".entry-save-mobile");
      const selector = headerSave?.getClientRects().length ? "h2" : '[data-entry-autofocus], input[name="name"]';
      const target = dialog.current?.querySelector<HTMLElement>(selector);
      if (target) {
        event.preventDefault();
        target.focus({ preventScroll: true });
      }
    }}
    onFocusCapture={event => revealFocusedField(event.currentTarget)}
    onInput={event => {
      if (event.target instanceof HTMLInputElement && event.target.getAttribute("role") === "combobox") {
        const element = event.currentTarget;
        requestAnimationFrame(() => {
          if (element.isConnected) revealFocusedField(element);
        });
      }
    }}>
    {children}
  </DialogContent>;
}

export function EntryFormHeader({ title, description, saveLabel, isSubmitting, onClose }: {
  title: string;
  description: string;
  saveLabel: string;
  isSubmitting: boolean;
  onClose: () => void;
}) {
  return <header className="panel-heading">
    <div>
      <DialogTitle tabIndex={-1}>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </div>
    <button className="icon-button" type="button" aria-label="Zatvori unos" onClick={onClose}>×</button>
    <button className="primary entry-save-mobile" aria-label={saveLabel} disabled={isSubmitting} type="submit">
      {isSubmitting ? saveLabel : "Sačuvaj"}
    </button>
  </header>;
}
