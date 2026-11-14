"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "../../lib/auth";

export async function loginWithGoogle() {
  try {
    await signIn("google", { redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login?error=signin");
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
