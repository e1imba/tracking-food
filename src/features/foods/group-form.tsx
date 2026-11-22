"use client";

import { useState } from "react";
import type { z } from "zod";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { editFoodGroup } from "../../app/actions/foods";
import { Autocomplete } from "../meals/autocomplete";
import { nameSchema, normalizeFoodName } from "../meals/schema";
import { CatalogForm, useCatalogEditor } from "./catalog-dialog";
import { BaseScoreField, TimeRangeFields } from "./editor-fields";
import { groupRulesSchema } from "./schema";
import type { readFoodCatalog } from "./service";

type Catalog = Awaited<ReturnType<typeof readFoodCatalog>>;
type GroupFields = z.infer<typeof groupRulesSchema>;

export function GroupForm({ group, catalog }: {
  group?: Catalog["groups"][number]; catalog: Catalog["catalog"];
}) {
  const { submit } = useCatalogEditor();
  const { register, handleSubmit, control, formState: { errors, isSubmitting, isDirty } } = useForm<GroupFields>({
    resolver: zodResolver(groupRulesSchema),
    defaultValues: { name: group?.name ?? "", description: group?.description ?? "", baseScore: group?.baseScore, timeRanges: group?.timeRanges ?? [] },
  });
  const ranges = useFieldArray({ control, name: "timeRanges" });
  const [original] = useState(() => catalog.filter(food => group && food.groupId === group.id).map(food => food.id));
  const [selected, setSelected] = useState(original);
  const [newFoods, setNewFoods] = useState<string[]>([]);
  const [foodName, setFoodName] = useState("");
  const [foodError, setFoodError] = useState("");
  const query = normalizeFoodName(foodName);
  const matches = query ? catalog.filter(food => !selected.includes(food.id) && normalizeFoodName(food.name).includes(query)) : [];
  const addedFoodIds = selected.filter(id => !original.includes(id));
  const removedFoodIds = original.filter(id => !selected.includes(id));

  function selectFood(id: string) {
    setSelected(ids => [...new Set([...ids, id])]);
    setFoodName("");
    setFoodError("");
  }

  function addFood() {
    const parsed = nameSchema.safeParse(foodName);
    if (!parsed.success) {
      setFoodError("Unesite naziv namirnice (do 200 znakova).");
      return;
    }
    const existing = catalog.find(food => normalizeFoodName(food.name) === query);
    if (existing && !selected.includes(existing.id)) {
      selectFood(existing.id);
      return;
    }
    if (existing || newFoods.some(name => normalizeFoodName(name) === query)) {
      setFoodError("Namirnica je već izabrana.");
      return;
    }
    if (newFoods.length >= 100) {
      setFoodError("Možete dodati najviše 100 novih namirnica po čuvanju.");
      return;
    }
    setNewFoods([...newFoods, parsed.data]);
    setFoodName("");
    setFoodError("");
  }

  return <CatalogForm title={group ? "Uredi grupu" : "Nova grupa"} description="Namirnice u grupi dele ista pravila."
    saveLabel="Sačuvaj grupu" isSubmitting={isSubmitting}
    isDirty={isDirty || !!(addedFoodIds.length || removedFoodIds.length || newFoods.length || foodName)}
    onSubmit={handleSubmit(values => submit(() => editFoodGroup({
      ...values, id: group?.id, addedFoodIds, removedFoodIds, newFoods,
    })))}>
    <label className="field">Naziv grupe
      <input {...register("name")} className="control" required maxLength={200} aria-invalid={!!errors.name} />
    </label>
    {errors.name && <p role="alert" className="catalog-error">Unesite naziv grupe (do 200 znakova).</p>}
    <label className="field">Opis (opciono)
      <textarea {...register("description")} className="control" maxLength={200} rows={2} aria-invalid={!!errors.description} />
    </label>
    {errors.description && <p role="alert" className="catalog-error">{errors.description.message}</p>}
    <BaseScoreField input={register("baseScore", { valueAsNumber: true })} error={errors.baseScore} />
    <TimeRangeFields ranges={ranges} register={register} error={errors.timeRanges?.message ?? errors.timeRanges?.root?.message} />
    <fieldset className="foods-field group-members">
      <legend>Namirnice u grupi</legend>
      <Autocomplete label="Pretraži ili dodaj namirnicu" value={foodName} options={matches} onSelect={selectFood}
        onChange={value => { setFoodName(value); setFoodError(""); }}
        inputProps={{ maxLength: 200, "aria-describedby": "group-food-help" }}
        emptyMessage="Nema neizabranih namirnica sa tim nazivom."
        addAction={{ label: "Dodaj namirnicu u grupu", onAdd: addFood }} />
      <p id="group-food-help" className="field-help">Dodavanje premešta namirnicu iz postojeće grupe i zamenjuje njene samostalne ocene. Uklonjena namirnica ostaje u katalogu bez ocene.</p>
      <p className="catalog-error" role="status">{foodError}</p>
      <div className="selected-foods" aria-label="Izabrane namirnice">
        {catalog.filter(food => selected.includes(food.id)).map(food => <button type="button" key={food.id}
          className="food-chip" aria-label={`Ukloni ${food.name}`} onClick={() => setSelected(selected.filter(id => id !== food.id))}>
          {food.name}<span aria-hidden="true">×</span>
        </button>)}
        {newFoods.map(name => <button type="button" key={name} className="food-chip" aria-label={`Ukloni ${name}`}
          onClick={() => setNewFoods(newFoods.filter(food => food !== name))}>{name} (nova)<span aria-hidden="true">×</span>
        </button>)}
      </div>
    </fieldset>
  </CatalogForm>;
}
