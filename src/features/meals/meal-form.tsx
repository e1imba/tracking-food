"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createMeal } from "../../app/actions/meals";
import { localDateTime, localTimeToInstant, mealFormSchema, nameSchema, normalizeFoodName, type MealFormValues } from "./schema";
import { Autocomplete } from "./autocomplete";
import { MEAL_TYPES, suggestedMealType } from "./meal-types";
import { matchingMeals, type MealSuggestion } from "./suggestions";

export function MealForm({ catalog, suggestions, onDirtyChange, onSavingChange, onSuccess }: {
  catalog: { id: string; name: string }[];
  suggestions: MealSuggestion[];
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [initialTime] = useState(() => localDateTime(new Date()));
  const [manualType, setManualType] = useState(false);
  const { register, handleSubmit, setValue, control, formState: { errors, isSubmitting, dirtyFields } } = useForm<MealFormValues>({
    resolver: zodResolver(mealFormSchema), defaultValues: { name: "", note: "", localTime: initialTime, mealType: suggestedMealType(initialTime) },
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [newFoods, setNewFoods] = useState<string[]>([]);
  const [foodName, setFoodName] = useState("");
  const [message, setMessage] = useState("");
  const mealName = useWatch({ control, name: "name" });
  const dirty = !!(manualType || dirtyFields.name || dirtyFields.note || dirtyFields.localTime || dirtyFields.mealType || selected.length || newFoods.length || foodName);
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
  const matches = query ? catalog.filter(food => !selected.includes(food.id) && normalizeFoodName(food.name).includes(query)) : [];

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
      const result = await createMeal({ name: values.name, mealType: values.mealType, note: values.note, occurredAt: localTimeToInstant(values.localTime), foodIds: selected, newFoods });
      if (result.ok) { router.refresh(); onSuccess(); }
      else setMessage(result.message);
    } catch { setMessage("Obrok nije sačuvan. Proverite lokalni datum i vreme i pokušajte ponovo."); }
    finally { onSavingChange(false); }
  })}>
    <div className="form-scroll"><fieldset disabled={isSubmitting} className="min-w-0">
      <Autocomplete label="Naziv obroka" value={mealName} options={matchingMeals(suggestions, mealName)}
        onChange={value => setValue("name", value, { shouldDirty: true })}
        onSelect={id => {
          const meal = suggestions.find(meal => meal.id === id)!;
          setValue("name", meal.name, { shouldDirty: true });
          setSelected([...meal.foodIds]); setNewFoods([]); setFoodName("");
        }} inputProps={{ ...register("name"), required: true, maxLength: 200, autoFocus: true,
          "aria-invalid": !!errors.name, "aria-describedby": errors.name ? "name-error" : undefined }}
        emptyMessage="Nema ranijih obroka. Možete sačuvati novi naziv." />
      {errors.name && <span id="name-error" role="alert">Unesite naziv (do 200 znakova).</span>}
      <label className="field">Datum i vreme<input {...register("localTime", { onChange: event => {
        if (!manualType) setValue("mealType", suggestedMealType(event.target.value));
      } })} type="datetime-local" required aria-invalid={!!errors.localTime} aria-describedby="time-help" className="control" />{errors.localTime && <span role="alert">Unesite datum i vreme.</span>}</label>
      <p id="time-help" className="field-help">Lokalno vreme vašeg uređaja. Možete uneti raniji obrok.</p>
      <label className="field" htmlFor="meal-type">Tip obroka</label><select id="meal-type" {...register("mealType", { onChange: () => { setManualType(true); } })} className="control" aria-invalid={!!errors.mealType}>
        {Object.entries(MEAL_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>{errors.mealType && <span role="alert">Izaberite tip obroka.</span>}
      <fieldset className="foods-field"><legend>Namirnice <span>(opciono)</span></legend>
        <div className="selected-foods" aria-label="Izabrane namirnice">
          {catalog.filter(food => selected.includes(food.id)).map(food => <button type="button" key={food.id} className="food-chip" aria-label={`Ukloni ${food.name}`} onClick={() => setSelected(selected.filter(id => id !== food.id))}>{food.name}<span aria-hidden="true">×</span></button>)}
          {newFoods.map(name => <button type="button" key={name} className="food-chip" aria-label={`Ukloni ${name}`} onClick={() => setNewFoods(newFoods.filter(food => food !== name))}>{name} (nova)<span aria-hidden="true">×</span></button>)}
        </div>
        <Autocomplete label="Pretraži ili dodaj namirnicu" value={foodName} options={matches}
          onChange={setFoodName} onSelect={id => { setSelected(ids => [...new Set([...ids, id])]); setFoodName(""); }}
          inputProps={{ maxLength: 200, "aria-describedby": "foods-help" }} emptyMessage="Nema pronađenih neizabranih namirnica."
          action={<button type="button" onClick={addFood} className="secondary">Dodaj namirnicu</button>} />
        <p id="foods-help" className="field-help">{catalog.length === 0 ? "Katalog je prazan. Dodajte prvu namirnicu ili sačuvajte samo naziv obroka. " : "Pretražite katalog i izaberite namirnice iz predloga. "}Nove namirnice se čuvaju zajedno sa obrokom. Najviše 100 po obroku.</p>
      </fieldset>
      <label className="field">Napomena (opciono)<textarea {...register("note")} maxLength={5000} rows={3} className="control" aria-invalid={!!errors.note} />{errors.note && <span role="alert">Napomena može imati do 5000 znakova.</span>}</label>
    </fieldset></div>
    <footer className="form-footer"><p role="status">{message}</p><button className="primary" disabled={isSubmitting} type="submit">{isSubmitting ? "Čuvanje…" : "Sačuvaj obrok"}</button></footer>
  </form>;
}
