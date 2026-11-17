import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../../src/lib/auth/require-user", () => ({ requireUser: vi.fn() }));
vi.mock("../../src/features/symptoms/service", () => ({ saveSymptom: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { requireUser } from "../../src/lib/auth/require-user";
import { saveSymptom } from "../../src/features/symptoms/service";
import { revalidatePath } from "next/cache";
import { createSymptom } from "../../src/app/actions/symptoms";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ id: "synthetic-sub" });
});
it("rejects direct unauthenticated action calls before persistence", async () => {
  vi.mocked(requireUser).mockRejectedValue(new Error("redirect login"));
  await expect(createSymptom({})).rejects.toThrow("redirect login");
  expect(saveSymptom).not.toHaveBeenCalled();
});
it("returns generic failure without leaking or logging journal/DB details", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    vi.mocked(saveSymptom).mockRejectedValue(new Error("synthetic-private-journal SQL details"));
    expect(await createSymptom({})).toEqual({ ok: false, message: "Simptom nije sačuvan. Proverite unos i pokušajte ponovo." });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  } finally { log.mockRestore(); }
});
it("refreshes the private page only after a successful save", async () => {
  vi.mocked(saveSymptom).mockResolvedValue("synthetic-id");
  expect((await createSymptom({})).ok).toBe(true);
  expect(revalidatePath).toHaveBeenCalledWith("/symptoms");
});
