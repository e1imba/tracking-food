"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createMeal } from "../../app/actions/meals";
import { EntryFormHeader } from "../../components/journal-entry-dialog";
import { localDateTime, localTimeToInstant, mealFormSchema, nameSchema, normalizeFoodName, type MealFormValues } from "./schema";
import { Autocomplete } from "./autocomplete";
import { MEAL_TYPES, suggestedMealType } from "./meal-types";
import { matchingMeals, type MealSuggestion } from "./suggestions";

export function MealForm({ catalog, suggestions, onClose, onDirtyChange, onSavingChange, onSuccess }: {
  catalog: { id: string; name: string }[];
  suggestions: MealSuggestion[];
  onClose: () => void;
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
  const [foodFeedback, setFoodFeedback] = useState("");
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
  const existing = query ? catalog.find(food => normalizeFoodName(food.name) === query) : undefined;
  const alreadyAdded = (existing && selected.includes(existing.id)) || newFoods.some(name => normalizeFoodName(name) === query);
  const limitReached = selected.length + newFoods.length >= 100;
  const foodProblem = alreadyAdded ? "Namirnica je već dodata."
    : limitReached && query ? "Možete dodati najviše 100 namirnica." : "";
  const matches = query ? catalog.filter(food => !selected.includes(food.id) && normalizeFoodName(food.name).includes(query)) : [];

  function selectFood(id: string) {
    if (limitReached) return;
    setSelected(ids => [...new Set([...ids, id])]);
    setFoodName("");
    setFoodFeedback(`Dodato: ${catalog.find(food => food.id === id)?.name}.`);
  }

  function addFood() {
    const parsed = nameSchema.safeParse(foodName);
    if (!parsed.success || existing || alreadyAdded || limitReached) return;
    setNewFoods(names => [...names, parsed.data]);
    setFoodName("");
    setFoodFeedback(`Dodato: ${parsed.data}.`);
  }
  const saveLabel = isSubmitting ? "Čuvanje…" : "Sačuvaj obrok";
  return <form className="entry-form" onSubmit={handleSubmit(async values => {
    setMessage("");
    onSavingChange(true);
    try {
      const result = await createMeal({ name: values.name, mealType: values.mealType, note: values.note, occurredAt: localTimeToInstant(values.localTime), foodIds: selected, newFoods });
      if (result.ok) { router.refresh(); onSuccess(); }
      else setMessage(result.message);
    } catch { setMessage("Obrok nije sačuvan. Proverite lokalni datum i vreme i pokušajte ponovo."); }
    finally { onSavingChange(false); }
  })}>
    <EntryFormHeader title="Novi obrok" description="Sačuvajte obrok u svoj privatni dnevnik."
      saveLabel={saveLabel} isSubmitting={isSubmitting} onClose={onClose} />
    <p className="entry-save-status" role="status">{message}</p>
    <div className="form-scroll"><fieldset disabled={isSubmitting} className="min-w-0">
      <Autocomplete label="Naziv obroka" value={mealName} options={matchingMeals(suggestions, mealName)}
        onChange={value => setValue("name", value, { shouldDirty: true })}
        onSelect={id => {
          const meal = suggestions.find(meal => meal.id === id)!;
          setValue("name", meal.name, { shouldDirty: true });
          setSelected([...meal.foodIds]); setNewFoods([]); setFoodName(""); setFoodFeedback("");
        }} inputProps={{ ...register("name"), required: true, maxLength: 200,
          "aria-invalid": !!errors.name, "aria-describedby": errors.name ? "name-error" : undefined }}
        emptyMessage="Nema ranijih obroka. Možete sačuvati novi naziv." />
      {errors.name && <span id="name-error" role="alert">Unesite naziv (do 200 znakova).</span>}
      <label className="field">Datum i vreme<input {...register("localTime", { onChange: event => {
        if (!manualType) setValue("mealType", suggestedMealType(event.target.value));
      } })} type="datetime-local" required aria-invalid={!!errors.localTime} aria-describedby="time-help" className="control" />{errors.localTime && <span role="alert">Unesite datum i vreme.</span>}</label>
      <p id="time-help" className="field-help">Lokalno vreme vašeg uređaja. Možete uneti raniji obrok.</p>
      <label className="field" htmlFor="meal-type">Tip obroka</label><select id="meal-type" {...register("mealType", { onChange: () => { setManualType(true); } })}
        className="control" aria-invalid={!!errors.mealType}>
        {Object.entries(MEAL_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {!manualType && <button type="button" className="secondary mt-2" onClick={() => setManualType(true)}>
        Zadrži predloženi tip
      </button>}
      {errors.mealType && <span role="alert">Izaberite tip obroka.</span>}
      <fieldset className="foods-field"><legend>Namirnice <span>(opciono)</span></legend>
        <Autocomplete label="Pretraži ili dodaj namirnicu" value={foodName} options={matches}
          onChange={value => { setFoodName(value); setFoodFeedback(""); }} onSelect={selectFood}
          inputProps={{ maxLength: 200, "aria-describedby": "foods-help foods-feedback" }}
          addAction={query && !existing && !alreadyAdded && !limitReached ? { label: "Dodaj namirnicu", onAdd: addFood } : undefined} />
        <p id="foods-feedback" className={foodProblem ? "field-help" : "sr-only"} aria-live="polite">
          {foodProblem || foodFeedback}
        </p>
        <div className="selected-foods" aria-label="Izabrane namirnice">
          {catalog.filter(food => selected.includes(food.id)).map(food => <button type="button" key={food.id} className="food-chip" aria-label={`Ukloni ${food.name}`} onClick={() => { setSelected(selected.filter(id => id !== food.id)); setFoodFeedback(""); }}>{food.name}<span aria-hidden="true">×</span></button>)}
          {newFoods.map(name => <button type="button" key={name} className="food-chip" aria-label={`Ukloni ${name}`} onClick={() => { setNewFoods(newFoods.filter(food => food !== name)); setFoodFeedback(""); }}>{name} (nova)<span aria-hidden="true">×</span></button>)}
        </div>
        <p id="foods-help" className="field-help">Izaberite iz predloga ili dodajte novu namirnicu dugmetom +.</p>
      </fieldset>
      <label className="field">Napomena (opciono)<textarea {...register("note")} maxLength={5000} rows={3} className="control" aria-invalid={!!errors.note} />{errors.note && <span role="alert">Napomena može imati do 5000 znakova.</span>}</label>
    </fieldset></div>
    <footer className="form-footer"><button className="primary" disabled={isSubmitting} type="submit">{saveLabel}</button></footer>
  </form>;
}
