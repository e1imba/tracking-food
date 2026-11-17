import { randomUUID } from "node:crypto";
import { afterAll, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
vi.mock("server-only", () => ({}));
vi.mock("../../src/lib/auth/require-user", () => ({ requireUser: vi.fn() }));
import { requireUser } from "../../src/lib/auth/require-user";
import { getDb } from "../../src/lib/db";
import { symptoms, users } from "../../src/lib/db/schema";
import { readSymptoms, saveSymptom } from "../../src/features/symptoms/service";
if (!process.env.TEST_DATABASE_URL || !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test")) throw new Error("Disposable _test database required");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = getDb();
const subjects = [randomUUID(), randomUUID()];
function as(index: number) { vi.mocked(requireUser).mockResolvedValue({ id: subjects[index], email: "synthetic@example.test" }); }
const input = { name: "Sintetički simptom", startedAt: "2026-01-10T12:30:00+01:00" };
afterAll(async () => {
  for (const subject of subjects) {
    const [user] = await db.select().from(users).where(eq(users.googleSub, subject));
    if (!user) continue;
    await db.delete(symptoms).where(eq(symptoms.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  }
  await db.$client.end();
});
it("persists multiple active symptoms, retroactive instants, optional fields and descending history", async () => {
  as(0);
  await Promise.all([readSymptoms(), readSymptoms()]);
  const id = await saveSymptom({ ...input, note: " " });
  await saveSymptom({ ...input, name: "Noviji", startedAt: "2026-01-11T10:00:00Z", severity: 7, note: "  Synthetic <script>  " });
  expect(await readSymptoms()).toEqual([
    expect.objectContaining({ name: "Noviji", severity: 7, note: "Synthetic <script>" }),
    { id, name: input.name, startedAt: "2026-01-10T11:30:00.000Z", severity: null, note: null },
  ]);
  const [user] = await db.select().from(users).where(eq(users.googleSub, subjects[0]));
  expect((await db.select().from(symptoms).where(eq(symptoms.userId, user.id))).every(row => row.endedAt === null)).toBe(true);
});
it("isolates two accounts with the same email and ignores forged ownership/end times", async () => {
  as(0);
  const before = await readSymptoms();
  const [user] = await db.select().from(users).where(eq(users.googleSub, subjects[0]));
  as(1);
  expect(await readSymptoms()).toEqual([]);
  const id = await saveSymptom({ ...input, userId: user.id, endedAt: input.startedAt });
  expect(await readSymptoms()).toHaveLength(1);
  const [saved] = await db.select().from(symptoms).where(eq(symptoms.id, id));
  expect(saved.userId).not.toBe(user.id);
  expect(saved.endedAt).toBeNull();
  as(0);
  expect(await readSymptoms()).toEqual(before);
});
it("rejects invalid data without saving and fails closed without authentication", async () => {
  as(0);
  const before = await readSymptoms();
  await expect(saveSymptom({ ...input, severity: 11 })).rejects.toThrow();
  expect(await readSymptoms()).toEqual(before);
  vi.mocked(requireUser).mockRejectedValue(new Error("redirect login"));
  await expect(readSymptoms()).rejects.toThrow("redirect login");
  await expect(saveSymptom(input)).rejects.toThrow("redirect login");
});
