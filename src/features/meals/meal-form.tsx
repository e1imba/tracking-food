"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createMeal } from "../../app/actions/meals";
import { localDateTime, localTimeToInstant, mealFormSchema, nameSchema, normalizeFoodName, type MealFormValues } from "./schema";

const control = "mt-1 min-h-12 w-full rounded-lg border border-stone-300 bg-white p-3";
const button = "min-h-12 rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white disabled:opacity-50";

export function MealForm({ catalog }: { catalog: { id: string; name: string }[] }) {
  const router = useRouter();
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<MealFormValues>({
    resolver: zodResolver(mealFormSchema), defaultValues: { name: "", note: "", localTime: "" },
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [newFoods, setNewFoods] = useState<string[]>([]);
  const [foodName, setFoodName] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { setValue("localTime", localDateTime(new Date())); }, [setValue]);

  function addFood() {
    const parsed = nameSchema.safeParse(foodName);
    if (!parsed.success) { setMessage("Unesite naziv namirnice (do 200 znakova)."); return; }
    const normalized = normalizeFoodName(parsed.data);
    const existing = catalog.find((food) => normalizeFoodName(food.name) === normalized);
    if (existing) setSelected((ids) => [...new Set([...ids, existing.id])]);
    else if (!newFoods.some((name) => normalizeFoodName(name) === normalized)) setNewFoods([...newFoods, parsed.data]);
    setFoodName("");
    setMessage("");
  }

  return <form onSubmit={handleSubmit(async (values) => {
    setMessage("");
    try {
      const occurredAt = localTimeToInstant(values.localTime);
      const result = await createMeal({ name: values.name, note: values.note, occurredAt, foodIds: selected, newFoods });
      setMessage(result.message);
      if (result.ok) {
        reset({ name: "", note: "", localTime: localDateTime(new Date()) });
        setSelected([]); setNewFoods([]); setFoodName("");
        router.refresh();
      }
    } catch {
      setMessage("Obrok nije sačuvan. Proverite lokalni datum i vreme i pokušajte ponovo.");
    }
  })} className="space-y-5">
    <fieldset disabled={isSubmitting} className="min-w-0 space-y-5">
      <legend className="text-xl font-semibold">Novi obrok</legend>
      <label className="block">Naziv obroka
        <input {...register("name")} required maxLength={200} className={control} />
        {errors.name && <span role="alert">Unesite naziv (do 200 znakova).</span>}
      </label>
      <label className="block">Datum i vreme
        <input {...register("localTime")} type="datetime-local" required className={control} />
        {errors.localTime && <span role="alert">Unesite datum i vreme.</span>}
      </label>
      <p className="text-sm text-stone-600">Lokalno vreme vašeg uređaja. Možete uneti raniji obrok.</p>
      <fieldset className="min-w-0 space-y-2">
        <legend className="font-semibold">Namirnice (opciono)</legend>
        {catalog.length === 0 && <p className="text-stone-600">Katalog je prazan. Dodajte prvu namirnicu ispod ili sačuvajte samo naziv obroka.</p>}
        {catalog.map((food) => <label key={food.id} className="flex min-h-11 items-center gap-3 break-words">
          <input type="checkbox" checked={selected.includes(food.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, food.id] : selected.filter((id) => id !== food.id))} />{food.name}
        </label>)}
        {newFoods.map((name) => <label key={name} className="flex min-h-11 items-center gap-3 break-words">
          <input type="checkbox" checked onChange={() => setNewFoods(newFoods.filter((food) => food !== name))} />{name} (nova)
        </label>)}
        <label className="block">Nova namirnica
          <input value={foodName} onChange={(e) => setFoodName(e.target.value)} maxLength={200} className={control} />
        </label>
        <button type="button" onClick={addFood} className="min-h-12 rounded-lg border border-emerald-800 px-4 text-emerald-900">Dodaj namirnicu</button>
        <p className="text-sm text-stone-600">Nova namirnica se čuva zajedno sa obrokom. Najviše 100 namirnica po obroku.</p>
      </fieldset>
      <label className="block">Napomena (opciono)
        <textarea {...register("note")} maxLength={5000} rows={4} className={control} />
        {errors.note && <span role="alert">Napomena može imati do 5000 znakova.</span>}
      </label>
      <button className={button} type="submit">{isSubmitting ? "Čuvanje…" : "Sačuvaj obrok"}</button>
    </fieldset>
    <p role="status" className="text-sm">{message}</p>
  </form>;
}
