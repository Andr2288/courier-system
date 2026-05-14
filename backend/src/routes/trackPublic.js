import { Router } from 'express';

import { pool } from '../db.js';
import { ROUTE_EVENT, SHIPMENT_STATUS } from '../constants/logistics.js';

const router = Router();

function sanitizeTrackingCode(raw) {
  const s = String(raw ?? '').trim();
  if (!/^[A-Za-z0-9-]+$/.test(s) || s.length > 32) {
    return null;
  }
  return s;
}

function maskAddress(value) {
  const t = String(value ?? '').trim();
  if (t.length <= 56) return t;
  return `${t.slice(0, 56)}…`;
}

const STATUS_UK = {
  created: 'Створено',
  assigned: 'Призначено кур’єру',
  in_transit: 'В дорозі',
  delivered: 'Доставлено',
};

router.get('/:code', async (req, res, next) => {
  try {
    const code = sanitizeTrackingCode(req.params.code);
    if (!code) {
      return res.status(400).json({ error: 'Некоректний трекінг-код.' });
    }

    const [shipRows] = await pool.query(
      `SELECT id, tracking_code, status, address_pickup, address_delivery
       FROM shipments WHERE tracking_code = ? LIMIT 1`,
      [code],
    );
    if (shipRows.length === 0) {
      return res.status(404).json({ error: 'Відправлення за цим кодом не знайдено.' });
    }
    const s = shipRows[0];

    const [logRows] = await pool.query(
      `SELECT event_type, comment, created_at
       FROM route_logs WHERE shipment_id = ?
       ORDER BY created_at ASC, id ASC`,
      [s.id],
    );

    const events = logRows.map((r) => ({
      event_type: r.event_type,
      comment: r.comment,
      created_at: r.created_at,
    }));

    return res.json({
      tracking_code: s.tracking_code,
      status: s.status,
      status_label: STATUS_UK[s.status] ?? s.status,
      address_from_summary: maskAddress(s.address_pickup),
      address_to_summary: maskAddress(s.address_delivery),
      events,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
