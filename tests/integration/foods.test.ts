import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../src/lib/auth/require-user", () => ({ requireUser: vi.fn() }));
import { addCatalogFood, readFoodCatalog, saveFoodGroup, updateCatalogFood } from "../../src/features/foods/service";
import { localHourClock, mealScore } from "../../src/features/foods/scoring";
import { readJournal, saveMeal } from "../../src/features/meals/service";
import { requireUser } from "../../src/lib/auth/require-user";
import { getDb } from "../../src/lib/db";
import { foodGroups, foods, meals, users } from "../../src/lib/db/schema";

if (!process.env.TEST_DATABASE_URL || !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test")) {
  throw new Error("Set TEST_DATABASE_URL to a disposable database ending in _test");
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = getDb();
const subjects = Array.from({ length: 5 }, () => `synthetic-foods-${randomUUID()}`);
const as = (index: number) => vi.mocked(requireUser).mockResolvedValue({ id: subjects[index], email: "same@example.test" });
const group = { name: "Mlečni proizvodi", description: "Sintetička grupa", baseScore: 2, timeRanges: [{ startHour: 17, endHour: 4, score: 5 }], addedFoodIds: [], removedFoodIds: [], newFoods: [] };
const meal = { name: "Sintetička večera", mealType: "breakfast", occurredAt: "2026-01-15T23:15:00Z", foodIds: [], newFoods: [] };
const ungrouped = { groupId: null, baseScore: null, timeRanges: [] };

afterAll(async () => {
  for (const sub of subjects) {
    const [user] = await db.select().from(users).where(eq(users.googleSub, sub));
    if (!user) continue;
    await db.delete(meals).where(eq(meals.userId, user.id));
    await db.delete(foods).where(eq(foods.userId, user.id));
    await db.delete(foodGroups).where(eq(foodGroups.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  }
  await db.$client.end();
});

it("shares normalized foods across all creation flows and recomputes old meals from live rules", async () => {
  as(0);
  const yoghurt = await addCatalogFood({ name: "Jogurt" });
  expect(await addCatalogFood({ name: "  ＪOGURT  " })).toBe(yoghurt);
  const rice = await addCatalogFood({ name: "Pirinač" });
  await saveMeal({ ...meal, foodIds: [yoghurt, rice], newFoods: ["  JOGURT ", "Krastavac"] });
  const original = (await readJournal()).history[0];
  const score = async () => {
    const { history, rulesByFood } = await readJournal();
    expect(history[0]).toEqual(original);
    return mealScore(original.occurredAt, original.foodIds.map(id => rulesByFood[id]), localHourClock("Europe/Belgrade"));
  };
  expect(await score()).toEqual({ average: null, rated: 0, total: 3 });

  await updateCatalogFood({ ...ungrouped, id: rice, baseScore: 2 });
  const dairy = await saveFoodGroup({ ...group, addedFoodIds: [yoghurt], newFoods: ["Sir", "jogurt"] });
  expect((await readFoodCatalog()).catalog.map(food => food.name)).toEqual(["Jogurt", "Krastavac", "Pirinač", "Sir"]);
  expect((await readJournal()).catalog.find(food => food.name === "Jogurt")?.id).toBe(yoghurt);
  expect(await score()).toEqual({ average: 3.5, rated: 2, total: 3 });

  await saveFoodGroup({ ...group, id: dairy, timeRanges: [], baseScore: 4 });
  expect(await score()).toEqual({ average: 3, rated: 2, total: 3 });
  const second = await saveFoodGroup({ ...group, name: "Druga grupa", baseScore: 1, timeRanges: [], addedFoodIds: [yoghurt, rice] });
  await saveFoodGroup({ ...group, id: dairy, removedFoodIds: [yoghurt] }); // stale removal must not detach the new membership
  expect((await readFoodCatalog()).catalog.find(food => food.id === rice)).toMatchObject({ groupId: second, baseScore: null, timeRanges: [] });
  expect(await score()).toEqual({ average: 1, rated: 2, total: 3 });

  await saveFoodGroup({ ...group, id: second, removedFoodIds: [yoghurt, rice] });
  expect(await score()).toEqual({ average: null, rated: 0, total: 3 });
  await updateCatalogFood({ ...ungrouped, id: yoghurt, timeRanges: [{ startHour: 0, endHour: 1, score: 4 }] });
  expect(await score()).toEqual({ average: 4, rated: 1, total: 3 });
});

it("fails closed for two accounts and enforces ownership at the database boundary", async () => {
  as(1);
  const ownFood = await addCatalogFood({ name: "Privatna namirnica" });
  const ownGroup = await saveFoodGroup({ ...group, addedFoodIds: [ownFood] });
  await saveMeal({ ...meal, foodIds: [ownFood] });
  const before = await readFoodCatalog();
  as(2);
  expect(await readFoodCatalog()).toEqual({ catalog: [], groups: [] });
  expect((await readJournal()).rulesByFood).toEqual({});
  const otherFood = await addCatalogFood({ name: "Privatna namirnica" });
  expect(otherFood).not.toBe(ownFood);
  const otherGroup = await saveFoodGroup({ ...group, description: "" });

  await expect(updateCatalogFood({ ...ungrouped, id: ownFood, baseScore: 1 })).rejects.toThrow();
  await expect(updateCatalogFood({ ...ungrouped, id: otherFood, groupId: ownGroup })).rejects.toThrow();
  await expect(saveFoodGroup({ ...group, id: ownGroup })).rejects.toThrow();
  await expect(saveFoodGroup({ ...group, id: otherGroup, addedFoodIds: [ownFood], newFoods: ["Ne čuvaj"] })).rejects.toThrow();
  await expect(saveFoodGroup({ ...group, id: otherGroup, removedFoodIds: [ownFood] })).rejects.toThrow();
  await expect(saveMeal({ ...meal, foodIds: [ownFood] })).rejects.toThrow();
  await expect(db.update(foods).set({ groupId: ownGroup }).where(eq(foods.id, otherFood))).rejects.toThrow();

  expect((await readFoodCatalog()).catalog).toMatchObject([{ id: otherFood, groupId: null }]);
  as(1);
  expect(await readFoodCatalog()).toEqual(before);
  expect((await readJournal()).history).toHaveLength(1);
});

it("keeps one catalog row during concurrent creation and rejects unauthenticated operations", async () => {
  as(3);
  await Promise.all([
    addCatalogFood({ name: "Zajednička" }),
    saveMeal({ ...meal, newFoods: ["ZAJEDNIČKA"] }),
    saveFoodGroup({ ...group, newFoods: ["  zajednička "] }),
  ]);
  const { catalog, groups } = await readFoodCatalog();
  expect(catalog).toHaveLength(1);
  expect(catalog[0].groupId).toBe(groups[0].id);
  expect((await readJournal()).history[0].foodIds).toEqual([catalog[0].id]);
  vi.mocked(requireUser).mockRejectedValue(new Error("redirect login"));
  await expect(readFoodCatalog()).rejects.toThrow("redirect login");
  await expect(addCatalogFood({ name: "Bez sesije" })).rejects.toThrow("redirect login");
  await expect(updateCatalogFood({ ...ungrouped, id: catalog[0].id })).rejects.toThrow("redirect login");
  await expect(saveFoodGroup(group)).rejects.toThrow("redirect login");
});

it("saves a meal with existing foods while a group deduplicates the same foods", async () => {
  as(4);
  const rice = await addCatalogFood({ name: "Pirinač" });
  const yoghurt = await addCatalogFood({ name: "Jogurt" });

  const [mealId, groupId] = await Promise.all([
    saveMeal({ ...meal, foodIds: [rice, yoghurt] }),
    saveFoodGroup({ ...group, newFoods: ["JOGURT", "PIRINAČ"] }),
  ]);

  const { catalog } = await readFoodCatalog();
  expect(catalog).toMatchObject([{ id: yoghurt, groupId }, { id: rice, groupId }]);
  const { history } = await readJournal();
  expect(history).toMatchObject([{ id: mealId, foodIds: [yoghurt, rice] }]);
});
