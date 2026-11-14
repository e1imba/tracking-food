import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";
import { loginWithGoogle } from "../actions/auth";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-50 px-5 py-12 text-stone-900 sm:px-8">
      <section aria-labelledby="welcome" className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-800">Lični dnevnik</p>
        <h1 id="welcome" className="mt-4 text-4xl font-semibold tracking-tight">Tracking Food</h1>
        <p className="mt-6 leading-relaxed text-stone-600">Prijavite se Google nalogom. Isti postupak važi i pri prvom pristupu.</p>
        {error && <p role="alert" className="mt-4 text-red-800">Prijava nije uspela. Pokušajte ponovo.</p>}
        <form action={loginWithGoogle} className="mt-8">
          <button type="submit" className="min-h-12 w-full rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-800">
            Nastavi preko Google-a
          </button>
        </form>
      </section>
    </main>
  );
}
