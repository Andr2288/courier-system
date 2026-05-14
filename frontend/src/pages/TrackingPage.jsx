import { useEffect, useState } from 'react';

import { shipmentStatusBadgeClass } from '../constants/shipmentStatus.js';

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

  const [ratingSelect, setRatingSelect] = useState('5');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');
  const [ratingError, setRatingError] = useState('');

  const [feedbackBody, setFeedbackBody] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  useEffect(() => {
    if (data?.rating?.score != null) {
      setRatingSelect(String(data.rating.score));
    } else {
      setRatingSelect('5');
    }
  }, [data?.tracking_code, data?.rating?.score]);

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
    setRatingMessage('');
    setRatingError('');
    setFeedbackBody('');
    setFeedbackMessage('');
    setFeedbackError('');
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

  async function handleRatingSubmit(e) {
    e.preventDefault();
    if (!data?.tracking_code || data.status !== 'delivered') return;

    const score = Number(ratingSelect);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      setRatingError('Оберіть оцінку від 1 до 5.');
      return;
    }

    setRatingSubmitting(true);
    setRatingError('');
    setRatingMessage('');
    try {
      const enc = encodeURIComponent(data.tracking_code);
      const res = await fetch(`/api/track/${enc}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
      });
      if (res.status === 204) {
        setData((d) => (d ? { ...d, rating: { score } } : null));
        setRatingMessage('Дякуємо! Оцінку збережено.');
        return;
      }
      const body = await parseJson(res);
      if (!res.ok) {
        throw new Error(body.error || `Помилка ${res.status}`);
      }
    } catch (err) {
      setRatingError(err.message || 'Не вдалося зберегти оцінку.');
    } finally {
      setRatingSubmitting(false);
    }
  }

  async function handleFeedbackSubmit(e) {
    e.preventDefault();
    if (!data?.tracking_code || data.status !== 'delivered') return;

    const text = feedbackBody.trim();
    if (text.length < 3) {
      setFeedbackError('Текст відгуку має містити щонайменше 3 символи.');
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackError('');
    setFeedbackMessage('');
    try {
      const enc = encodeURIComponent(data.tracking_code);
      const res = await fetch(`/api/track/${enc}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      const body = await parseJson(res);
      if (!res.ok) {
        throw new Error(body.error || `Помилка ${res.status}`);
      }
      const created = body.feedback;
      if (created && typeof created === 'object') {
        setData((d) =>
          d ? { ...d, feedbacks: [created, ...(d.feedbacks ?? [])] } : null,
        );
      }
      setFeedbackBody('');
      setFeedbackMessage('Дякуємо! Відгук збережено.');
    } catch (err) {
      setFeedbackError(err.message || 'Не вдалося зберегти відгук.');
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-ink">Відстеження посилки</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Введіть трекінг-код без входу в систему. Показуються статус, скорочені адреси та історія подій. Після
        доставки тут можна залишити оцінку сервісу та текстовий відгук.
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
            <span className={shipmentStatusBadgeClass(data.status)}>
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

          {data.status === 'delivered' ? (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <h2 className="text-sm font-semibold text-ink">Оцінка доставки</h2>
              <p className="mt-1 text-xs text-ink-muted">
                Оцініть доставку за шкалою 1–5 після отримання посилки. Одна оцінка на замовлення; пізніше можна
                змінити.
              </p>
              {data.rating ? (
                <p className="mt-2 text-sm text-ink">
                  Зараз збережено: <span className="font-semibold">{data.rating.score}</span> / 5 — можете
                  оновити нижче.
                </p>
              ) : null}
              {ratingError ? (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {ratingError}
                </p>
              ) : null}
              {ratingMessage ? (
                <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
                  {ratingMessage}
                </p>
              ) : null}
              <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleRatingSubmit}>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-ink-muted" htmlFor="track-rating">
                    Ваша оцінка
                  </label>
                  <select
                    id="track-rating"
                    className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={ratingSelect}
                    onChange={(e) => setRatingSelect(e.target.value)}
                    disabled={ratingSubmitting}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={ratingSubmitting}
                  className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {ratingSubmitting ? 'Збереження…' : data.rating ? 'Оновити оцінку' : 'Надіслати оцінку'}
                </button>
              </form>

              <h2 className="mt-8 text-sm font-semibold text-ink">Відгуки</h2>
              <p className="mt-1 text-xs text-ink-muted">
                Можна залишити кілька відгуків про доставку. Вони відображаються диспетчерам у картці
                відправлення лише для перегляду.
              </p>
              <ul className="mt-3 space-y-2">
                {(data.feedbacks ?? []).length === 0 ? (
                  <li className="text-sm text-ink-muted">Поки немає відгуків.</li>
                ) : (
                  (data.feedbacks ?? []).map((fb) => (
                    <li
                      key={fb.id}
                      className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                    >
                      <span className="text-xs text-ink-muted">{formatDt(fb.created_at)}</span>
                      <p className="mt-1 text-ink">{fb.body}</p>
                    </li>
                  ))
                )}
              </ul>
              {feedbackError ? (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {feedbackError}
                </p>
              ) : null}
              {feedbackMessage ? (
                <p
                  className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
                  role="status"
                >
                  {feedbackMessage}
                </p>
              ) : null}
              <form className="mt-4 grid gap-3" onSubmit={handleFeedbackSubmit}>
                <div>
                  <label className="block text-xs font-medium text-ink-muted" htmlFor="track-feedback">
                    Ваш відгук
                  </label>
                  <textarea
                    id="track-feedback"
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={feedbackBody}
                    onChange={(e) => setFeedbackBody(e.target.value)}
                    disabled={feedbackSubmitting}
                    placeholder="Наприклад, враження від спілкування з кур’єром або якості сервісу…"
                  />
                </div>
                <button
                  type="submit"
                  disabled={feedbackSubmitting}
                  className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 sm:w-auto"
                >
                  {feedbackSubmitting ? 'Надсилання…' : 'Надіслати відгук'}
                </button>
              </form>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
