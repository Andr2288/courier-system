/**
 * Телефон для збереження: лише цифри, 9–15 (E.164-подібний діапазон).
 * @returns {{ value: string }} | {{ error: string }}
 */
export function parsePhoneForDb(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return { error: 'Вкажіть телефон.' };
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) {
    return { error: 'Телефон має містити від 9 до 15 цифр (допускаються пробіли, дужки, +, дефіс).' };
  }
  return { value: digits };
}

/**
 * @returns {{ value: null }} | {{ value: string }} | {{ error: string }}
 */
export function parseOptionalEmail(value) {
  if (value === undefined || value === null) {
    return { value: null };
  }
  if (typeof value !== 'string') {
    return { error: 'Некоректний email.' };
  }
  const t = value.trim();
  if (!t) {
    return { value: null };
  }
  if (t.length > 255) {
    return { error: 'Email занадто довгий.' };
  }
  // Проста перевірка формату без надмірної суворості
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
    return { error: 'Некоректний формат email.' };
  }
  return { value: t };
}
