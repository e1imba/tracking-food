import { suggestedMealType, MEAL_TYPES } from "../../src/features/meals/meal-types";
import { latestMealSuggestions, matchingMeals } from "../../src/features/meals/suggestions";
import { afterEach, describe, expect, it } from "vitest";
import { localDateTime, localTimeToInstant, mealInputSchema, normalizeFoodName } from "../../src/features/meals/schema";

const input = { mealType: "lunch", name: "Obrok", occurredAt: "2026-11-14T10:00:00Z", foodIds: [], newFoods: [] };
const previousTimezone = process.env.TZ;
afterEach(() => {
  if (previousTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = previousTimezone;
});

describe("meal validation", () => {
  it("accepts a name, type and time, normalizes blank notes to null", () => {
    expect(mealInputSchema.parse(input).note).toBeNull();
    expect(mealInputSchema.parse({ ...input, note: " \n " }).note).toBeNull();
    expect(mealInputSchema.parse({ ...input, note: " Test\ntext " }).note).toBe("Test\ntext");
  });
  it.each([
    { mealType: null }, { mealType: undefined }, { mealType: "Doručak" }, { mealType: "custom" }, { name: " " }, { name: "a".repeat(201) }, { note: "a".repeat(5001) },
    { occurredAt: "2026-02-30T10:00:00Z" }, { occurredAt: "2026-11-14T10:00" },
    { foodIds: ["not-a-uuid"] }, { newFoods: [""] }, { newFoods: Array(101).fill("Food") },
  ])("rejects invalid input %j", (patch) => {
    expect(mealInputSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  });
  it("normalizes whitespace, case and Unicode forms without removing accents", () => {
    expect(normalizeFoodName("  ＰIRINAČ  beli \t")).toBe("pirinač beli");
    expect(normalizeFoodName("Čaj")).not.toBe(normalizeFoodName("Caj"));
  });
});

describe("device-local time conversion", () => {
  it("converts summer and winter times to exact UTC instants", () => {
    process.env.TZ = "Europe/Belgrade";
    expect(localTimeToInstant("2026-07-10T12:30")).toBe("2026-07-10T10:30:00.000Z");
    expect(localTimeToInstant("2026-01-10T12:30")).toBe("2026-01-10T11:30:00.000Z");
    expect(localDateTime(new Date("2026-07-10T10:30:00Z"))).toBe("2026-07-10T12:30");
  });
  it("rejects invalid dates and nonexistent DST times; uses first repeated time", () => {
    process.env.TZ = "Europe/Belgrade";
    expect(() => localTimeToInstant("2026-03-29T02:30")).toThrow();
    expect(() => localTimeToInstant("2026-02-30T12:30")).toThrow();
    expect(localTimeToInstant("2026-10-25T02:30")).toBe("2026-10-25T00:30:00.000Z");
  });
});

describe("meal type suggestion", () => {
  it.each([
    ["00:00", "other"], ["03:59", "other"], ["04:00", "breakfast"], ["11:59", "breakfast"],
    ["12:00", "lunch"], ["16:59", "lunch"], ["17:00", "dinner"], ["23:59", "dinner"],
  ])("uses local %s as %s independently of UTC", (time, type) => {
    process.env.TZ = "Pacific/Honolulu";
    expect(suggestedMealType(`2026-01-10T${time}`)).toBe(type);
  });
  it("accepts exactly the five fixed types for new meals", () => {
    for (const mealType of Object.keys(MEAL_TYPES)) expect(mealInputSchema.safeParse({ ...input, mealType }).success).toBe(true);
  });
});

describe("meal name suggestions", () => {
  const history = [
    { id: "latest", name: "Sendvič", foodIds: ["ketchup"] },
    { id: "distinct", name: "Sendvič sa pavlakom", foodIds: ["cream"] },
    { id: "older", name: "  ＳENDVIČ  ", foodIds: ["cream"] },
    { id: "empty", name: "Čaj", foodIds: [] },
  ];
  it("keeps the first ordered occurrence per normalized full name, including empty foods", () => {
    const suggestions = latestMealSuggestions(history);
    expect(suggestions.map(s => s.id)).toEqual(["latest", "distinct", "empty"]);
    expect(suggestions[0].foodIds).toEqual(["ketchup"]);
    expect(suggestions[2].foodIds).toEqual([]);
    expect(history[2].foodIds).toEqual(["cream"]);
  });
  it("uses prefix from the first nonblank character without fuzzy matching or removing accents", () => {
    const suggestions = latestMealSuggestions(history);
    expect(matchingMeals(suggestions, "  Ｓen")).toHaveLength(2);
    expect(matchingMeals(suggestions, "en")).toEqual([]);
    expect(matchingMeals(suggestions, " ")).toEqual([]);
    expect(matchingMeals(suggestions, "Caj")).toEqual([]);
    expect(matchingMeals(suggestions, "č")[0].name).toBe("Čaj");
  });
});
