import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '../api.js';
import Modal from '../components/Modal.jsx';
import { useSession } from '../context/SessionContext.jsx';
import {
  parseNonNegativeMoneyField,
  validateTariffLabel,
} from '../utils/formValidation.js';

const emptyCreate = {
  label: '',
  base_price: '',
  price_per_kg: '',
  price_per_km: '',
  is_active: true,
};

export default function TariffsPage() {
  const { user } = useSession();
  const isAdmin = user.role === 'admin';

  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [createError, setCreateError] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/api/tariffs');
      setTariffs(data.tariffs ?? []);
    } catch (e) {
      setError(e.message || 'Не вдалося завантажити тарифи.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setCreateForm(emptyCreate);
    setCreateError('');
    setCreateOpen(true);
  }

  function closeCreate() {
    if (createSubmitting) return;
    setCreateOpen(false);
    setCreateError('');
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    setCreateError('');
    const labelErr = validateTariffLabel(createForm.label);
    if (labelErr) {
      setCreateError(labelErr);
      return;
    }
    const base = parseNonNegativeMoneyField(createForm.base_price, 'базову ціну');
    if (base.error) {
      setCreateError(base.error);
      return;
    }
    const pkg = parseNonNegativeMoneyField(createForm.price_per_kg, 'ставку за кг');
    if (pkg.error) {
      setCreateError(pkg.error);
      return;
    }
    const km = parseNonNegativeMoneyField(createForm.price_per_km, 'ставку за км');
    if (km.error) {
      setCreateError(km.error);
      return;
    }

    setCreateSubmitting(true);
    try {
      const label = createForm.label.trim() || 'tariff';
      await apiFetch('/api/tariffs', {
        method: 'POST',
        body: {
          label,
          base_price: base.value,
          price_per_kg: pkg.value,
          price_per_km: km.value,
          is_active: createForm.is_active,
        },
      });
      setCreateOpen(false);
      await load();
    } catch (err) {
      setCreateError(err.message || 'Помилка створення.');
    } finally {
      setCreateSubmitting(false);
    }
  }

  function openEdit(t) {
    setEditId(t.id);
    setEditDraft({
      label: t.label,
      base_price: String(t.base_price),
      price_per_kg: String(t.price_per_kg),
      price_per_km: String(t.price_per_km),
      is_active: t.is_active,
    });
    setEditError('');
    setEditOpen(true);
  }

  function closeEdit() {
    if (editSubmitting) return;
    setEditOpen(false);
    setEditId(null);
    setEditDraft(null);
    setEditError('');
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editDraft || editId === null) return;
    setEditError('');
    const labelErr = validateTariffLabel(editDraft.label);
    if (labelErr) {
      setEditError(labelErr);
      return;
    }
    const base = parseNonNegativeMoneyField(editDraft.base_price, 'базову ціну');
    if (base.error) {
      setEditError(base.error);
      return;
    }
    const pkg = parseNonNegativeMoneyField(editDraft.price_per_kg, 'ставку за кг');
    if (pkg.error) {
      setEditError(pkg.error);
      return;
    }
    const km = parseNonNegativeMoneyField(editDraft.price_per_km, 'ставку за км');
    if (km.error) {
      setEditError(km.error);
      return;
    }

    setEditSubmitting(true);
    try {
      await apiFetch(`/api/tariffs/${editId}`, {
        method: 'PUT',
        body: {
          label: editDraft.label.trim() || 'tariff',
          base_price: base.value,
          price_per_kg: pkg.value,
          price_per_km: km.value,
          is_active: editDraft.is_active,
        },
      });
      setEditOpen(false);
      setEditId(null);
      setEditDraft(null);
      setEditError('');
      await load();
    } catch (err) {
      setEditError(err.message || 'Помилка збереження.');
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Тарифи</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Базова ціна та ставки за кг і км. Редагування й додавання — лише для ролі{' '}
            <span className="font-medium text-ink">admin</span>.
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={openCreate}
            className="shrink-0 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
          >
            Додати тариф
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mt-6 w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
        <table
          className={`w-full border-collapse text-center text-sm ${isAdmin ? 'min-w-[52rem] table-fixed' : 'min-w-[42rem] table-fixed'}`}
        >
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className={`px-3 py-3 sm:px-4 ${isAdmin ? 'w-[26%]' : 'w-[34%]'}`}>Тип</th>
              <th className={`px-3 py-3 sm:px-4 ${isAdmin ? 'w-[12%]' : 'w-[16.5%]'}`}>База</th>
              <th className={`px-3 py-3 sm:px-4 ${isAdmin ? 'w-[14%]' : 'w-[16.5%]'}`}>За кг</th>
              <th className={`px-3 py-3 sm:px-4 ${isAdmin ? 'w-[14%]' : 'w-[16.5%]'}`}>За км</th>
              <th className={`px-3 py-3 sm:px-4 ${isAdmin ? 'w-[14%]' : 'w-[16.5%]'}`}>Активний</th>
              {isAdmin ? (
                <th className="w-[20%] px-3 py-3 sm:px-4">Дії</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-4 py-6 text-center text-ink-muted">
                  Завантаження…
                </td>
              </tr>
            ) : tariffs.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-4 py-6 text-center text-ink-muted">
                  Немає тарифів.
                </td>
              </tr>
            ) : (
              tariffs.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-3 align-middle sm:px-4">
                    <span className="mx-auto block max-w-full truncate font-medium text-ink" title={t.label}>
                      {t.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle font-mono tabular-nums text-ink-muted sm:px-4">
                    {t.base_price}
                  </td>
                  <td className="px-3 py-3 align-middle font-mono tabular-nums text-ink-muted sm:px-4">
                    {t.price_per_kg}
                  </td>
                  <td className="px-3 py-3 align-middle font-mono tabular-nums text-ink-muted sm:px-4">
                    {t.price_per_km}
                  </td>
                  <td className="px-3 py-3 align-middle sm:px-4">
                    <span
                      className={
                        t.is_active
                          ? 'inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200'
                          : 'inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200'
                      }
                    >
                      {t.is_active ? 'Так' : 'Ні'}
                    </span>
                  </td>
                  {isAdmin ? (
                    <td className="px-3 py-3 align-middle sm:px-4">
                      <button
                        type="button"
                        className="text-brand-600 hover:text-brand-800"
                        onClick={() => openEdit(t)}
                      >
                        Змінити
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {isAdmin ? (
        <Modal
          isOpen={createOpen}
          title="Новий тариф"
          onClose={closeCreate}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={createSubmitting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50 disabled:opacity-50"
                onClick={closeCreate}
              >
                Скасувати
              </button>
              <button
                type="submit"
                form="tariff-create-form"
                disabled={createSubmitting}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {createSubmitting ? 'Створення…' : 'Створити'}
              </button>
            </div>
          }
        >
          <form id="tariff-create-form" className="grid gap-3 sm:grid-cols-2" onSubmit={handleCreateSubmit}>
            {createError ? (
              <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {createError}
              </p>
            ) : null}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-ink" htmlFor="tc-label">
                Тип
              </label>
              <input
                id="tc-label"
                maxLength={128}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={createForm.label}
                onChange={(e) => setCreateForm((f) => ({ ...f, label: e.target.value }))}
                disabled={createSubmitting}
                placeholder="наприклад, economy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="tc-base">
                Базова ціна
              </label>
              <input
                id="tc-base"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={createForm.base_price}
                onChange={(e) => setCreateForm((f) => ({ ...f, base_price: e.target.value }))}
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="tc-kg">
                За кг
              </label>
              <input
                id="tc-kg"
                type="number"
                min="0"
                step="0.0001"
                inputMode="decimal"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={createForm.price_per_kg}
                onChange={(e) => setCreateForm((f) => ({ ...f, price_per_kg: e.target.value }))}
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="tc-km">
                За км
              </label>
              <input
                id="tc-km"
                type="number"
                min="0"
                step="0.0001"
                inputMode="decimal"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={createForm.price_per_km}
                onChange={(e) => setCreateForm((f) => ({ ...f, price_per_km: e.target.value }))}
                disabled={createSubmitting}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
              <input
                type="checkbox"
                checked={createForm.is_active}
                onChange={(e) => setCreateForm((f) => ({ ...f, is_active: e.target.checked }))}
                disabled={createSubmitting}
              />
              Активний
            </label>
          </form>
        </Modal>
      ) : null}

      {isAdmin && editOpen && editDraft ? (
        <Modal
          isOpen
          title={`Редагування тарифу #${editId}`}
          onClose={closeEdit}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={editSubmitting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50 disabled:opacity-50"
                onClick={closeEdit}
              >
                Скасувати
              </button>
              <button
                type="submit"
                form="tariff-edit-form"
                disabled={editSubmitting}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {editSubmitting ? 'Збереження…' : 'Зберегти'}
              </button>
            </div>
          }
        >
          <form id="tariff-edit-form" className="grid gap-3 sm:grid-cols-2" onSubmit={handleEditSubmit}>
            {editError ? (
              <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {editError}
              </p>
            ) : null}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-ink" htmlFor="te-label">
                Тип
              </label>
              <input
                id="te-label"
                maxLength={128}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={editDraft.label}
                onChange={(e) => setEditDraft((d) => ({ ...d, label: e.target.value }))}
                disabled={editSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="te-base">
                Базова ціна
              </label>
              <input
                id="te-base"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={editDraft.base_price}
                onChange={(e) => setEditDraft((d) => ({ ...d, base_price: e.target.value }))}
                disabled={editSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="te-kg">
                За кг
              </label>
              <input
                id="te-kg"
                type="number"
                min="0"
                step="0.0001"
                inputMode="decimal"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={editDraft.price_per_kg}
                onChange={(e) => setEditDraft((d) => ({ ...d, price_per_kg: e.target.value }))}
                disabled={editSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="te-km">
                За км
              </label>
              <input
                id="te-km"
                type="number"
                min="0"
                step="0.0001"
                inputMode="decimal"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={editDraft.price_per_km}
                onChange={(e) => setEditDraft((d) => ({ ...d, price_per_km: e.target.value }))}
                disabled={editSubmitting}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
              <input
                type="checkbox"
                checked={editDraft.is_active}
                onChange={(e) => setEditDraft((d) => ({ ...d, is_active: e.target.checked }))}
                disabled={editSubmitting}
              />
              Активний
            </label>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
