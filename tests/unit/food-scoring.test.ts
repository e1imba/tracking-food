import { expect, it } from "vitest";
import { localHourClock, mealScore } from "../../src/features/foods/scoring";
import { editFoodSchema, timeRangesSchema } from "../../src/features/foods/schema";

const belgrade = localHourClock("Europe/Belgrade");
const range = (startHour: number, endHour: number, score: number) => ({ startHour, endHour, score });
const rules = { baseScore: 2, timeRanges: [range(4, 12, 5), range(17, 4, 1)] };

it("evaluates half-open boundaries, midnight and baseline at the local hour", () => {
  for (const [clock, expected] of [
    ["02:59:59Z", 1], ["03:00:00Z", 5], ["10:59:59Z", 5], ["11:00:00Z", 2],
    ["16:00:00Z", 1], ["23:00:00Z", 1],
  ] as const) {
    expect(mealScore(`2026-01-15T${clock}`, [rules], belgrade).average).toBe(expected);
  }
});

it("uses the zone's historical offset at both DST transitions", () => {
  const override = { baseScore: 1, timeRanges: [range(2, 3, 5)] };
  for (const [instant, expected] of [
    ["2026-03-29T00:59:59Z", 1], ["2026-03-29T01:00:00Z", 1], // 01:59 to 03:00
    ["2026-10-25T00:30:00Z", 5], ["2026-10-25T01:30:00Z", 5], // repeated 02:30
    ["2026-10-25T02:00:00Z", 1],
  ] as const) {
    expect(mealScore(instant, [override], belgrade).average).toBe(expected);
  }
  expect(mealScore("2026-10-25T00:30:00Z", [override], localHourClock("UTC")).average).toBe(1);
});

it("averages only rated foods and counts all links, including interval-only and missing rules", () => {
  const onlyMorning = { baseScore: null, timeRanges: [range(4, 12, 5)] };
  const mixed = [undefined, onlyMorning, { baseScore: 2, timeRanges: [] }];
  expect(mealScore("2026-01-15T06:30:00Z", mixed, belgrade)).toEqual({ average: 3.5, rated: 2, total: 3 });
  expect(mealScore("2026-01-15T17:00:00Z", mixed, belgrade)).toEqual({ average: 2, rated: 1, total: 3 });
  expect(mealScore("2026-01-15T17:00:00Z", [undefined, onlyMorning], belgrade)).toEqual({ average: null, rated: 0, total: 2 });
  expect(mealScore("2026-01-15T17:00:00Z", [], belgrade)).toEqual({ average: null, rated: 0, total: 0 });
});

it("validates scores, equal limits, touching boundaries and wrapped overlaps", () => {
  expect(timeRangesSchema.safeParse([range(4, 12, 5), range(12, 17, 3), range(17, 4, 1)]).success).toBe(true);
  for (const invalid of [
    [range(17, 4, 1), range(0, 7, 2)], [range(4, 12, 4), range(11, 17, 1)], [range(8, 8, 1)],
    [range(0, 24, 2)], [range(4, 12, 0)], [range(4, 12, 2.5)], [range(4.5, 12, 5)],
  ]) {
    expect(timeRangesSchema.safeParse(invalid).success).toBe(false);
  }
  const id = "6b9b093f-d485-4589-b2ed-8ffaf6b4abc3";
  expect(editFoodSchema.safeParse({ id, groupId: id, baseScore: 4, timeRanges: [] }).success).toBe(false);
  expect(editFoodSchema.safeParse({ id, groupId: id, baseScore: null, timeRanges: [range(4, 12, 5)] }).success).toBe(false);
});
