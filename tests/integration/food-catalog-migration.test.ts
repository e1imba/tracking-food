import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { expect, it } from "vitest";

if (!process.env.TEST_DATABASE_URL || !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test")) {
  throw new Error("Set TEST_DATABASE_URL to a disposable database ending in _test");
}

it("adds food rules without changing existing journal data, keys or snapshots", async () => {
  const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  const schema = `migration_${randomUUID().replaceAll("-", "")}`;
  await client.connect();
  async function applyMigration(file: string) {
    await client.query(readFileSync(`drizzle/${file}.sql`, "utf8").replaceAll('"public".', `"${schema}".`));
  }

  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);
    for (const file of ["0000_simple_earthquake", "0001_magical_marvex", "0002_tidy_lester"]) await applyMigration(file);
    const { rows: [owner] } = await client.query("INSERT INTO users (google_sub) VALUES ('synthetic-food-migration') RETURNING id");
    const { rows: [food] } = await client.query("INSERT INTO foods (user_id, name, normalized_name) VALUES ($1, 'Jogurt', 'jogurt') RETURNING *", [owner.id]);
    const { rows: [meal] } = await client.query("INSERT INTO meals (user_id, name, meal_type, occurred_at) VALUES ($1, 'Sintetički obrok', 'snack', '2026-01-10T12:00:00Z') RETURNING *", [owner.id]);
    const { rows: [link] } = await client.query("INSERT INTO meal_foods (meal_id, food_id, user_id, food_name_snapshot) VALUES ($1, $2, $3, 'Istorijski jogurt') RETURNING *", [meal.id, food.id, owner.id]);
    const { rows: [symptom] } = await client.query("INSERT INTO symptoms (user_id, name, started_at) VALUES ($1, 'Sintetički simptom', now()) RETURNING *", [owner.id]);

    await applyMigration("0003_food_catalog");
    expect((await client.query("SELECT * FROM foods")).rows).toEqual([{ ...food, group_id: null, base_score: null, time_ranges: [] }]);
    expect((await client.query("SELECT * FROM meals")).rows).toEqual([meal]);
    expect((await client.query("SELECT * FROM meal_foods")).rows).toEqual([link]);
    expect((await client.query("SELECT * FROM symptoms")).rows).toEqual([symptom]);
    expect((await client.query("SELECT * FROM food_groups")).rows).toEqual([]);
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
