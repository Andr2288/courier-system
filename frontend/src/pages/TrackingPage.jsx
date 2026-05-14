import { useState } from 'react';
import { Link } from 'react-router-dom';

async function parseJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

const EVENT_LABELS = {
  created: 'Створено',
  courier_assigned: 'Кур’єр',
  picked_up: 'Забрано',
  delivered: 'Доставлено',
  note: 'Нотатка',
};

function formatDt(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(value);
  }
}

export default function TrackingPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Введіть трекінг-код.');
      setData(null);
      return;
    }
    setError('');
    setLoading(true);
    setData(null);
    try {
      const enc = encodeURIComponent(trimmed);
      const res = await fetch(`/api/track/${enc}`);
      const body = await parseJson(res);
      if (!res.ok) {
        throw new Error(body.error || 'Не вдалося знайти відправлення.');
      }
      setData(body);
    } catch (err) {
      setError(err.message || 'Помилка запиту.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-ink">Відстеження посилки</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Введіть трекінг-код без входу в систему. Показуються лише статус, скорочені адреси та історія подій.
      </p>

      <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={handleSearch}>
        <input
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-mono uppercase placeholder:normal-case"
          placeholder="Наприклад CV-AB12CD34EF"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={loading}
          autoCapitalize="characters"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? 'Пошук…' : 'Знайти'}
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {data ? (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono text-lg font-semibold text-ink">{data.tracking_code}</p>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
              {data.status_label ?? data.status}
            </span>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-ink-muted">Забір (орієнтовно)</dt>
              <dd className="text-ink">{data.address_from_summary}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Доставка (орієнтовно)</dt>
              <dd className="text-ink">{data.address_to_summary}</dd>
            </div>
          </dl>

          <h2 className="mt-6 text-sm font-semibold text-ink">Історія</h2>
          <ul className="mt-2 space-y-2">
            {(data.events ?? []).length === 0 ? (
              <li className="text-sm text-ink-muted">Подій ще немає.</li>
            ) : (
              data.events.map((ev, idx) => (
                <li
                  key={`${ev.created_at}-${idx}`}
                  className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-ink">
                    {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                  </span>
                  <span className="mx-2 text-slate-300">·</span>
                  <span className="text-xs text-ink-muted">{formatDt(ev.created_at)}</span>
                  {ev.comment ? <p className="mt-1 text-xs text-ink-muted">{ev.comment}</p> : null}
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 text-center text-sm text-ink-muted sm:text-left">
        <Link className="font-medium text-brand-600 hover:text-brand-700" to="/">
          На головну
        </Link>
      </p>
    </main>
  );
}
