import { redirect } from "next/navigation";
import { requireUser } from "../../lib/auth/require-user";

export default async function Home() {
  await requireUser();
  redirect("/meals");
}
