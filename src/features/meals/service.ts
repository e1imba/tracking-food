import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { requireOwner } from "../../lib/auth/require-owner";
import { getDb } from "../../lib/db";
import { foodGroups, foods, mealFoods, meals } from "../../lib/db/schema";
import type { MealType } from "./meal-types";
import { mealInputSchema } from "./schema";
import { lockFoodCatalog, upsertCatalogFoods } from "../foods/catalog-db";
import type { ScoringRules } from "../foods/scoring";

export async function readJournal() {
  const userId = await requireOwner();
  const db = getDb();
  const rows = await db.select({
    id: meals.id, name: meals.name, mealType: meals.mealType, note: meals.note, occurredAt: meals.occurredAt,
    food: mealFoods.foodNameSnapshot, foodId: mealFoods.foodId,
  }).from(meals).leftJoin(mealFoods, and(eq(mealFoods.mealId, meals.id), eq(mealFoods.userId, userId)))
    .where(eq(meals.userId, userId)).orderBy(desc(meals.occurredAt), desc(meals.createdAt), desc(meals.id), asc(mealFoods.foodNameSnapshot));
  const history: { id: string; name: string; mealType: MealType | null; note: string | null; occurredAt: string; foods: string[]; foodIds: string[] }[] = [];
  for (const row of rows) {
    let meal = history[history.length - 1];
    if (meal?.id !== row.id) {
      meal = { id: row.id, name: row.name, mealType: row.mealType, note: row.note, occurredAt: row.occurredAt.toISOString(), foods: [], foodIds: [] };
      history.push(meal);
    }
    if (row.food !== null && row.foodId !== null) { meal.foods.push(row.food); meal.foodIds.push(row.foodId); }
  }
  // Read rules after the links so even concurrently added catalog entries can be resolved.
  const catalogRows = await db.select({
    id: foods.id, name: foods.name, baseScore: foods.baseScore, timeRanges: foods.timeRanges,
    groupScore: foodGroups.baseScore, groupRanges: foodGroups.timeRanges,
  }).from(foods).leftJoin(foodGroups, and(eq(foods.groupId, foodGroups.id), eq(foodGroups.userId, userId)))
    .where(eq(foods.userId, userId)).orderBy(asc(foods.name));
  const rulesByFood: Record<string, ScoringRules> = {};
  const linkedIds = new Set(history.flatMap(meal => meal.foodIds));
  for (const food of catalogRows) {
    const baseScore = food.groupScore ?? food.baseScore;
    const timeRanges = food.groupRanges ?? food.timeRanges;
    if (linkedIds.has(food.id) && (baseScore !== null || timeRanges.length)) {
      rulesByFood[food.id] = { baseScore, timeRanges };
    }
  }
  return { catalog: catalogRows.map(({ id, name }) => ({ id, name })), history, rulesByFood };
}

export async function saveMeal(input: unknown) {
  const userId = await requireOwner();
  const data = mealInputSchema.parse(input);
  return getDb().transaction(async (tx) => {
    const selected = new Map<string, { id: string; name: string }>();
    const ids = [...new Set(data.foodIds)];
    // The foreign key on mealFoods also takes locks on existing catalog rows.
    if (ids.length || data.newFoods.length) await lockFoodCatalog(tx, userId);
    if (ids.length) {
      const owned = await tx.select({ id: foods.id, name: foods.name }).from(foods)
        .where(and(eq(foods.userId, userId), inArray(foods.id, ids)));
      if (owned.length !== ids.length) throw new Error("Invalid food selection");
      for (const food of owned) selected.set(food.id, food);
    }
    if (data.newFoods.length) {
      for (const food of await upsertCatalogFoods(tx, userId, data.newFoods)) selected.set(food.id, food);
    }
    const [meal] = await tx.insert(meals).values({ userId, name: data.name, mealType: data.mealType, note: data.note, occurredAt: new Date(data.occurredAt) })
      .returning({ id: meals.id });
    if (selected.size) await tx.insert(mealFoods).values([...selected.values()].map((food) => ({
      userId, mealId: meal.id, foodId: food.id, foodNameSnapshot: food.name,
    })));
    return meal.id;
  });
}
