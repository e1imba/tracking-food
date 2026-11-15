"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createMeal } from "../../app/actions/meals";
import { localDateTime, localTimeToInstant, mealFormSchema, nameSchema, normalizeFoodName, type MealFormValues } from "./schema";

export function MealForm({ catalog, onDirtyChange, onSavingChange, onSuccess }: {
  catalog: { id: string; name: string }[];
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting, dirtyFields } } = useForm<MealFormValues>({
    resolver: zodResolver(mealFormSchema), defaultValues: { name: "", note: "", localTime: "" },
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [newFoods, setNewFoods] = useState<string[]>([]);
  const [foodName, setFoodName] = useState("");
  const [message, setMessage] = useState("");
  const [initialTime] = useState(() => localDateTime(new Date()));
  useEffect(() => { setValue("localTime", initialTime); }, [setValue, initialTime]);
  const dirty = !!(dirtyFields.name || dirtyFields.note || dirtyFields.localTime || selected.length || newFoods.length || foodName);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onSavingChange(isSubmitting); }, [isSubmitting, onSavingChange]);
  // A tab close/refresh deserves the same protection as closing the panel.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const query = normalizeFoodName(foodName);
  const matches = query ? catalog.filter(food => normalizeFoodName(food.name).includes(query)) : [];

  function addFood() {
    const parsed = nameSchema.safeParse(foodName);
    if (!parsed.success) { setMessage("Unesite naziv namirnice (do 200 znakova)."); return; }
    const normalized = normalizeFoodName(parsed.data);
    const existing = catalog.find(food => normalizeFoodName(food.name) === normalized);
    if (existing) setSelected(ids => [...new Set([...ids, existing.id])]);
    else if (!newFoods.some(name => normalizeFoodName(name) === normalized)) setNewFoods([...newFoods, parsed.data]);
    setFoodName(""); setMessage("");
  }
  return <form className="meal-form" onSubmit={handleSubmit(async values => {
    setMessage("");
    onSavingChange(true);
    try {
      const result = await createMeal({ name: values.name, note: values.note, occurredAt: localTimeToInstant(values.localTime), foodIds: selected, newFoods });
      if (result.ok) { router.refresh(); onSuccess(); }
      else setMessage(result.message);
    } catch { setMessage("Obrok nije sačuvan. Proverite lokalni datum i vreme i pokušajte ponovo."); }
    finally { onSavingChange(false); }
  })}>
    <div className="form-scroll"><fieldset disabled={isSubmitting} className="min-w-0">
      <label className="field">Naziv obroka<input {...register("name")} required maxLength={200} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} autoFocus className="control" />{errors.name && <span id="name-error" role="alert">Unesite naziv (do 200 znakova).</span>}</label>
      <label className="field">Datum i vreme<input {...register("localTime")} type="datetime-local" required aria-invalid={!!errors.localTime} aria-describedby="time-help" className="control" />{errors.localTime && <span role="alert">Unesite datum i vreme.</span>}</label>
      <p id="time-help" className="field-help">Lokalno vreme vašeg uređaja. Možete uneti raniji obrok.</p>
      <fieldset className="foods-field"><legend>Namirnice <span>(opciono)</span></legend>
        <div className="selected-foods" aria-label="Izabrane namirnice">
          {catalog.filter(food => selected.includes(food.id)).map(food => <button type="button" key={food.id} className="food-chip" aria-label={`Ukloni ${food.name}`} onClick={() => setSelected(selected.filter(id => id !== food.id))}>{food.name}<span aria-hidden="true">×</span></button>)}
          {newFoods.map(name => <button type="button" key={name} className="food-chip" aria-label={`Ukloni ${name}`} onClick={() => setNewFoods(newFoods.filter(food => food !== name))}>{name} (nova)<span aria-hidden="true">×</span></button>)}
        </div>
        <label className="field">Pretraži ili dodaj namirnicu<input value={foodName} onChange={event => setFoodName(event.target.value)} maxLength={200} className="control" aria-describedby="foods-help" /></label>
        {query && <div className="food-results" aria-label="Rezultati pretrage namirnica">{matches.map(food => <label key={food.id}><input type="checkbox" checked={selected.includes(food.id)} onChange={event => setSelected(event.target.checked ? [...selected, food.id] : selected.filter(id => id !== food.id))} /><span>{food.name}</span></label>)}{!matches.length && <p>Nema pronađenih namirnica.</p>}</div>}
        {foodName.trim() && <button type="button" onClick={addFood} className="secondary">Dodaj namirnicu</button>}
        <p id="foods-help" className="field-help">{catalog.length === 0 ? "Katalog je prazan. Dodajte prvu namirnicu ili sačuvajte samo naziv obroka. " : "Pretražite katalog i označite više namirnica. "}Nove namirnice se čuvaju zajedno sa obrokom. Najviše 100 po obroku.</p>
      </fieldset>
      <label className="field">Napomena (opciono)<textarea {...register("note")} maxLength={5000} rows={3} className="control" aria-invalid={!!errors.note} />{errors.note && <span role="alert">Napomena može imati do 5000 znakova.</span>}</label>
    </fieldset></div>
    <footer className="form-footer"><p role="status">{message}</p><button className="primary" disabled={isSubmitting} type="submit">{isSubmitting ? "Čuvanje…" : "Sačuvaj obrok"}</button></footer>
  </form>;
}
