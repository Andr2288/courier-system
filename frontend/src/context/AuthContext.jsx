import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { meRequest } from '../api.js';
import { getToken } from '../authStorage.js';

const AuthContext = createContext(null);

export function AuthGate({ children }) {
  const location = useLocation();
  const [state, setState] = useState({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = getToken();
      if (!token) {
        if (!cancelled) setState({ kind: 'redirect' });
        return;
      }
      try {
        const data = await meRequest();
        if (!cancelled) setState({ kind: 'ok', user: data.user });
      } catch {
        if (!cancelled) setState({ kind: 'redirect' });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (state.kind === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Перевірка доступу…
      </div>
    );
  }

  if (state.kind === 'redirect') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <AuthContext.Provider value={{ user: state.user }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth має використовуватись всередині AuthGate.');
  }
  return ctx;
}
