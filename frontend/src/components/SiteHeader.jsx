import { NavLink, Link, useNavigate } from 'react-router-dom';

import { useSession } from '../context/SessionContext.jsx';

function navClass({ isActive }) {
  return [
    'rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-muted hover:bg-slate-100 hover:text-ink',
  ].join(' ');
}

export default function SiteHeader() {
  const navigate = useNavigate();
  const { user, loading, logout } = useSession();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to={user ? '/' : '/login'} className="flex shrink-0 items-center gap-3">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white shadow-card"
            aria-hidden
          >
            C
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Кур’єрська служба</p>
            <p className="text-xs text-ink-muted">MVP</p>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2" aria-label="Головна навігація">
          {loading ? (
            <span className="px-3 py-2 text-xs text-ink-muted" aria-live="polite">
              …
            </span>
          ) : user ? (
            <>
              <NavLink to="/track" className={navClass}>
                Відстеження
              </NavLink>
              <NavLink to="/panel" className={navClass}>
                Панель
              </NavLink>
              <span
                className="hidden max-w-[9rem] truncate px-2 text-xs text-ink-muted sm:inline"
                title={user.login}
              >
                {user.login}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-ink hover:border-brand-200 hover:text-brand-800"
              >
                Вийти
              </button>
            </>
          ) : (
            <NavLink to="/login" className={navClass}>
              Вхід
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
