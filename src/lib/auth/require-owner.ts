import "server-only";
import { requireUser } from "./require-user";
import { getDb } from "../db";
import { users } from "../db/schema";

export async function requireOwner() {
  const identity = await requireUser();
  const subject = identity.id;
  if (!subject) throw new Error("Missing identity");
  const db = getDb();
  // Concurrent first access resolves to one persistent owner. Email is not identity.
  const [user] = await db.insert(users).values({ googleSub: subject, email: identity.email })
    .onConflictDoUpdate({ target: users.googleSub, set: { googleSub: subject } }).returning({ id: users.id });
  return user.id;
}
