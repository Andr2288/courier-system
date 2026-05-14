import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '../api.js';
import ConfirmModal from '../components/ConfirmModal.jsx';
import Modal from '../components/Modal.jsx';

const emptyForm = { name: '', phone: '', email: '' };

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
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
      const data = await apiFetch('/api/clients');
      setClients(data.clients ?? []);
    } catch (e) {
      setError(e.message || 'Не вдалося завантажити клієнтів.');
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
    setForm({ name: c.name, phone: c.phone, email: c.email ?? '' });
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
    setFormSubmitting(true);
    try {
      const body = { name: form.name, phone: form.phone, email: form.email || null };
      if (formMode === 'create') {
        await apiFetch('/api/clients', { method: 'POST', body });
      } else {
        await apiFetch(`/api/clients/${formId}`, { method: 'PUT', body });
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
      await apiFetch(`/api/clients/${deleteTarget.id}`, { method: 'DELETE' });
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
          <h1 className="text-2xl font-semibold text-ink">Клієнти</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Мінімум: ім’я та контакт. Видалення — м’яке, якщо немає активних відправлень.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
        >
          Додати клієнта
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-4 py-3">Назва</th>
              <th className="px-4 py-3">Телефон</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 text-right">Дії</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-ink-muted">
                  Завантаження…
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-ink-muted">
                  Поки що немає клієнтів.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.phone}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-brand-600 hover:text-brand-800"
                      onClick={() => openEdit(c)}
                    >
                      Змінити
                    </button>
                    <span className="mx-2 text-slate-300">|</span>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                    >
                      Видалити
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <Modal
        isOpen={formOpen}
        title={formMode === 'create' ? 'Новий клієнт' : `Редагування клієнта #${formId}`}
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
              form="client-form"
              disabled={formSubmitting}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {formSubmitting ? 'Збереження…' : formMode === 'create' ? 'Створити' : 'Зберегти'}
            </button>
          </div>
        }
      >
        <form id="client-form" className="grid gap-3" onSubmit={handleFormSubmit}>
          {formError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {formError}
            </p>
          ) : null}
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="client-name">
              Назва
            </label>
            <input
              id="client-name"
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={formSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="client-phone">
              Телефон
            </label>
            <input
              id="client-phone"
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              disabled={formSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="client-email">
              Email (необов’язково)
            </label>
            <input
              id="client-email"
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              disabled={formSubmitting}
            />
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Видалити клієнта?"
        description={
          deleteTarget ? (
            <>
              Клієнт <span className="font-medium text-ink">«{deleteTarget.name}»</span> буде прихований
              зі списку (м’яке видалення). Якщо є активні відправлення, операція не вдасться.
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
