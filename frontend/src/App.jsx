import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';

import { AuthGate } from './context/AuthContext.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import PanelPage from './pages/PanelPage.jsx';
import TrackingPlaceholderPage from './pages/TrackingPlaceholderPage.jsx';

function Shell({ children }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white shadow-card"
              aria-hidden
            >
              C
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Кур’єрська служба</p>
              <p className="text-xs text-ink-muted">MVP</p>
            </div>
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/track" element={<TrackingPlaceholderPage />} />
          <Route
            path="/panel"
            element={
              <AuthGate>
                <PanelPage />
              </AuthGate>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
