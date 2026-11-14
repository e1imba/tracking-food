import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../../src/lib/auth/require-user", () => ({ requireUser: vi.fn() }));
vi.mock("../../src/features/meals/service", () => ({ saveMeal: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { requireUser } from "../../src/lib/auth/require-user";
import { saveMeal } from "../../src/features/meals/service";
import { revalidatePath } from "next/cache";
import { createMeal } from "../../src/app/actions/meals";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ id: "synthetic-sub" });
});
it("rejects direct unauthenticated action calls before persistence", async () => {
  vi.mocked(requireUser).mockRejectedValue(new Error("redirect login"));
  await expect(createMeal({})).rejects.toThrow("redirect login");
  expect(saveMeal).not.toHaveBeenCalled();
});
it("returns generic failure without leaking or logging journal/DB details", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    vi.mocked(saveMeal).mockRejectedValue(new Error("synthetic-private-journal SQL details"));
    expect(await createMeal({})).toEqual({ ok: false, message: "Obrok nije sačuvan. Proverite unos i pokušajte ponovo." });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  } finally { log.mockRestore(); }
});
it("refreshes the private page only after a successful save", async () => {
  vi.mocked(saveMeal).mockResolvedValue("synthetic-id");
  expect((await createMeal({})).ok).toBe(true);
  expect(revalidatePath).toHaveBeenCalledWith("/meals");
});
