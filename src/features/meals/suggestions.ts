import { normalizeFoodName } from "./schema";

export type MealSuggestion = { id: string; name: string; foodIds: string[] };

// Input is owner-scoped and ordered by occurred_at, created_at, id DESC.
export function latestMealSuggestions(history: MealSuggestion[]): MealSuggestion[] {
  const seen = new Set<string>();
  return history.filter(meal => {
    const key = normalizeFoodName(meal.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(({ id, name, foodIds }) => ({ id, name, foodIds }));
}

export function matchingMeals(suggestions: MealSuggestion[], query: string) {
  const prefix = normalizeFoodName(query);
  return prefix ? suggestions.filter(meal => normalizeFoodName(meal.name).startsWith(prefix)) : [];
}
