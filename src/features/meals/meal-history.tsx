"use client";

import { useState, useSyncExternalStore } from "react";
import { LocalTime } from "./local-time";

const subscribe = () => () => {};
type Meal = { id: string; name: string; note: string | null; occurredAt: string; foods: string[] };
function Expandable({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return text.length > 120 ? <details className="expandable" onToggle={event => setExpanded(event.currentTarget.open)}><summary><span className="preview">{text.slice(0, 100)}…</span><span className="show-more">{expanded ? "Prikaži manje" : "Prikaži više"}</span></summary><p className="full-text">{text}</p></details> : <p className="full-text">{text}</p>;
}
export function MealHistory({ history }: { history: Meal[] }) {
  const local = useSyncExternalStore(subscribe, () => true, () => false);
  if (!history.length) return <div className="empty-history"><span aria-hidden="true" className="empty-mark">＋</span><h2>Vaš dnevnik počinje prvim obrokom</h2><p>Još nema sačuvanih obroka.</p><p>Dodirnite dugme za dodavanje obroka.</p></div>;
  const groups = new Map<string, Meal[]>();
  for (const meal of history) {
    const date = local ? new Intl.DateTimeFormat("sr-Latn", { dateStyle: "full" }).format(new Date(meal.occurredAt)) : meal.occurredAt.slice(0, 10);
    groups.set(date, [...(groups.get(date) ?? []), meal]);
  }
  return <>
    <div className="desktop-history"><table><caption className="sr-only">Privatna istorija obroka</caption><thead><tr><th>Datum/vreme</th><th>Obrok</th><th>Namirnice</th><th>Napomena</th></tr></thead><tbody>{history.map(meal => <tr key={meal.id}><td><LocalTime instant={meal.occurredAt} /></td><td className="meal-name">{meal.name}</td><td><Expandable text={meal.foods.join(", ") || "—"} /></td><td><Expandable text={meal.note || "—"} /></td></tr>)}</tbody></table></div>
    <div className="mobile-history">{[...groups].map(([date, meals]) => <section key={date}><h2 className="date-heading">{date}</h2><ol>{meals.map(meal => <li key={meal.id}><article className="meal-row"><time dateTime={meal.occurredAt}>{local ? new Intl.DateTimeFormat("sr-Latn", { timeStyle: "short" }).format(new Date(meal.occurredAt)) : meal.occurredAt.slice(11, 16)}</time><div><h3>{meal.name}</h3>{meal.foods.length > 0 && <Expandable text={meal.foods.join(", ")} />}{meal.note && <div className="meal-note"><Expandable text={meal.note} /></div>}</div></article></li>)}</ol></section>)}</div>
  </>;
}
