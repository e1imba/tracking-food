import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { expect, it } from "vitest";

if (!process.env.TEST_DATABASE_URL || !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test")) {
  throw new Error("Set TEST_DATABASE_URL to a disposable database ending in _test");
}

it("adds symptoms without changing existing meals, foods or links", async () => {
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
    const beforeMeals = (await client.query("SELECT * FROM meals")).rows;
    const beforeFoods = (await client.query("SELECT * FROM foods")).rows;
    await client.query(readFileSync("drizzle/0002_tidy_lester.sql", "utf8").replaceAll('"public".', `"${schema}".`));
    expect((await client.query("SELECT * FROM meals")).rows).toEqual(beforeMeals);
    expect((await client.query("SELECT * FROM foods")).rows).toEqual(beforeFoods);
    expect((await client.query("SELECT * FROM meal_foods")).rows).toEqual(beforeLinks);
    for (const severity of [null, 1, 10]) {
      const { rows: [saved] } = await client.query("INSERT INTO symptoms (user_id, name, started_at, severity) VALUES ($1, 'Synthetic', '2026-01-10T12:30:00+01:00', $2) RETURNING *", [owner.id, severity]);
      expect(saved.ended_at).toBeNull();
      expect(saved.started_at.toISOString()).toBe("2026-01-10T11:30:00.000Z");
    }
    for (const [column, value, code] of [["severity", 0, "23514"], ["severity", 11, "23514"], ["ended_at", "2026-01-09T00:00:00Z", "23514"], ["user_id", randomUUID(), "23503"]]) {
      await client.query("SAVEPOINT invalid_value");
      await expect(client.query(`UPDATE symptoms SET ${column} = $1`, [value])).rejects.toMatchObject({ code });
      await client.query("ROLLBACK TO SAVEPOINT invalid_value");
    }
    expect((await client.query("SELECT indexdef FROM pg_indexes WHERE schemaname = $1 AND tablename = 'symptoms'", [schema])).rows.some(row => row.indexdef.includes("user_id, started_at DESC"))).toBe(true);
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
