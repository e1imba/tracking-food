export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-50 px-5 py-12 text-stone-900 sm:px-8">
      <section aria-labelledby="welcome" className="w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-800">A personal journal</p>
        <h1 id="welcome" className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Tracking Food</h1>
        <p className="mt-6 text-lg leading-relaxed text-stone-600">A place to keep track of meals and symptoms.</p>
        <p className="mt-4 leading-relaxed text-stone-600">The journal is in development. Entry and history features will arrive in a future update.</p>
      </section>
    </main>
  );
}
