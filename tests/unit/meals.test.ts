import { afterEach, describe, expect, it } from "vitest";
import { localDateTime, localTimeToInstant, mealInputSchema, normalizeFoodName } from "../../src/features/meals/schema";

const input = { name: "Obrok", occurredAt: "2026-11-14T10:00:00Z", foodIds: [], newFoods: [] };
const previousTimezone = process.env.TZ;
afterEach(() => {
  if (previousTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = previousTimezone;
});

describe("meal validation", () => {
  it("accepts only a name and time, normalizes blank notes to null", () => {
    expect(mealInputSchema.parse(input).note).toBeNull();
    expect(mealInputSchema.parse({ ...input, note: " \n " }).note).toBeNull();
    expect(mealInputSchema.parse({ ...input, note: " Test\ntext " }).note).toBe("Test\ntext");
  });
  it.each([
    { name: " " }, { name: "a".repeat(201) }, { note: "a".repeat(5001) },
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
