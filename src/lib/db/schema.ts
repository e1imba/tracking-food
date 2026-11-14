import { foreignKey, index, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

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
  note: text(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  ...timestamps,
}, (t) => [index().on(t.userId, t.occurredAt.desc()), unique().on(t.id, t.userId)]);

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
