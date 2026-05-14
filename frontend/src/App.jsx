export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-4">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white shadow-card"
              aria-hidden
            >
              C
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Кур’єрська служба</p>
              <p className="text-xs text-ink-muted">MVP панель</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          <h1 className="text-2xl font-semibold text-ink">Скелет фронтенду готовий</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Далі підключимо маршрути, логін диспетчера та форми згідно ТЗ. Бекенд: перевірте{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-brand-800">npm run setup-db</code> у
            каталозі <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">project/backend</code>.
          </p>
        </section>
      </main>
    </div>
  );
}
