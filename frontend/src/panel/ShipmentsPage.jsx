import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../api.js';
import { shipmentStatusBadgeClass, shipmentStatusLabel } from '../constants/shipmentStatus.js';
import Modal from '../components/Modal.jsx';
import ShipmentManageModal from './ShipmentManageModal.jsx';

const emptyForm = {
  client_id: '',
  address_pickup: '',
  address_delivery: '',
  distance_km: '',
  length_cm: '',
  width_cm: '',
  height_cm: '',
  weight_kg: '',
};

function formatDt(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('uk-UA', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return String(value);
  }
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [clients, setClients] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedShipmentId, setCopiedShipmentId] = useState(null);
  const [copyError, setCopyError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [manageId, setManageId] = useState(null);

  const loadShipments = useCallback(async () => {
    setError('');
    setListLoading(true);
    try {
      const data = await apiFetch('/api/shipments');
      setShipments(data.shipments ?? []);
    } catch (e) {
      setError(e.message || 'Не вдалося завантажити відправлення.');
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const data = await apiFetch('/api/clients');
      setClients(data.clients ?? []);
    } catch {
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const canCreate = useMemo(() => clients.length > 0, [clients.length]);

  const copyTrackingCode = useCallback(async (shipmentId, code) => {
    setCopyError('');
    try {
      await navigator.clipboard.writeText(code);
      setCopiedShipmentId(shipmentId);
      window.setTimeout(() => {
        setCopiedShipmentId((cur) => (cur === shipmentId ? null : cur));
      }, 2000);
    } catch {
      setCopyError('Не вдалося скопіювати трек у буфер. Перевірте дозволи браузера.');
      window.setTimeout(() => setCopyError(''), 4000);
    }
  }, []);

  function openModal() {
    setForm(emptyForm);
    setFormError('');
    setSuccess('');
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const body = {
        client_id: Number(form.client_id),
        address_pickup: form.address_pickup,
        address_delivery: form.address_delivery,
        distance_km: Number(form.distance_km),
        length_cm: Number(form.length_cm),
        width_cm: Number(form.width_cm),
        height_cm: Number(form.height_cm),
        weight_kg: Number(form.weight_kg),
      };
      const data = await apiFetch('/api/shipments', { method: 'POST', body });
      setModalOpen(false);
      setForm(emptyForm);
      setSuccess(
        `Відправлення створено. Трекінг-код: ${data.shipment.tracking_code}. Розрахована вартість: ${data.shipment.calculated_price} (відстань ${data.shipment.distance_km} км).`,
      );
      await loadShipments();
    } catch (err) {
      setFormError(err.message || 'Помилка збереження.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Відправлення</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Створення, призначення кур’єра, події маршруту та статуси. Публічне відстеження — у пункті «Відстеження»
            у шапці.
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          disabled={!canCreate || clientsLoading}
          className="shrink-0 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Нове відправлення
        </button>
      </div>

      {!canCreate && !clientsLoading ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Спочатку додайте хоча б одного клієнта у довіднику.
        </p>
      ) : null}

      {success ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {success}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {copyError ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {copyError}
        </p>
      ) : null}

      <section className="mt-6 w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
        <table className="w-full min-w-[72rem] table-fixed border-collapse text-center text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="w-[10%] px-3 py-3 sm:px-4">Трек</th>
              <th className="w-[10%] px-3 py-3 sm:px-4">Клієнт</th>
              <th className="w-[10%] px-3 py-3 sm:px-4">Статус</th>
              <th className="w-[6%] px-3 py-3 sm:px-4">Км</th>
              <th className="w-[6%] px-3 py-3 sm:px-4">Вага</th>
              <th className="w-[8%] px-3 py-3 sm:px-4">Вартість</th>
              <th className="w-[11%] px-3 py-3 sm:px-4">Створено</th>
              <th className="w-[31%] px-3 py-3 sm:px-4">А → Б</th>
              <th className="w-[8%] px-3 py-3 sm:px-4">Дії</th>
            </tr>
          </thead>
          <tbody>
            {listLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-ink-muted">
                  Завантаження…
                </td>
              </tr>
            ) : shipments.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-ink-muted">
                  Поки що немає відправлень.
                </td>
              </tr>
            ) : (
              shipments.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-3 align-middle font-mono text-xs font-medium text-ink sm:px-4">
                    <div className="mx-auto flex max-w-full items-center justify-center gap-1">
                      <span className="min-w-0 truncate" title={s.tracking_code}>
                        {s.tracking_code}
                      </span>
                      <button
                        type="button"
                        className="inline-flex shrink-0 rounded-md border border-slate-200 bg-white p-1 text-ink-muted shadow-sm hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                        title={copiedShipmentId === s.id ? 'Скопійовано' : 'Копіювати трекінг-код'}
                        aria-label={`Копіювати трекінг-код ${s.tracking_code}`}
                        onClick={() => copyTrackingCode(s.id, s.tracking_code)}
                      >
                        {copiedShipmentId === s.id ? (
                          <span className="block px-0.5 text-xs font-medium text-emerald-600" aria-hidden>
                            ✓
                          </span>
                        ) : (
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle text-ink-muted sm:px-4">
                    <span className="mx-auto block max-w-full truncate" title={s.client_name}>
                      {s.client_name}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle sm:px-4">
                    <span
                      className={`mx-auto ${shipmentStatusBadgeClass(s.status)}`}
                      title={shipmentStatusLabel(s.status)}
                    >
                      {shipmentStatusLabel(s.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle text-ink-muted sm:px-4">
                    <span className="mx-auto block max-w-full truncate">{s.distance_km}</span>
                  </td>
                  <td className="px-3 py-3 align-middle text-ink-muted sm:px-4">
                    <span className="mx-auto block max-w-full truncate">{s.weight_kg ?? '—'}</span>
                  </td>
                  <td className="px-3 py-3 align-middle text-ink-muted sm:px-4">
                    <span className="mx-auto block max-w-full truncate">{s.calculated_price}</span>
                  </td>
                  <td className="px-3 py-3 align-middle text-xs text-ink-muted sm:px-4">
                    <span
                      className="mx-auto block max-w-full leading-snug line-clamp-2 break-words"
                      title={formatDt(s.created_at)}
                    >
                      {formatDt(s.created_at)}
                    </span>
                  </td>
                  <td className="min-w-0 px-3 py-3 align-middle text-xs text-ink-muted sm:px-4">
                    <span
                      className="mx-auto block max-w-full leading-snug line-clamp-3 break-words"
                      title={`${s.address_pickup} → ${s.address_delivery}`}
                    >
                      {s.address_pickup} → {s.address_delivery}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle sm:px-4">
                    <button
                      type="button"
                      className="text-brand-600 hover:text-brand-800"
                      onClick={() => setManageId(s.id)}
                    >
                      Керувати
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <Modal
        isOpen={modalOpen}
        title="Нове відправлення"
        onClose={closeModal}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={submitting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50 disabled:opacity-50"
              onClick={closeModal}
            >
              Скасувати
            </button>
            <button
              type="submit"
              form="shipment-create-form"
              disabled={submitting || !canCreate}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {submitting ? 'Збереження…' : 'Створити'}
            </button>
          </div>
        }
      >
        <form id="shipment-create-form" className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1" onSubmit={handleSubmit}>
          {formError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {formError}
            </p>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="sh-client">
              Клієнт
            </label>
            <select
              id="sh-client"
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.client_id}
              onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
              disabled={submitting || !canCreate}
            >
              <option value="">Оберіть…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.phone}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="sh-a">
              Адреса А (забір)
            </label>
            <textarea
              id="sh-a"
              required
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.address_pickup}
              onChange={(e) => setForm((f) => ({ ...f, address_pickup: e.target.value }))}
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="sh-b">
              Адреса Б (доставка)
            </label>
            <textarea
              id="sh-b"
              required
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.address_delivery}
              onChange={(e) => setForm((f) => ({ ...f, address_delivery: e.target.value }))}
              disabled={submitting}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="sh-km">
                Відстань, км
              </label>
              <input
                id="sh-km"
                type="number"
                min="0"
                step="0.01"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.distance_km}
                onChange={(e) => setForm((f) => ({ ...f, distance_km: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="sh-w">
                Вага, кг
              </label>
              <input
                id="sh-w"
                type="number"
                min="0"
                step="0.001"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.weight_kg}
                onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))}
                disabled={submitting}
              />
            </div>
          </div>

          <p className="text-xs font-medium text-ink-muted">Габарити посилки, см</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="sr-only" htmlFor="sh-l">
                Довжина
              </label>
              <input
                id="sh-l"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="Довжина"
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                value={form.length_cm}
                onChange={(e) => setForm((f) => ({ ...f, length_cm: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="sh-wi">
                Ширина
              </label>
              <input
                id="sh-wi"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="Ширина"
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                value={form.width_cm}
                onChange={(e) => setForm((f) => ({ ...f, width_cm: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="sh-h">
                Висота
              </label>
              <input
                id="sh-h"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="Висота"
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                value={form.height_cm}
                onChange={(e) => setForm((f) => ({ ...f, height_cm: e.target.value }))}
                disabled={submitting}
              />
            </div>
          </div>
        </form>
      </Modal>

      <ShipmentManageModal
        shipmentId={manageId}
        isOpen={manageId !== null}
        onClose={() => setManageId(null)}
        onUpdated={loadShipments}
      />
    </div>
  );
}
