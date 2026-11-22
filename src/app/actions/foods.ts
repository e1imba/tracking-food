"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../../lib/auth/require-user";
import { addCatalogFood, saveFoodGroup, updateCatalogFood } from "../../features/foods/service";

async function save(operation: () => Promise<unknown>, message: string) {
  await requireUser();
  try {
    await operation();
  } catch {
    return { ok: false, message: "Izmene nisu sačuvane. Proverite unos i pokušajte ponovo." };
  }
  revalidatePath("/foods");
  revalidatePath("/meals");
  return { ok: true, message };
}

export async function createFood(input: unknown) {
  return save(() => addCatalogFood(input), "Namirnica je u katalogu.");
}

export async function editFood(input: unknown) {
  return save(() => updateCatalogFood(input), "Namirnica je sačuvana.");
}

export async function editFoodGroup(input: unknown) {
  return save(() => saveFoodGroup(input), "Grupa je sačuvana.");
}
