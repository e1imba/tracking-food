import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { expect, it } from "vitest";

if (!process.env.TEST_DATABASE_URL || !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test")) {
  throw new Error("Set TEST_DATABASE_URL to a disposable database ending in _test");
}

it("upgrades existing meals without changing their contents or inferring historical types", async () => {
  const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  const schema = `migration_${randomUUID().replaceAll("-", "")}`;
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);
    // Isolate the original schema and FK targets from the rest of the test DB.
    await client.query(readFileSync("drizzle/0000_simple_earthquake.sql", "utf8").replaceAll('"public".', `"${schema}".`));
    const { rows: [owner] } = await client.query("INSERT INTO users (google_sub) VALUES ('synthetic-migration') RETURNING id");
    const { rows: [food] } = await client.query("INSERT INTO foods (user_id, name, normalized_name) VALUES ($1, 'Kečap', 'kečap') RETURNING id", [owner.id]);
    const { rows: [meal] } = await client.query("INSERT INTO meals (user_id, name, note, occurred_at) VALUES ($1, 'Sendvič', 'Synthetic note', '2026-01-10T12:00:00Z') RETURNING *", [owner.id]);
    await client.query("INSERT INTO meal_foods (meal_id, food_id, user_id, food_name_snapshot) VALUES ($1, $2, $3, 'Kečap')", [meal.id, food.id, owner.id]);
    const beforeLinks = (await client.query("SELECT * FROM meal_foods")).rows;
    await client.query(readFileSync("drizzle/0001_magical_marvex.sql", "utf8"));
    expect((await client.query("SELECT * FROM meals")).rows).toEqual([{ ...meal, meal_type: null }]);
    expect((await client.query("SELECT * FROM meal_foods")).rows).toEqual(beforeLinks);
    await client.query("SAVEPOINT invalid_type");
    await expect(client.query("UPDATE meals SET meal_type = 'custom' WHERE id = $1", [meal.id])).rejects.toMatchObject({ code: "23514" });
    await client.query("ROLLBACK TO SAVEPOINT invalid_type");
    await client.query("UPDATE meals SET meal_type = 'snack' WHERE id = $1", [meal.id]);
    expect((await client.query("SELECT meal_type FROM meals")).rows[0].meal_type).toBe("snack");
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
