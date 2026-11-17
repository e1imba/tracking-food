import { sql } from "drizzle-orm";
import type { MealType } from "../../features/meals/meal-types";
import { check, foreignKey, index, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  googleSub: text("google_sub").notNull().unique(),
  email: text(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const foods = pgTable("foods", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: text().notNull(),
  normalizedName: text("normalized_name").notNull(),
  ...timestamps,
}, (t) => [unique().on(t.userId, t.normalizedName), unique().on(t.id, t.userId)]);

export const meals = pgTable("meals", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: text().notNull(),
  mealType: text("meal_type").$type<MealType>(),
  note: text(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  ...timestamps,
}, (t) => [index().on(t.userId, t.occurredAt.desc()), unique().on(t.id, t.userId),
  check("meals_meal_type_check", sql`${t.mealType} IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')`),
]);

export const mealFoods = pgTable("meal_foods", {
  mealId: uuid("meal_id").notNull(),
  foodId: uuid("food_id").notNull(),
  userId: uuid("user_id").notNull(),
  foodNameSnapshot: text("food_name_snapshot").notNull(),
}, (t) => [
  primaryKey({ columns: [t.mealId, t.foodId] }),
  foreignKey({ columns: [t.mealId, t.userId], foreignColumns: [meals.id, meals.userId] }).onDelete("cascade"),
  foreignKey({ columns: [t.foodId, t.userId], foreignColumns: [foods.id, foods.userId] }),
]);

export const symptoms = pgTable("symptoms", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: text().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  severity: integer(),
  note: text(),
  ...timestamps,
}, (t) => [
  index().on(t.userId, t.startedAt.desc()),
  check("symptoms_severity_check", sql`${t.severity} BETWEEN 1 AND 10`),
  check("symptoms_end_check", sql`${t.endedAt} IS NULL OR ${t.endedAt} >= ${t.startedAt}`),
]);
