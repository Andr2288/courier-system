import { useEffect } from 'react';

/**
 * Базове модальне вікно: Escape, клік по підкладці, блокування прокрутки body.
 */
export default function Modal({ isOpen, title, onClose, children, footer }) {
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 z-0 bg-slate-900/50"
        aria-label="Закрити вікно"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className="relative z-10 max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 id="modal-title" className="text-base font-semibold text-ink">
              {title}
            </h2>
            <button
              type="button"
              className="rounded-lg p-1.5 text-xl leading-none text-ink-muted hover:bg-slate-100 hover:text-ink"
              onClick={onClose}
              aria-label="Закрити"
            >
              ×
            </button>
          </header>
        ) : null}
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-slate-100 px-5 py-3">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
}
