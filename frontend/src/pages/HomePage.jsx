import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-10 shadow-card">
        <h1 className="text-2xl font-semibold text-ink">Кур’єрська служба</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Навчальний MVP: публічне відстеження та панель диспетчера з JWT. Зараз доступні перевірка здоров’я API та вхід.
        </p>
        <nav className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/panel"
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
          >
            Панель диспетчера
          </Link>
          <Link
            to="/track"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-ink hover:border-brand-200 hover:text-brand-700"
          >
            Відстеження посилки
          </Link>
          <Link
            to="/login"
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Вхід
          </Link>
        </nav>
      </section>
    </main>
  );
}
