import { z } from "zod";
import { nameSchema } from "../meals/schema";

const severitySchema = z.number().int().min(1).max(10).nullable();
export const symptomInputSchema = z.object({
  name: nameSchema,
  startedAt: z.iso.datetime({ offset: true }),
  severity: severitySchema.optional().transform(value => value ?? null),
  note: z.string().max(5000).optional().transform(value => value?.trim() || null),
});
export const symptomFormSchema = z.object({
  name: nameSchema,
  localTime: z.string().min(1),
  severity: z.string().refine(value => value === "" || /^(?:[1-9]|10)$/.test(value)),
  note: z.string().max(5000),
});
export type SymptomFormValues = z.infer<typeof symptomFormSchema>;
