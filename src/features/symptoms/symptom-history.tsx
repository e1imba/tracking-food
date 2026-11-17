"use client";

import { useState, useSyncExternalStore } from "react";
import { LocalTime } from "../meals/local-time";

const subscribe = () => () => {};
type Symptom = { id: string; name: string; severity: number | null; note: string | null; startedAt: string };
function Expandable({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return text.length > 120 ? <details className="expandable" onToggle={event => setExpanded(event.currentTarget.open)}><summary><span className="preview">{text.slice(0, 100)}…</span><span className="show-more">{expanded ? "Prikaži manje" : "Prikaži više"}</span></summary><p className="full-text">{text}</p></details> : <p className="full-text">{text}</p>;
}
export function SymptomHistory({ history }: { history: Symptom[] }) {
  const local = useSyncExternalStore(subscribe, () => true, () => false);
  if (!history.length) return <div className="empty-history"><span aria-hidden="true" className="empty-mark">＋</span><h2>Vaš dnevnik počinje prvim simptomom</h2><p>Još nema sačuvanih simptoma.</p><p>Dodirnite dugme za dodavanje simptoma.</p></div>;
  const groups = new Map<string, Symptom[]>();
  for (const symptom of history) {
    const date = local ? new Intl.DateTimeFormat("sr-Latn", { dateStyle: "full" }).format(new Date(symptom.startedAt)) : symptom.startedAt.slice(0, 10);
    groups.set(date, [...(groups.get(date) ?? []), symptom]);
  }
  return <>
    <div className="desktop-history"><table><caption className="sr-only">Privatna istorija simptoma</caption><thead><tr><th>Početak</th><th>Simptom</th><th>Jačina</th><th>Napomena</th></tr></thead><tbody>{history.map(symptom => <tr key={symptom.id}><td><LocalTime instant={symptom.startedAt} /></td><td className="meal-name">{symptom.name}</td><td>{symptom.severity === null ? "—" : `${symptom.severity}/10`}</td><td><Expandable text={symptom.note || "—"} /></td></tr>)}</tbody></table></div>
    <div className="mobile-history">{[...groups].map(([date, symptoms]) => <section key={date}><h2 className="date-heading">{date}</h2><ol>{symptoms.map(symptom => <li key={symptom.id}><article className="meal-row"><time dateTime={symptom.startedAt}>{local ? new Intl.DateTimeFormat("sr-Latn", { timeStyle: "short" }).format(new Date(symptom.startedAt)) : symptom.startedAt.slice(11, 16)}</time><div><h3>{symptom.name}</h3>{symptom.severity !== null && <p>Jačina: {symptom.severity}/10</p>}{symptom.note && <div className="meal-note"><Expandable text={symptom.note} /></div>}</div></article></li>)}</ol></section>)}</div>
  </>;
}
