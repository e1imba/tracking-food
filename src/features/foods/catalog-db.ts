import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { foods, users } from "../../lib/db/schema";
import { normalizeFoodName } from "../meals/schema";

type Database = ReturnType<typeof getDb>;

// Serialize multi-food writes for the same owner before taking any food row locks.
export async function lockFoodCatalog(db: Pick<Database, "select">, userId: string) {
  await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("no key update");
}

export async function upsertCatalogFoods(db: Pick<Database, "insert">, userId: string, names: string[]) {
  const byName = new Map(names.map(name => [normalizeFoodName(name), name]));
  const additions: { id: string; name: string }[] = [];
  for (const [normalizedName, name] of byName) {
    const [food] = await db.insert(foods).values({ userId, name, normalizedName })
      .onConflictDoUpdate({ target: [foods.userId, foods.normalizedName], set: { normalizedName } })
      .returning({ id: foods.id, name: foods.name });
    additions.push(food);
  }
  return additions;
}
