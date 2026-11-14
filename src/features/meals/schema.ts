import { z } from "zod";

export const nameSchema = z.string().trim().min(1).max(200);
export function normalizeFoodName(name: string) {
  return name.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}
export const mealInputSchema = z.object({
  name: nameSchema,
  note: z.string().max(5000).optional().transform((value) => value?.trim() || null),
  occurredAt: z.iso.datetime({ offset: true }),
  foodIds: z.array(z.uuid()).max(100),
  newFoods: z.array(nameSchema).max(100),
}).refine((value) => value.foodIds.length + value.newFoods.length <= 100);

export const mealFormSchema = z.object({
  name: nameSchema,
  note: z.string().max(5000),
  localTime: z.string().min(1),
});
export type MealFormValues = z.infer<typeof mealFormSchema>;

export function localDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localTimeToInstant(value: string) {
  const date = new Date(value);
  // Reject invalid calendar dates and nonexistent local times during a DST jump.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || localDateTime(date) !== value) {
    throw new Error("Proverite datum i vreme (uključujući promenu računanja vremena).");
  }
  return date.toISOString();
}
