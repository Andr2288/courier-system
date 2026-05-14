import { Link } from 'react-router-dom';

export default function TrackingPlaceholderPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
        <h1 className="text-xl font-semibold text-ink">Відстеження</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Публічна сторінка за трекінг-кодом з’явиться на кроці реалізації FR-6 (без логіну).
        </p>
        <p className="mt-6">
          <Link className="text-sm font-medium text-brand-600 hover:text-brand-700" to="/">
            На головну
          </Link>
        </p>
      </div>
    </main>
  );
}
