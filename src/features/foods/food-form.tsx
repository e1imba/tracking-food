"use client";

import type { z } from "zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFood, editFood } from "../../app/actions/foods";
import { CatalogForm, useCatalogEditor } from "./catalog-dialog";
import { BaseScoreField, TimeRangeFields } from "./editor-fields";
import { foodNameSchema, foodRulesSchema } from "./schema";
import type { readFoodCatalog } from "./service";

type Catalog = Awaited<ReturnType<typeof readFoodCatalog>>;
type FoodRules = z.infer<typeof foodRulesSchema>;

export function NewFoodForm() {
  const { submit } = useCatalogEditor();
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<z.infer<typeof foodNameSchema>>({
    resolver: zodResolver(foodNameSchema),
    defaultValues: { name: "" },
  });
  return <CatalogForm title="Nova namirnica" description="Dodajte namirnicu dostupnu i u unosu obroka."
    saveLabel="Sačuvaj namirnicu" isSubmitting={isSubmitting} isDirty={isDirty}
    onSubmit={handleSubmit(values => submit(() => createFood(values)))}>
    <label className="field">Naziv namirnice
      <input {...register("name")} className="control" required maxLength={200} aria-invalid={!!errors.name} />
    </label>
    {errors.name && <p role="alert" className="catalog-error">Unesite naziv namirnice (do 200 znakova).</p>}
  </CatalogForm>;
}

export function FoodForm({ food, groups }: {
  food: Catalog["catalog"][number]; groups: Catalog["groups"];
}) {
  const { submit } = useCatalogEditor();
  const { register, handleSubmit, control, setValue, clearErrors, formState: { errors, isSubmitting, isDirty } } = useForm<FoodRules>({
    resolver: zodResolver(foodRulesSchema),
    defaultValues: { groupId: food.groupId, baseScore: food.baseScore, timeRanges: food.timeRanges },
  });
  const ranges = useFieldArray({ control, name: "timeRanges" });
  const groupId = useWatch({ control, name: "groupId" });
  return <CatalogForm title="Uredi namirnicu" description="Podesite grupu ili samostalnu ocenu."
    saveLabel="Sačuvaj namirnicu" isSubmitting={isSubmitting} isDirty={isDirty}
    onSubmit={handleSubmit(values => submit(() => editFood({ id: food.id, ...values })))}>
    <p className="catalog-title">{food.name}</p>
    <label className="field">Grupa
      <select {...register("groupId", {
        setValueAs: value => value || null,
        onChange: event => {
          if (event.target.value) {
            setValue("baseScore", null, { shouldDirty: true });
            setValue("timeRanges", [], { shouldDirty: true });
            clearErrors(["baseScore", "timeRanges"]);
          }
        },
      })} data-entry-autofocus className="control" defaultValue={food.groupId ?? ""}>
        <option value="">Bez grupe</option>
        {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
      </select>
    </label>
    {groupId ? <p className="field-help">Namirnica preuzima ocene grupe. Prethodna samostalna pravila se uklanjaju pri čuvanju.</p> : <>
      <BaseScoreField optional input={register("baseScore", { setValueAs: value => value == null || value === "" ? null : Number(value) })} error={errors.baseScore} />
      <TimeRangeFields ranges={ranges} register={register} error={errors.timeRanges?.message ?? errors.timeRanges?.root?.message} />
    </>}
  </CatalogForm>;
}
