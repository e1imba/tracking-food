import { z } from "zod";
import { nameSchema } from "../meals/schema";
import { hourInRange } from "./scoring";

export const scoreSchema = z.number().int().min(1).max(5);
const hour = z.number().int().min(0).max(23);
export const timeRangesSchema = z.array(z.object({
  startHour: hour,
  endHour: hour,
  score: scoreSchema,
})).max(24).superRefine((ranges, ctx) => {
  const occupied = new Set<number>();
  for (const range of ranges) {
    if (range.startHour === range.endHour) {
      ctx.addIssue({ code: "custom", message: "Početak i kraj intervala moraju biti različiti." });
      return;
    }
    for (let hour = 0; hour < 24; hour++) {
      if (!hourInRange(hour, range)) continue;
      if (occupied.has(hour)) {
        ctx.addIssue({ code: "custom", message: "Vremenski intervali ne smeju da se preklapaju." });
        return;
      }
      occupied.add(hour);
    }
  }
});

export const foodNameSchema = z.object({ name: nameSchema });

export const foodRulesSchema = z.object({
  groupId: z.uuid().nullable(),
  baseScore: scoreSchema.nullable(),
  timeRanges: timeRangesSchema,
}).refine(({ groupId, baseScore, timeRanges }) => !groupId || (baseScore === null && timeRanges.length === 0), {
  message: "Namirnica u grupi nasleđuje ocene grupe.",
});

export const editFoodSchema = foodRulesSchema.and(z.object({ id: z.uuid() }));

export const groupRulesSchema = z.object({
  name: nameSchema,
  description: z.string().trim().max(200, "Opis može imati do 200 znakova."),
  baseScore: scoreSchema,
  timeRanges: timeRangesSchema,
});

export const saveGroupSchema = groupRulesSchema.extend({
  id: z.uuid().optional(),
  addedFoodIds: z.array(z.uuid()),
  removedFoodIds: z.array(z.uuid()),
  newFoods: z.array(nameSchema).max(100),
});
