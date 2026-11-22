"use client";

import { useState, useSyncExternalStore } from "react";
import { localHourClock, mealScore, type ScoringRules } from "../foods/scoring";
import { MEAL_TYPES, type MealType } from "./meal-types";
import { LocalTime } from "./local-time";

const subscribe = () => () => {};
const scoreNumber = new Intl.NumberFormat("sr-Latn", { maximumFractionDigits: 1 });
type Meal = { id: string; name: string; mealType: MealType | null; note: string | null; occurredAt: string; foods: string[]; foodIds: string[] };
type Rating = ReturnType<typeof mealScore> | null;

function Expandable({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return text.length > 120 ? <details className="expandable" onToggle={event => setExpanded(event.currentTarget.open)}><summary><span className="preview">{text.slice(0, 100)}…</span><span className="show-more">{expanded ? "Prikaži manje" : "Prikaži više"}</span></summary><p className="full-text">{text}</p></details> : <p className="full-text">{text}</p>;
}

function MealRating({ rating, mobile = false }: { rating: Rating; mobile?: boolean }) {
  return <p className="meal-rating">
    {mobile && <span className="sr-only">Ocena usklađenosti: </span>}
    {rating === null ? "—" : rating.average === null ? "Nije ocenjeno" : <>
      <strong>{scoreNumber.format(rating.average)}/5</strong> · {rating.rated}/{rating.total} ocenjenih
    </>}
  </p>;
}

export function MealHistory({ history, rulesByFood }: { history: Meal[]; rulesByFood: Record<string, ScoringRules> }) {
  const local = useSyncExternalStore(subscribe, () => true, () => false);
  if (!history.length) return <div className="empty-history"><span aria-hidden="true" className="empty-mark">＋</span><h2>Vaš dnevnik počinje prvim obrokom</h2><p>Još nema sačuvanih obroka.</p><p>Dodirnite dugme za dodavanje obroka.</p></div>;
  const clock = local ? localHourClock() : null;
  const dateFormat = local ? new Intl.DateTimeFormat("sr-Latn", { dateStyle: "full" }) : null;
  const timeFormat = local ? new Intl.DateTimeFormat("sr-Latn", { timeStyle: "short" }) : null;
  const ratings = new Map<string, Rating>();
  const groups = new Map<string, Meal[]>();
  for (const meal of history) {
    const date = dateFormat?.format(new Date(meal.occurredAt)) ?? meal.occurredAt.slice(0, 10);
    const group = groups.get(date);
    if (group) group.push(meal);
    else groups.set(date, [meal]);
    const rules = meal.foodIds.map(id => rulesByFood[id]);
    ratings.set(meal.id, clock ? mealScore(meal.occurredAt, rules, clock)
      : rules.some(Boolean) ? null : { average: null, rated: 0, total: rules.length });
  }
  return <>
    <div className="desktop-history">
      <table>
        <caption className="sr-only">Privatna istorija obroka</caption>
        <thead><tr><th>Datum/vreme</th><th>Obrok</th><th>Namirnice</th><th>Napomena</th><th>Ocena</th></tr></thead>
        <tbody>{history.map(meal => <tr key={meal.id}>
          <td><LocalTime instant={meal.occurredAt} /></td>
          <td className="meal-name">{meal.name}<span className="meal-type">{meal.mealType ? MEAL_TYPES[meal.mealType] : "—"}</span></td>
          <td><Expandable text={meal.foods.join(", ") || "—"} /></td>
          <td><Expandable text={meal.note || "—"} /></td>
          <td><MealRating rating={ratings.get(meal.id) ?? null} /></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="mobile-history">
      {[...groups].map(([date, meals]) => <section key={date}>
        <h2 className="date-heading">{date}</h2>
        <ol>{meals.map(meal => <li key={meal.id}>
          <article className="meal-row">
            <time dateTime={meal.occurredAt}>{timeFormat?.format(new Date(meal.occurredAt)) ?? meal.occurredAt.slice(11, 16)}</time>
            <div>
              <h3>{meal.name}</h3>
              <p className="meal-type">{meal.mealType ? MEAL_TYPES[meal.mealType] : "—"}</p>
              <MealRating rating={ratings.get(meal.id) ?? null} mobile />
              {meal.foods.length > 0 && <Expandable text={meal.foods.join(", ")} />}
              {meal.note && <div className="meal-note"><Expandable text={meal.note} /></div>}
            </div>
          </article>
        </li>)}</ol>
      </section>)}
    </div>
  </>;
}
