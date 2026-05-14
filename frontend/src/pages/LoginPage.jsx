import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { loginRequest } from '../api.js';
import { setToken } from '../authStorage.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/panel';

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginRequest(login, password);
      setToken(data.token);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Помилка входу.');
    } finally {
      setLoading(false);
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
              disabled={loading}
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
              disabled={loading}
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Вхід…' : 'Увійти'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          <Link className="font-medium text-brand-600 hover:text-brand-700" to="/">
            На головну
          </Link>
        </p>
      </div>
    </div>
  );
}
