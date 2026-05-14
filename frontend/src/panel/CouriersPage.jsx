import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '../api.js';
import ConfirmModal from '../components/ConfirmModal.jsx';
import Modal from '../components/Modal.jsx';
import { parsePhoneClient, validateRequiredName } from '../utils/formValidation.js';

const emptyForm = { full_name: '', phone: '', available: true };

export default function CouriersPage() {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formId, setFormId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/api/couriers');
      setCouriers(data.couriers ?? []);
    } catch (e) {
      setError(e.message || 'Не вдалося завантажити кур’єрів.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm);
    setFormMode('create');
    setFormId(null);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(c) {
    setForm({
      full_name: c.full_name,
      phone: c.phone,
      available: Boolean(c.available),
    });
    setFormMode('edit');
    setFormId(c.id);
    setFormError('');
    setFormOpen(true);
  }

  function closeForm() {
    if (formSubmitting) return;
    setFormOpen(false);
    setFormError('');
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setFormError('');
    const nameTrim = form.full_name.trim();
    const nameErr = validateRequiredName(nameTrim, 'ПІБ кур’єра');
    if (nameErr) {
      setFormError(nameErr);
      return;
    }
    const phoneParsed = parsePhoneClient(form.phone);
    if (phoneParsed.error) {
      setFormError(phoneParsed.error);
      return;
    }

    setFormSubmitting(true);
    try {
      const body = { full_name: nameTrim, phone: phoneParsed.value, available: form.available };
      if (formMode === 'create') {
        await apiFetch('/api/couriers', { method: 'POST', body });
      } else {
        await apiFetch(`/api/couriers/${formId}`, { method: 'PUT', body });
      }
      setFormOpen(false);
      setFormError('');
      await load();
    } catch (err) {
      setFormError(err.message || 'Помилка збереження.');
    } finally {
      setFormSubmitting(false);
    }
  }

  async function executeDelete() {
    if (!deleteTarget) return;
    setError('');
    try {
      await apiFetch(`/api/couriers/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err.message || 'Помилка видалення.');
      throw err;
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Кур’єри</h1>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
        >
          Додати кур’єра
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mt-6 w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
        <table className="w-full min-w-[48rem] table-fixed border-collapse text-center text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="w-[30%] px-3 py-3 sm:px-4">ПІБ</th>
              <th className="w-[22%] px-3 py-3 sm:px-4">Телефон</th>
              <th className="w-[18%] px-3 py-3 sm:px-4">Доступний</th>
              <th className="w-[30%] px-3 py-3 sm:px-4">Дії</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-muted">
                  Завантаження…
                </td>
              </tr>
            ) : couriers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-muted">
                  Поки що немає кур’єрів.
                </td>
              </tr>
            ) : (
              couriers.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-3 align-middle sm:px-4">
                    <span className="mx-auto block max-w-full truncate font-medium text-ink" title={c.full_name}>
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
                  <td className="px-3 py-3 align-middle sm:px-4">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        className="text-brand-600 hover:text-brand-800"
                        onClick={() => openEdit(c)}
                      >
                        Змінити
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800"
                        onClick={() => setDeleteTarget({ id: c.id, name: c.full_name })}
                      >
                        Видалити
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <Modal
        isOpen={formOpen}
        title={formMode === 'create' ? 'Новий кур’єр' : `Редагування кур’єра #${formId}`}
        onClose={closeForm}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={formSubmitting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50 disabled:opacity-50"
              onClick={closeForm}
            >
              Скасувати
            </button>
            <button
              type="submit"
              form="courier-form"
              disabled={formSubmitting}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {formSubmitting ? 'Збереження…' : formMode === 'create' ? 'Створити' : 'Зберегти'}
            </button>
          </div>
        }
      >
        <form id="courier-form" className="grid gap-3" onSubmit={handleFormSubmit}>
          {formError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {formError}
            </p>
          ) : null}
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="courier-name">
              ПІБ
            </label>
            <input
              id="courier-name"
              required
              maxLength={255}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              disabled={formSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="courier-phone">
              Телефон
            </label>
            <input
              id="courier-phone"
              required
              inputMode="tel"
              autoComplete="tel"
              maxLength={32}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono tabular-nums"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              disabled={formSubmitting}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
              disabled={formSubmitting}
            />
            Доступний
          </label>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Видалити кур’єра?"
        description={
          deleteTarget ? (
            <>
              М’яке видалення запису{' '}
              <span className="font-medium text-ink">«{deleteTarget.name}»</span>. Переконайтесь, що
              немає активних відправлень.
            </>
          ) : null
        }
        confirmLabel="Видалити"
        danger
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDelete}
      />
    </div>
  );
}
