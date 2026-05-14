import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { clearToken } from '../authStorage.js';

export default function PanelPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Панель</h1>
          <p className="mt-1 text-sm text-ink-muted">Захищена зона. Далі тут будуть відправлення та довідники.</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink hover:border-brand-200 hover:text-brand-700"
        >
          Вийти
        </button>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
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

      <p className="mt-6 text-sm text-ink-muted">
        <Link className="font-medium text-brand-600 hover:text-brand-700" to="/">
          На головну
        </Link>
      </p>
    </div>
  );
}
