import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '../api.js';
import { shipmentStatusBadgeClass, shipmentStatusLabel } from '../constants/shipmentStatus.js';
import Modal from '../components/Modal.jsx';

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

export default function ShipmentManageModal({ shipmentId, isOpen, onClose, onUpdated }) {
  const [detail, setDetail] = useState(null);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [courierId, setCourierId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [eventType, setEventType] = useState('picked_up');
  const [eventComment, setEventComment] = useState('');
  const [eventSubmitting, setEventSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!shipmentId) return;
    setError('');
    setLoading(true);
    try {
      const [shipData, courierData] = await Promise.all([
        apiFetch(`/api/shipments/${shipmentId}`),
        apiFetch('/api/couriers'),
      ]);
      setDetail(shipData);
      setCouriers((courierData.couriers ?? []).filter((c) => c.available));
      setCourierId(String(shipData.shipment?.courier_id ?? ''));
    } catch (e) {
      setDetail(null);
      setError(e.message || 'Не вдалося завантажити дані.');
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    if (isOpen && shipmentId) {
      setEventType('picked_up');
      setEventComment('');
      load();
    }
  }, [isOpen, shipmentId, load]);

  const status = detail?.shipment?.status;
  const isDelivered = status === 'delivered';

  function handleClose() {
    if (assigning || eventSubmitting) return;
    onClose();
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!courierId) {
      setError('Оберіть кур’єра.');
      return;
    }
    setError('');
    setAssigning(true);
    try {
      await apiFetch(`/api/shipments/${shipmentId}/assign`, {
        method: 'POST',
        body: { courier_id: Number(courierId) },
      });
      await load();
      onUpdated?.();
    } catch (err) {
      setError(err.message || 'Помилка призначення.');
    } finally {
      setAssigning(false);
    }
  }

  async function handleEvent(e) {
    e.preventDefault();
    setError('');
    setEventSubmitting(true);
    try {
      const body = {
        event_type: eventType,
        comment: eventComment.trim() || undefined,
      };
      await apiFetch(`/api/shipments/${shipmentId}/events`, {
        method: 'POST',
        body,
      });
      setEventComment('');
      await load();
      onUpdated?.();
    } catch (err) {
      setError(err.message || 'Помилка збереження події.');
    } finally {
      setEventSubmitting(false);
    }
  }

  const s = detail?.shipment;
  const pkg = detail?.package;
  const logs = detail?.route_logs ?? [];
  const feedbacks = detail?.feedbacks ?? [];

  return (
    <Modal
      isOpen={isOpen}
      title={s ? `Відправлення ${s.tracking_code}` : 'Відправлення'}
      onClose={handleClose}
      widthClass="max-w-2xl"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            disabled={assigning || eventSubmitting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50 disabled:opacity-50"
            onClick={handleClose}
          >
            Закрити
          </button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-ink-muted">Завантаження…</p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {s ? (
        <div className="space-y-5">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Статус</dt>
              <dd className="mt-1">
                <span className={shipmentStatusBadgeClass(s.status)}>{shipmentStatusLabel(s.status)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Вартість</dt>
              <dd className="font-medium text-ink">{s.calculated_price}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-muted">Клієнт</dt>
              <dd className="font-medium text-ink">{s.client_name}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-muted">Кур’єр</dt>
              <dd className="text-ink">{s.courier_name ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-muted">Адреса А</dt>
              <dd className="text-ink">{s.address_pickup}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-muted">Адреса Б</dt>
              <dd className="text-ink">{s.address_delivery}</dd>
            </div>
            {pkg ? (
              <div className="sm:col-span-2">
                <dt className="text-ink-muted">Посилка</dt>
                <dd className="text-ink">
                  {pkg.length_cm}×{pkg.width_cm}×{pkg.height_cm} см, {pkg.weight_kg} кг
                </dd>
              </div>
            ) : null}
          </dl>

          <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <h3 className="text-sm font-semibold text-ink">Відгуки клієнта</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Текстові відгуки залишаються на сторінці «Відстеження» за трекінг-кодом. Тут лише перегляд; кілька
              записів на одне відправлення дозволені. Для аналітики кур’єра враховується прив’язка до відправлення.
            </p>
            <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto text-sm">
              {feedbacks.length === 0 ? (
                <li className="text-ink-muted">Відгуків ще немає.</li>
              ) : (
                feedbacks.map((fb) => (
                  <li
                    key={fb.id}
                    className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-ink-muted"
                  >
                    <span className="text-xs">{formatDt(fb.created_at)}</span>
                    <p className="mt-1 text-sm text-ink">{fb.body}</p>
                  </li>
                ))
              )}
            </ul>
          </section>

          {!isDelivered ? (
            <>
              <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <h3 className="text-sm font-semibold text-ink">Призначити кур’єра</h3>
                <form className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end" onSubmit={handleAssign}>
                  <select
                    className="min-w-[12rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={courierId}
                    onChange={(e) => setCourierId(e.target.value)}
                    disabled={assigning}
                  >
                    <option value="">Оберіть кур’єра…</option>
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} — {c.phone}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={assigning || couriers.length === 0}
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {assigning ? 'Збереження…' : 'Застосувати'}
                  </button>
                </form>
              </section>

              <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <h3 className="text-sm font-semibold text-ink">Подія по маршруту</h3>
                <form className="mt-3 grid gap-3" onSubmit={handleEvent}>
                  <div>
                    <label className="block text-xs font-medium text-ink-muted" htmlFor="ev-type">
                      Тип
                    </label>
                    <select
                      id="ev-type"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      disabled={eventSubmitting}
                    >
                      <option value="picked_up">Забрано (в дорозі)</option>
                      <option value="delivered">Доставлено</option>
                      <option value="note">Нотатка (без зміни статусу)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-muted" htmlFor="ev-com">
                      Коментар (обов’язково для нотатки)
                    </label>
                    <textarea
                      id="ev-com"
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={eventComment}
                      onChange={(e) => setEventComment(e.target.value)}
                      disabled={eventSubmitting}
                      placeholder="Необов’язково…"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={eventSubmitting}
                    className="w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 sm:w-auto"
                  >
                    {eventSubmitting ? 'Збереження…' : 'Додати подію'}
                  </button>
                </form>
              </section>
            </>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-ink-muted">
                Відправлення доставлено — призначення кур’єра та події маршруту змінити не можна. Оцінку та
                текстовий відгук клієнт залишає на сторінці «Відстеження» за трекінг-кодом.
              </p>
              {detail?.rating ? (
                <p className="text-sm text-ink">
                  Поточна оцінка клієнта: <span className="font-semibold">{detail.rating.score}</span> / 5
                </p>
              ) : (
                <p className="text-sm text-ink-muted">Клієнт ще не залишив оцінку на сторінці відстеження.</p>
              )}

            </div>
          )}

          <section>
            <h3 className="text-sm font-semibold text-ink">Журнал подій</h3>
            <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-sm">
              {logs.length === 0 ? (
                <li className="text-ink-muted">Немає записів.</li>
              ) : (
                logs.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-ink-muted"
                  >
                    <span className="font-medium text-ink">
                      {EVENT_LABELS[log.event_type] ?? log.event_type}
                    </span>
                    <span className="mx-2 text-slate-300">·</span>
                    <span className="text-xs">{formatDt(log.created_at)}</span>
                    {log.comment ? (
                      <p className="mt-1 text-xs text-ink-muted">{log.comment}</p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      ) : null}
    </Modal>
  );
}
