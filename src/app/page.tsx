import Link from "next/link";
import { logout } from "./actions/auth";
import { requireUser } from "../lib/auth/require-user";

export default async function Home() {
  const user = await requireUser();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-50 px-5 py-12 text-stone-900 sm:px-8">
      <section aria-labelledby="welcome" className="w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-800">Lični dnevnik</p>
        <h1 id="welcome" className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Tracking Food</h1>
        <p className="mt-6 text-lg leading-relaxed text-stone-600">Prijavljeni ste kao {user.email ?? user.name}.</p>
        <p className="mt-4 leading-relaxed text-stone-600">Sačuvajte obrok i pregledajte svoju privatnu istoriju.</p>
        <Link href="/meals" className="mt-6 inline-block min-h-12 rounded-lg border border-emerald-800 px-5 py-3 text-emerald-900">Obroci</Link>
        <form action={logout} className="mt-8">
          <button type="submit" className="min-h-12 rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-800">Odjavi se</button>
        </form>
      </section>
    </main>
  );
}
