import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { and, eq, sql } from "drizzle-orm";

vi.mock("server-only", () => ({}));
vi.mock("../../src/lib/auth/require-user", () => ({ requireUser: vi.fn() }));
import { requireUser } from "../../src/lib/auth/require-user";
import { getDb } from "../../src/lib/db";
import { foods, mealFoods, meals, users } from "../../src/lib/db/schema";
import { readJournal, saveMeal } from "../../src/features/meals/service";

// Refuse implicit fallback to any configured application/production database.
if (!process.env.TEST_DATABASE_URL || !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test")) {
  throw new Error("Set TEST_DATABASE_URL to a disposable database ending in _test");
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = getDb();
const subjectA = `synthetic-a-${randomUUID()}`;
const subjectB = `synthetic-b-${randomUUID()}`;
function as(subject: string) {
  vi.mocked(requireUser).mockResolvedValue({ id: subject, email: "synthetic@example.test" });
}
const input = { name: "Test obrok", occurredAt: "2026-10-25T02:30:00+02:00", foodIds: [], newFoods: [] };

beforeAll(async () => {
  as(subjectA);
  // Both reads start before the first persistent user exists.
  await Promise.all([readJournal(), readJournal()]);
  expect(await db.select().from(users).where(eq(users.googleSub, subjectA))).toHaveLength(1);
});
afterAll(async () => {
  for (const subject of [subjectA, subjectB]) {
    const [user] = await db.select().from(users).where(eq(users.googleSub, subject));
    if (!user) continue;
    await db.delete(meals).where(eq(meals.userId, user.id));
    await db.delete(foods).where(eq(foods.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  }
  await db.$client.end();
});

it("persists name-only meals, nullable notes, exact instants and descending history", async () => {
  as(subjectA);
  await saveMeal({ ...input, note: "   " });
  await saveMeal({ ...input, name: "Noviji", note: "  Sintetička\nnapomena <script>  ", occurredAt: "2026-10-26T08:30:00Z" });
  const { history, catalog } = await readJournal();
  expect(catalog).toEqual([]);
  expect(history.map((m) => m.name)).toEqual(["Noviji", "Test obrok"]);
  expect(history[0].note).toBe("Sintetička\nnapomena <script>");
  expect(history[1]).toMatchObject({ note: null, foods: [], occurredAt: "2026-10-25T00:30:00.000Z" });
});

it("normalizes per-owner catalog, reuses foods and preserves name snapshots", async () => {
  as(subjectA);
  await saveMeal({ ...input, newFoods: ["  Pirinač  ", "PIRINAČ", "Paradajz"] });
  let journal = await readJournal();
  expect(journal.catalog).toHaveLength(2);
  const rice = journal.catalog.find((f) => f.name.toLowerCase() === "pirinač")!;
  await saveMeal({ ...input, foodIds: [rice.id, rice.id], newFoods: ["pirinač"] });
  await db.update(foods).set({ name: "Promenjen naziv" }).where(eq(foods.id, rice.id));
  journal = await readJournal();
  expect(journal.catalog).toHaveLength(2);
  expect(journal.history.filter((m) => m.foods.includes(rice.name))).toHaveLength(2);
});

it("isolates two identities even with the same email and rejects foreign food IDs", async () => {
  as(subjectA);
  const foreign = (await readJournal()).catalog[0];
  as(subjectB);
  expect(await readJournal()).toEqual({ catalog: [], history: [] });
  await expect(saveMeal({ ...input, foodIds: [foreign.id], newFoods: ["Ne sačuvaj"] })).rejects.toThrow();
  expect(await readJournal()).toEqual({ catalog: [], history: [] });
  await saveMeal({ ...input, name: "Samo B", newFoods: [foreign.name] });
  const journalB = await readJournal();
  expect(journalB.history).toHaveLength(1);
  expect(journalB.catalog[0].id).not.toBe(foreign.id);
  as(subjectA);
  expect((await readJournal()).history.some((m) => m.name === "Samo B")).toBe(false);
  // The DB also forbids bypassing the service's owner check.
  const [userB] = await db.select().from(users).where(eq(users.googleSub, subjectB));
  await expect(db.insert(mealFoods).values({ mealId: journalB.history[0].id, userId: userB.id, foodId: foreign.id, foodNameSnapshot: "Invalid" })).rejects.toThrow();
});

it("rolls back new foods and the meal when the final link insert fails", async () => {
  as(subjectA);
  const before = await readJournal();
  // Deliberately fail AFTER both food and meal inserts, on this synthetic owner only.
  const [user] = await db.select().from(users).where(eq(users.googleSub, subjectA));
  await db.execute(sql.raw(`CREATE FUNCTION test_reject_meal_link() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.user_id = '${user.id}'::uuid THEN RAISE EXCEPTION 'synthetic failure'; END IF; RETURN NEW; END $$`));
  await db.execute(sql`CREATE TRIGGER test_reject_meal_link BEFORE INSERT ON meal_foods FOR EACH ROW EXECUTE FUNCTION test_reject_meal_link()`);
  try {
    await expect(saveMeal({ ...input, newFoods: ["Rollback namirnica"] })).rejects.toThrow();
    expect(await readJournal()).toEqual(before);
    expect(await db.select().from(foods).where(and(eq(foods.userId, user.id), eq(foods.normalizedName, "rollback namirnica")))).toEqual([]);
  } finally {
    await db.execute(sql`DROP TRIGGER test_reject_meal_link ON meal_foods`);
    await db.execute(sql`DROP FUNCTION test_reject_meal_link()`);
  }
});

it("concurrent catalog additions resolve to one owner and one food", async () => {
  as(subjectB);
  await Promise.all([saveMeal({ ...input, newFoods: ["Concurrent food"] }), saveMeal({ ...input, newFoods: ["Concurrent food"] })]);
  expect((await db.select().from(users).where(eq(users.googleSub, subjectB)))).toHaveLength(1);
  expect((await readJournal()).catalog.filter((f) => f.name === "Concurrent food")).toHaveLength(1);
});

it("fails closed before reading or writing without a session", async () => {
  vi.mocked(requireUser).mockRejectedValue(new Error("redirect login"));
  await expect(readJournal()).rejects.toThrow("redirect login");
  await expect(saveMeal(input)).rejects.toThrow("redirect login");
});
