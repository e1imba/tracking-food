import Link from "next/link";
import { requireUser } from "../../lib/auth/require-user";
import { readJournal } from "../../features/meals/service";
import { MealForm } from "../../features/meals/meal-form";
import { LocalTime } from "../../features/meals/local-time";

export default async function MealsPage() {
  await requireUser();
  const { catalog, history } = await readJournal();
  return <main className="min-h-dvh bg-stone-50 px-4 py-8 text-stone-900 sm:px-8">
    <div className="mx-auto max-w-4xl">
      <Link href="/" className="inline-block min-h-11 text-emerald-800 underline">Početna</Link>
      <h1 className="mb-8 text-3xl font-semibold">Obroci</h1>
      <div className="grid items-start gap-8 md:grid-cols-2">
        <section aria-label="Unos obroka" className="min-w-0 rounded-2xl border border-stone-200 bg-white p-5"><MealForm catalog={catalog} /></section>
        <section aria-labelledby="history" className="min-w-0">
          <h2 id="history" className="mb-4 text-xl font-semibold">Privatna istorija</h2>
          {history.length === 0 && <p>Još nema sačuvanih obroka.</p>}
          <ol className="space-y-4">{history.map((meal) => <li key={meal.id} className="break-words rounded-2xl border border-stone-200 bg-white p-5">
            <article>
              <h3 className="text-lg font-semibold">{meal.name}</h3>
              <p className="mt-1 text-sm text-stone-600"><LocalTime instant={meal.occurredAt} /></p>
              {meal.foods.length > 0 && <ul aria-label="Namirnice obroka" className="mt-3 list-inside list-disc">{meal.foods.map((food, i) => <li key={i}>{food}</li>)}</ul>}
              {meal.note && <p className="mt-3 whitespace-pre-wrap">{meal.note}</p>}
            </article>
          </li>)}</ol>
        </section>
      </div>
    </div>
  </main>;
}
