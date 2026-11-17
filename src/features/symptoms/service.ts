import "server-only";
import { desc, eq } from "drizzle-orm";
import { requireOwner } from "../../lib/auth/require-owner";
import { getDb } from "../../lib/db";
import { symptoms } from "../../lib/db/schema";
import { symptomInputSchema } from "./schema";

export async function readSymptoms() {
  const userId = await requireOwner();
  const rows = await getDb().select({ id: symptoms.id, name: symptoms.name,
    startedAt: symptoms.startedAt, severity: symptoms.severity, note: symptoms.note,
  }).from(symptoms).where(eq(symptoms.userId, userId))
    .orderBy(desc(symptoms.startedAt), desc(symptoms.createdAt), desc(symptoms.id));
  return rows.map(row => ({ ...row, startedAt: row.startedAt.toISOString() }));
}

export async function saveSymptom(input: unknown) {
  const userId = await requireOwner();
  const data = symptomInputSchema.parse(input);
  const [symptom] = await getDb().insert(symptoms).values({
    userId, name: data.name, startedAt: new Date(data.startedAt),
    severity: data.severity, note: data.note,
  }).returning({ id: symptoms.id });
  return symptom.id;
}
