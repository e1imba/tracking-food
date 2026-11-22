import { requireUser } from "../../../lib/auth/require-user";
import { readJournal } from "../../../features/meals/service";
import { MealHistory } from "../../../features/meals/meal-history";
import { latestMealSuggestions } from "../../../features/meals/suggestions";
import { MealEntry } from "../../../features/meals/meal-entry";

export default async function MealsPage() {
  await requireUser();
  const { catalog, history, rulesByFood } = await readJournal();
  return <>
    <header className="page-heading"><p className="eyebrow">Vaš lični dnevnik</p><h1>Obroci</h1><p>Ocene pokazuju usklađenost sa vašim pravilima ishrane.</p></header>
    <section aria-label="Privatna istorija"><MealHistory history={history} rulesByFood={rulesByFood} /></section>
    <MealEntry catalog={catalog} suggestions={latestMealSuggestions(history)} />
  </>;
}
