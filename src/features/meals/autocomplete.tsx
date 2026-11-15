"use client";

import { useId, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type Ref, type ReactNode } from "react";

type Option = { id: string; name: string };

export function Autocomplete({ label, value, options, onChange, onSelect, inputProps = {}, emptyMessage, action }: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  onSelect: (id: string) => void;
  inputProps?: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> };
  emptyMessage: string;
  action?: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const list = useRef<HTMLUListElement>(null);
  const expanded = open && !!value.trim();
  const activeIndex = active >= 0 && active < options.length ? active : -1;

  // The list is mounted only after opening; scroll after React commits the active option.
  useLayoutEffect(() => {
    if (expanded && activeIndex >= 0) {
      list.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [expanded, activeIndex]);

  function choose(index: number) {
    if (!options[index]) return;
    onSelect(options[index].id);
    setOpen(false);
    setActive(-1);
  }

  return <div className="autocomplete" onKeyDown={event => {
    if (event.key === "Escape" && expanded) {
      event.preventDefault(); event.stopPropagation();
      event.currentTarget.querySelector("input")?.focus();
      setOpen(false); setActive(-1);
    }
  }} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActive(-1); }
  }}>
    <label className="field" htmlFor={id}>{label}</label>
    <input {...inputProps} id={id} className="control" role="combobox" autoComplete="off"
      value={value} aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-list`}
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
    {expanded && <div className="autocomplete-dropdown" onPointerDown={event => event.preventDefault()}>
      <ul ref={list} id={`${id}-list`} role="listbox" aria-label={label}>
        {options.map((option, index) => <li key={option.id} id={`${id}-option-${index}`} role="option"
          aria-selected={activeIndex === index}
          onClick={() => choose(index)}>{option.name}</li>)}
      </ul>
      {!options.length && <p role="status">{emptyMessage}</p>}
      {action}
    </div>}
  </div>;
}
