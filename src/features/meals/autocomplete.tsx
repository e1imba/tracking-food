"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type Ref } from "react";

type Option = { id: string; name: string };

export function Autocomplete({ label, value, options, onChange, onSelect, inputProps = {}, emptyMessage, addAction }: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  onSelect: (id: string) => void;
  inputProps?: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> };
  emptyMessage?: string;
  addAction?: { label: string; onAdd: () => void };
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const pointerInProgress = useRef(false);
  const expanded = open && !!value.trim() && (options.length > 0 || !!emptyMessage);
  const activeIndex = active >= 0 && active < options.length ? active : -1;

  // The list is mounted only after opening; scroll after React commits the active option.
  useLayoutEffect(() => {
    if (expanded && activeIndex >= 0) {
      list.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [expanded, activeIndex]);

  useEffect(() => {
    if (!expanded) return;
    let timer: number | undefined;
    const start = () => {
      window.clearTimeout(timer);
      pointerInProgress.current = true;
    };
    const finish = () => {
      window.clearTimeout(timer);
      pointerInProgress.current = false;
      if (!root.current?.contains(document.activeElement)) {
        setOpen(false);
        setActive(-1);
      }
    };
    // Wait for click before collapsing the in-flow list, which may move its target.
    const release = () => { timer = window.setTimeout(finish, 350); };
    document.addEventListener("pointerdown", start, true);
    document.addEventListener("pointerup", release, true);
    document.addEventListener("pointercancel", finish);
    document.addEventListener("click", finish);
    return () => {
      window.clearTimeout(timer);
      pointerInProgress.current = false;
      document.removeEventListener("pointerdown", start, true);
      document.removeEventListener("pointerup", release, true);
      document.removeEventListener("pointercancel", finish);
      document.removeEventListener("click", finish);
    };
  }, [expanded]);

  function choose(index: number) {
    if (!options[index]) return;
    onSelect(options[index].id);
    setOpen(false);
    setActive(-1);
  }

  return <div ref={root} className="autocomplete" onKeyDown={event => {
    if (event.key === "Escape" && expanded) {
      event.preventDefault(); event.stopPropagation();
      event.currentTarget.querySelector("input")?.focus();
      setOpen(false); setActive(-1);
    }
  }} onBlur={event => {
    if (!pointerInProgress.current && !event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false);
      setActive(-1);
    }
  }}>
    <label className="field" htmlFor={id}>{label}</label>
    <div className="autocomplete-input">
      <input {...inputProps} id={id} className={addAction ? "control with-add" : "control"} role="combobox" autoComplete="off"
      value={value} aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? `${id}-list` : undefined}
      aria-activedescendant={expanded && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
      onChange={event => { onChange(event.target.value); setOpen(true); setActive(-1); }}
      onFocus={() => { if (value.trim()) setOpen(true); }}
      onBlur={inputProps.onBlur}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); setOpen(true);
          const next = options.length ? (event.key === "ArrowDown" ? (activeIndex + 1) % options.length : (activeIndex <= 0 ? options.length - 1 : activeIndex - 1)) : -1;
          setActive(next);
        } else if (event.key === "Enter") {
          // An autocomplete Enter never submits the surrounding meal form.
          event.preventDefault();
          if (expanded && activeIndex >= 0) choose(activeIndex);
        }
      }} />
      {addAction && <button type="button" className="icon-button autocomplete-add" aria-label={addAction.label}
        onMouseDown={event => { if (event.button === 0) event.preventDefault(); }}
        onClick={event => {
          event.currentTarget.parentElement?.querySelector("input")?.focus({ preventScroll: true });
          addAction.onAdd();
          setOpen(false);
          setActive(-1);
        }}><span aria-hidden="true">+</span></button>}
    </div>
    {expanded && <div className="autocomplete-dropdown">
      <ul ref={list} id={`${id}-list`} role="listbox" aria-label={label}>
        {options.map((option, index) => <li key={option.id} id={`${id}-option-${index}`} role="option"
          aria-selected={activeIndex === index}
          onMouseDown={event => { if (event.button === 0) event.preventDefault(); }}
          onClick={() => choose(index)}>{option.name}</li>)}
      </ul>
      {!options.length && emptyMessage && <p role="status">{emptyMessage}</p>}
    </div>}
  </div>;
}
