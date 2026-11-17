import { expect, it } from "vitest";
import { symptomInputSchema } from "../../src/features/symptoms/schema";
const input = { name: "  Sintetički simptom  ", startedAt: "2026-01-10T12:30:00+01:00" };
it("accepts retroactive time, trims text and normalizes optional fields", () => {
  expect(symptomInputSchema.parse(input)).toEqual({ ...input, name: "Sintetički simptom", severity: null, note: null });
  expect(symptomInputSchema.parse({ ...input, severity: 10, note: "  test  " })).toMatchObject({ severity: 10, note: "test" });
  expect(symptomInputSchema.parse({ ...input, severity: 1, note: "  " }).note).toBeNull();
});
it("rejects invalid names, times, notes and severity", () => {
  for (const patch of [{ name: " " }, { name: "x".repeat(201) }, { startedAt: "" }, { startedAt: "2026-02-30T12:00:00Z" }, { startedAt: "2026-01-10T12:00" }, { note: "x".repeat(5001) }, ...[0, 11, 1.5, "5", NaN].map(severity => ({ severity }))]) {
    expect(symptomInputSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  }
});
it("strips client-supplied ownership and lifecycle fields", () => {
  expect(symptomInputSchema.parse({ ...input, userId: "foreign", endedAt: "2026-01-11T00:00:00Z" })).not.toHaveProperty("userId");
  expect(symptomInputSchema.parse({ ...input, endedAt: "2026-01-11T00:00:00Z" })).not.toHaveProperty("endedAt");
});
