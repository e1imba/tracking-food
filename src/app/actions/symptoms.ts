"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../../lib/auth/require-user";
import { saveSymptom } from "../../features/symptoms/service";

export async function createSymptom(input: unknown): Promise<{ ok: boolean; message: string }> {
  // Redirect outside catch so expired sessions return to login.
  await requireUser();
  try {
    await saveSymptom(input);
  } catch {
    // Never expose database errors or journal contents to logs or the response.
    return { ok: false, message: "Simptom nije sačuvan. Proverite unos i pokušajte ponovo." };
  }
  revalidatePath("/symptoms");
  return { ok: true, message: "Simptom je sačuvan." };
}
