import { NavLink, Outlet } from 'react-router-dom';

import { useSession } from '../context/SessionContext.jsx';

const navClass = ({ isActive }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-muted hover:bg-slate-100 hover:text-ink',
  ].join(' ');

export default function PanelLayout() {
  const { user } = useSession();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="lg:w-52 lg:shrink-0">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-ink-muted">Користувач</p>
            <p className="mt-1 truncate text-sm font-semibold text-ink">{user.login}</p>
            <p className="text-xs text-ink-muted">{user.role}</p>
            <nav className="mt-4 flex flex-col gap-1 border-t border-slate-100 pt-4">
              <NavLink to="/panel" end className={navClass}>
                Огляд
              </NavLink>
              <NavLink to="/panel/clients" className={navClass}>
                Клієнти
              </NavLink>
              <NavLink to="/panel/couriers" className={navClass}>
                Кур’єри
              </NavLink>
              <NavLink to="/panel/tariffs" className={navClass}>
                Тарифи
              </NavLink>
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-ink-muted lg:text-left">
        <NavLink className="font-medium text-brand-600 hover:text-brand-700" to="/">
          На головну сайту
        </NavLink>
      </p>
    </div>
  );
}
