import { clearToken, getToken } from './authStorage.js';

async function parseJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function loginRequest(login, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Не вдалося увійти.');
  }
  return data;
}

export async function meRequest() {
  const token = getToken();
  if (!token) {
    throw new Error('Немає токена.');
  }
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    clearToken();
  }
  if (!res.ok) {
    throw new Error(data.error || 'Не вдалося перевірити сесію.');
  }
  return data;
}
