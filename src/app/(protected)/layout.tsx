import { requireUser } from "../../lib/auth/require-user";
import { JournalShell } from "../../components/journal-shell";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <JournalShell account={user.email ?? user.name ?? "Google nalog"}>{children}</JournalShell>;
}
