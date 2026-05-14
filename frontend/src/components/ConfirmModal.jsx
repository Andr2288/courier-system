import { useState } from 'react';

import Modal from './Modal.jsx';

/**
 * Підтвердження дії (зокрема видалення) без браузерних alert/confirm.
 */
export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Підтвердити',
  cancelLabel = 'Скасувати',
  danger,
  onClose,
  onConfirm,
}) {
  const [loading, setLoading] = useState(false);

  function handleClose() {
    if (!loading) onClose();
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={handleClose}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50 disabled:opacity-50"
            onClick={handleClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            className={
              danger
                ? 'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50'
                : 'rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50'
            }
            onClick={handleConfirm}
          >
            {loading ? 'Зачекайте…' : confirmLabel}
          </button>
        </div>
      }
    >
      {typeof description === 'string' ? (
        <p className="text-sm leading-relaxed text-ink-muted">{description}</p>
      ) : (
        description
      )}
    </Modal>
  );
}
