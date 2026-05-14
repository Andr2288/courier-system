const TOKEN_KEY = 'courier_token';

const SESSION_CLEARED = 'courier-session-cleared';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/** Викликати після примусового очищення токена (наприклад 401), щоб UI синхронізувався. */
export function notifySessionCleared() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_CLEARED));
  }
}

export function subscribeSessionCleared(handler) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener(SESSION_CLEARED, handler);
  return () => window.removeEventListener(SESSION_CLEARED, handler);
}
