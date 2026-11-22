import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { requireOwner } from "../../lib/auth/require-owner";
import { getDb } from "../../lib/db";
import { foodGroups, foods } from "../../lib/db/schema";
import { lockFoodCatalog, upsertCatalogFoods } from "./catalog-db";
import { editFoodSchema, foodNameSchema, saveGroupSchema } from "./schema";

export async function readFoodCatalog() {
  const userId = await requireOwner();
  return getDb().transaction(async tx => {
    const catalog = await tx.select({
      id: foods.id, name: foods.name, groupId: foods.groupId, baseScore: foods.baseScore, timeRanges: foods.timeRanges,
    }).from(foods).where(eq(foods.userId, userId)).orderBy(asc(foods.name), asc(foods.id));
    const groups = await tx.select({
      id: foodGroups.id, name: foodGroups.name, description: foodGroups.description,
      baseScore: foodGroups.baseScore, timeRanges: foodGroups.timeRanges,
    }).from(foodGroups).where(eq(foodGroups.userId, userId)).orderBy(asc(foodGroups.name), asc(foodGroups.id));
    return { catalog, groups };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

export async function addCatalogFood(input: unknown) {
  const userId = await requireOwner();
  const { name } = foodNameSchema.parse(input);
  const [food] = await upsertCatalogFoods(getDb(), userId, [name]);
  return food.id;
}

export async function updateCatalogFood(input: unknown) {
  const userId = await requireOwner();
  const { id, groupId, baseScore, timeRanges } = editFoodSchema.parse(input);
  const db = getDb();
  if (groupId) {
    const [group] = await db.select({ id: foodGroups.id }).from(foodGroups)
      .where(and(eq(foodGroups.userId, userId), eq(foodGroups.id, groupId)));
    if (!group) throw new Error("Invalid group selection");
  }
  const [food] = await db.update(foods).set({ groupId, baseScore, timeRanges, updatedAt: new Date() })
    .where(and(eq(foods.userId, userId), eq(foods.id, id))).returning({ id: foods.id });
  if (!food) throw new Error("Invalid food selection");
}

export async function saveFoodGroup(input: unknown) {
  const userId = await requireOwner();
  const { id, name, description, baseScore, timeRanges, addedFoodIds, removedFoodIds, newFoods } = saveGroupSchema.parse(input);
  return getDb().transaction(async tx => {
    await lockFoodCatalog(tx, userId);
    const selection = [...new Set([...addedFoodIds, ...removedFoodIds])];
    if (selection.length) {
      const owned = await tx.select({ id: foods.id }).from(foods)
        .where(and(eq(foods.userId, userId), inArray(foods.id, selection)));
      if (owned.length !== selection.length) throw new Error("Invalid food selection");
    }

    const values = { name, description: description || null, baseScore, timeRanges, updatedAt: new Date() };
    const [group] = id
      ? await tx.update(foodGroups).set(values).where(and(eq(foodGroups.userId, userId), eq(foodGroups.id, id)))
        .returning({ id: foodGroups.id })
      : await tx.insert(foodGroups).values({ userId, ...values }).returning({ id: foodGroups.id });
    if (!group) throw new Error("Invalid group selection");

    const created = await upsertCatalogFoods(tx, userId, newFoods);
    if (removedFoodIds.length) {
      await tx.update(foods).set({ groupId: null, updatedAt: values.updatedAt })
        .where(and(eq(foods.userId, userId), eq(foods.groupId, group.id), inArray(foods.id, [...new Set(removedFoodIds)])));
    }
    const additions = [...new Set([...addedFoodIds, ...created.map(food => food.id)])];
    if (additions.length) {
      await tx.update(foods).set({ groupId: group.id, baseScore: null, timeRanges: [], updatedAt: values.updatedAt })
        .where(and(eq(foods.userId, userId), inArray(foods.id, additions)));
    }
    return group.id;
  });
}
