/** Нормалізація десяткового вводу (пробіли, кома). */
export function normalizeDecimalInput(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');
}

export function parsePhoneClient(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return { error: 'Вкажіть телефон.' };
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) {
    return {
      error: 'Телефон має містити від 9 до 15 цифр (допускаються пробіли, дужки, +, дефіс).',
    };
  }
  return { value: digits };
}

/** Порожній рядок → value null для API. */
export function parseOptionalEmailClient(email) {
  const t = typeof email === 'string' ? email.trim() : '';
  if (!t) return { value: null };
  if (t.length > 255) return { error: 'Email занадто довгий.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
    return { error: 'Некоректний формат email.' };
  }
  return { value: t };
}

export function validateRequiredName(trimmed, fieldLabel) {
  if (!trimmed) return `Вкажіть ${fieldLabel}.`;
  if (trimmed.length > 255) return `${fieldLabel} — не довше 255 символів.`;
  return null;
}

export function parsePositiveDecimalField(raw, labelUk) {
  const t = normalizeDecimalInput(raw);
  if (!t) return { error: `Вкажіть ${labelUk}.` };
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) {
    return { error: `${labelUk} має бути додатним числом.` };
  }
  return { value: n };
}

export function parseNonNegativeMoneyField(raw, labelUk) {
  const t = normalizeDecimalInput(raw);
  if (!t) return { error: `Вкажіть ${labelUk}.` };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) {
    return { error: `${labelUk} має бути невід’ємним числом.` };
  }
  return { value: n };
}

export function validateTariffLabel(raw) {
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (t.length > 128) return 'Тип тарифу — не довше 128 символів.';
  return null;
}

export function validateShipmentAddresses(a, b) {
  const ta = typeof a === 'string' ? a.trim() : '';
  const tb = typeof b === 'string' ? b.trim() : '';
  if (!ta) return 'Вкажіть адресу пункту А (забір).';
  if (!tb) return 'Вкажіть адресу пункту Б (доставка).';
  if (ta.length > 512 || tb.length > 512) {
    return 'Адреса не довша за 512 символів.';
  }
  return null;
}

export function validateLoginForm(login, password) {
  const l = typeof login === 'string' ? login.trim() : '';
  if (!l) return 'Вкажіть логін.';
  if (l.length > 64) return 'Логін не довший за 64 символи.';
  if (typeof password !== 'string' || !password) return 'Вкажіть пароль.';
  if (password.length > 128) return 'Пароль занадто довгий.';
  return null;
}
