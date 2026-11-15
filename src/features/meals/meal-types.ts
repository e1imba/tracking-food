export const MEAL_TYPES = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
  snack: "Užina",
  other: "Ostalo",
} as const;
export type MealType = keyof typeof MEAL_TYPES;

// Read the wall-clock hour from datetime-local, never a UTC/server hour.
export function suggestedMealType(localTime: string): MealType {
  const hour = Number(localTime.slice(11, 13));
  if (hour >= 4 && hour < 12) return "breakfast";
  if (hour >= 12 && hour < 17) return "lunch";
  if (hour >= 17 && hour < 24) return "dinner";
  return "other";
}
