import crypto from 'node:crypto';

const MAX_TRACKING_ATTEMPTS = 8;

export function generateTrackingCode() {
  return `CV-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

/**
 * Вартість за тарифом: база + кг × ставка + км × ставка (округлення до копійок).
 */
export function calculateShipmentPrice(tariff, weightKg, distanceKm) {
  const base = Number(tariff.base_price);
  const perKg = Number(tariff.price_per_kg);
  const perKm = Number(tariff.price_per_km);
  const w = Number(weightKg);
  const d = Number(distanceKm);
  const raw = base + w * perKg + d * perKm;
  return Math.round(raw * 100) / 100;
}

export { MAX_TRACKING_ATTEMPTS };
