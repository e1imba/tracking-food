"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../../lib/auth/require-user";
import { saveMeal } from "../../features/meals/service";

export async function createMeal(input: unknown): Promise<{ ok: boolean; message: string }> {
  // Redirect outside catch so expired sessions return to login.
  await requireUser();
  try {
    await saveMeal(input);
  } catch {
    // Never expose database errors or journal contents to logs or the response.
    return { ok: false, message: "Obrok nije sačuvan. Proverite unos i pokušajte ponovo." };
  }
  revalidatePath("/meals");
  return { ok: true, message: "Obrok je sačuvan." };
}
