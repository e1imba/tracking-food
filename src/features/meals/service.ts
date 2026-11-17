import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { requireOwner } from "../../lib/auth/require-owner";
import { getDb } from "../../lib/db";
import { foods, mealFoods, meals } from "../../lib/db/schema";
import type { MealType } from "./meal-types";
import { mealInputSchema, normalizeFoodName } from "./schema";

export async function readJournal() {
  const userId = await requireOwner();
  const db = getDb();
  const catalog = await db.select({ id: foods.id, name: foods.name }).from(foods)
    .where(eq(foods.userId, userId)).orderBy(asc(foods.name));
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
  return { catalog, history };
}

export async function saveMeal(input: unknown) {
  const userId = await requireOwner();
  const data = mealInputSchema.parse(input);
  return getDb().transaction(async (tx) => {
    const selected = new Map<string, { id: string; name: string }>();
    const ids = [...new Set(data.foodIds)];
    if (ids.length) {
      const owned = await tx.select({ id: foods.id, name: foods.name }).from(foods)
        .where(and(eq(foods.userId, userId), inArray(foods.id, ids)));
      if (owned.length !== ids.length) throw new Error("Invalid food selection");
      for (const food of owned) selected.set(food.id, food);
    }
    // Stable order avoids lock inversion when two submissions add the same names.
    const additions = new Map(data.newFoods.map((name) => [normalizeFoodName(name), name]));
    for (const [normalizedName, name] of [...additions].sort(([a], [b]) => a.localeCompare(b))) {
      const [food] = await tx.insert(foods).values({ userId, name, normalizedName })
        .onConflictDoUpdate({ target: [foods.userId, foods.normalizedName], set: { normalizedName } })
        .returning({ id: foods.id, name: foods.name });
      selected.set(food.id, food);
    }
    const [meal] = await tx.insert(meals).values({ userId, name: data.name, mealType: data.mealType, note: data.note, occurredAt: new Date(data.occurredAt) })
      .returning({ id: meals.id });
    if (selected.size) await tx.insert(mealFoods).values([...selected.values()].map((food) => ({
      userId, mealId: meal.id, foodId: food.id, foodNameSnapshot: food.name,
    })));
    return meal.id;
  });
}
