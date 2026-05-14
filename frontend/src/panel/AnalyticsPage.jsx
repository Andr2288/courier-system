import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '../api.js';

function formatDurationMinutes(m) {
  if (m == null || !Number.isFinite(Number(m))) return '—';
  const total = Math.round(Number(m));
  if (total < 1) return '< 1 хв';
  const h = Math.floor(total / 60);
  const min = total % 60;
  if (h <= 0) return `${min} хв`;
  return `${h} год ${min} хв`;
}

export default function AnalyticsPage() {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/api/analytics/couriers');
      setCouriers(data.couriers ?? []);
    } catch (e) {
      setCouriers([]);
      setError(e.message || 'Не вдалося завантажити аналітику.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Аналітика кур’єрів</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Середній рейтинг за відправленнями кур’єра, середній час доставки (завершені відправлення) та
        кількість текстових відгуків за прив’язкою до відправлення.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mt-6 w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
        <table className="w-full min-w-[64rem] table-fixed border-collapse text-center text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="w-[20%] px-3 py-3 sm:px-4">Кур’єр</th>
              <th className="w-[14%] px-3 py-3 sm:px-4">Телефон</th>
              <th className="w-[10%] px-3 py-3 sm:px-4">Доступний</th>
              <th className="w-[12%] px-3 py-3 sm:px-4">Завершено доставок</th>
              <th className="w-[12%] px-3 py-3 sm:px-4">Середній рейтинг</th>
              <th className="w-[18%] px-3 py-3 sm:px-4">Середній час доставки</th>
              <th className="w-[14%] px-3 py-3 sm:px-4">Відгуки</th>
            </tr>
          </thead>
          <tbody className="text-ink">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">
                  Завантаження…
                </td>
              </tr>
            ) : couriers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">
                  Немає кур’єрів у довіднику.
                </td>
              </tr>
            ) : (
              couriers.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                  <td className="px-3 py-3 align-middle sm:px-4">
                    <span className="mx-auto block max-w-full truncate font-medium" title={c.full_name}>
                      {c.full_name}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle font-mono tabular-nums text-ink-muted sm:px-4">
                    <span className="mx-auto block max-w-full truncate" title={c.phone}>
                      {c.phone}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle sm:px-4">
                    <span
                      className={
                        c.available
                          ? 'inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200'
                          : 'inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200'
                      }
                    >
                      {c.available ? 'Так' : 'Ні'}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle font-mono tabular-nums text-ink-muted sm:px-4">
                    {c.completed_deliveries}
                  </td>
                  <td className="px-3 py-3 align-middle font-mono tabular-nums text-ink-muted sm:px-4">
                    {c.avg_rating != null ? c.avg_rating.toFixed(2) : '—'}
                  </td>
                  <td className="px-3 py-3 align-middle text-ink-muted sm:px-4">
                    <span className="mx-auto block max-w-full leading-snug">
                      {formatDurationMinutes(c.avg_delivery_minutes)}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle font-mono tabular-nums text-ink-muted sm:px-4">
                    {c.complaints_count}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
