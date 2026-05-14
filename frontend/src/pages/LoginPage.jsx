import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { loginRequest } from '../api.js';
import { useSession } from '../context/SessionContext.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, establishSession } = useSession();

  const from = location.state?.from || '/panel';

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    const target = typeof from === 'string' && from.startsWith('/') ? from : '/panel';
    return <Navigate to={target} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await loginRequest(login, password);
      establishSession(data.token, data.user);
      const target = typeof from === 'string' && from.startsWith('/') ? from : '/panel';
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || 'Помилка входу.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
        <h1 className="text-xl font-semibold text-ink">Вхід диспетчера</h1>
        <p className="mt-1 text-sm text-ink-muted">JWT-сесія для захищених операцій API.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="login">
              Логін
            </label>
            <input
              id="login"
              name="login"
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand-500/30 transition focus:border-brand-400 focus:ring-2"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand-500/30 transition focus:border-brand-400 focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Вхід…' : 'Увійти'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Без входу доступна лише ця сторінка. Після успішного входу відкриються головна, відстеження та панель.
        </p>
      </div>
    </div>
  );
}
