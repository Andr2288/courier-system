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
        кількість скарг за прив’язкою до відправлення.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Кур’єр</th>
              <th className="px-4 py-3">Телефон</th>
              <th className="px-4 py-3">Доступний</th>
              <th className="px-4 py-3">Завершено доставок</th>
              <th className="px-4 py-3">Середній рейтинг</th>
              <th className="px-4 py-3">Середній час доставки</th>
              <th className="px-4 py-3">Скарги</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-ink">
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
                <tr key={c.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium">{c.full_name}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.phone}</td>
                  <td className="px-4 py-3">{c.available ? 'Так' : 'Ні'}</td>
                  <td className="px-4 py-3">{c.completed_deliveries}</td>
                  <td className="px-4 py-3">
                    {c.avg_rating != null ? c.avg_rating.toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-3">{formatDurationMinutes(c.avg_delivery_minutes)}</td>
                  <td className="px-4 py-3">{c.complaints_count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
