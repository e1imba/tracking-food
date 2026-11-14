"use client";

import { useSyncExternalStore } from "react";
const subscribe = () => () => {};

export function LocalTime({ instant }: { instant: string }) {
  const text = useSyncExternalStore(subscribe,
    () => new Intl.DateTimeFormat("sr-Latn", { dateStyle: "medium", timeStyle: "short" }).format(new Date(instant)),
    () => instant);
  return <time dateTime={instant}>{text}</time>;
}
