/** Нормалізація десяткового вводу (пробіли, кома як роздільник). */
export function normalizeDecimalInput(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');
}
