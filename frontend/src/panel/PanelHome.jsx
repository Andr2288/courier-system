import { Link } from 'react-router-dom';

import { useSession } from '../context/SessionContext.jsx';

export default function PanelHome() {
  const { user } = useSession();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Панель диспетчера</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Довідники, відправлення з трек-кодом, тарифікація, призначення кур’єра, публічне відстеження, оцінки,
        скарги та аналітика по кур’єрах.
      </p>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Сесія</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Логін</dt>
            <dd className="font-medium text-ink">{user.login}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Роль</dt>
            <dd className="font-medium text-ink">{user.role}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Link
          to="/panel/shipments"
          className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-brand-700 shadow-sm hover:border-brand-200"
        >
          Відправлення →
        </Link>
        <Link
          to="/panel/clients"
          className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-brand-700 shadow-sm hover:border-brand-200"
        >
          Клієнти →
        </Link>
        <Link
          to="/panel/couriers"
          className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-brand-700 shadow-sm hover:border-brand-200"
        >
          Кур’єри →
        </Link>
        <Link
          to="/panel/tariffs"
          className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-brand-700 shadow-sm hover:border-brand-200"
        >
          Тарифи →
        </Link>
        <Link
          to="/panel/analytics"
          className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-brand-700 shadow-sm hover:border-brand-200"
        >
          Аналітика →
        </Link>
      </section>
    </div>
  );
}
