import { Link } from 'react-router-dom';

import { useSession } from '../context/SessionContext.jsx';

export default function HomePage() {
  const { user, loading } = useSession();

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-10 shadow-card">
        <h1 className="text-2xl font-semibold text-ink">Кур’єрська служба</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Навчальний MVP: публічне відстеження посилок та панель диспетчера з JWT. Усі основні дії — у меню
          згори.
        </p>

        {!loading && user ? (
          <p className="mt-6 text-sm text-ink-muted">
            Ви увійшли як <span className="font-medium text-ink">{user.login}</span>. Перейдіть до{' '}
            <Link className="font-medium text-brand-600 hover:text-brand-800" to="/panel">
              панелі
            </Link>
            , щоб керувати довідниками.
          </p>
        ) : !loading ? (
          <p className="mt-6 text-sm text-ink-muted">
            Щоб відкрити панель диспетчера,{' '}
            <Link className="font-medium text-brand-600 hover:text-brand-800" to="/login">
              увійдіть
            </Link>
            .
          </p>
        ) : null}
      </section>
    </main>
  );
}
