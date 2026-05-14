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
      `SELECT s.id, s.tracking_code, s.status, s.address_pickup, s.address_delivery,
              rt.score AS rating_score
       FROM shipments s
       LEFT JOIN ratings rt ON rt.shipment_id = s.id
       WHERE s.tracking_code = ? LIMIT 1`,
      [code],
    );
    if (shipRows.length === 0) {
      return res.status(404).json({ error: 'Відправлення за цим кодом не знайдено.' });
    }
    const s = shipRows[0];

    const [logRows] = await pool.query(
      `SELECT event_type, comment, created_at
       FROM route_logs WHERE shipment_id = ?
       ORDER BY created_at DESC, id DESC`,
      [s.id],
    );

    const events = logRows.map((r) => ({
      event_type: r.event_type,
      comment: r.comment,
      created_at: r.created_at,
    }));

    const [feedbackRows] = await pool.query(
      `SELECT id, body, created_at
       FROM complaints
       WHERE shipment_id = ?
       ORDER BY created_at DESC, id DESC`,
      [s.id],
    );
    const feedbacks = feedbackRows.map((r) => ({
      id: r.id,
      body: r.body,
      created_at: r.created_at,
    }));

    const rating =
      s.rating_score != null && s.rating_score !== undefined
        ? { score: Number(s.rating_score) }
        : null;

    return res.json({
      tracking_code: s.tracking_code,
      status: s.status,
      status_label: STATUS_UK[s.status] ?? s.status,
      address_from_summary: maskAddress(s.address_pickup),
      address_to_summary: maskAddress(s.address_delivery),
      events,
      rating,
      feedbacks,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:code/rating', async (req, res, next) => {
  try {
    const code = sanitizeTrackingCode(req.params.code);
    if (!code) {
      return res.status(400).json({ error: 'Некоректний трекінг-код.' });
    }

    const raw = req.body?.score;
    const score = Number(raw);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Оцінка має бути цілим числом від 1 до 5.' });
    }

    const [[ship]] = await pool.query(
      `SELECT id, status FROM shipments WHERE tracking_code = ? LIMIT 1`,
      [code],
    );
    if (!ship) {
      return res.status(404).json({ error: 'Відправлення за цим кодом не знайдено.' });
    }
    if (ship.status !== SHIPMENT_STATUS.DELIVERED) {
      return res.status(400).json({
        error: 'Оцінку можна залишити лише після доставки посилки.',
      });
    }

    await pool.query(
      `INSERT INTO ratings (shipment_id, score) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE score = VALUES(score)`,
      [ship.id, score],
    );

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/:code/feedback', async (req, res, next) => {
  try {
    const code = sanitizeTrackingCode(req.params.code);
    if (!code) {
      return res.status(400).json({ error: 'Некоректний трекінг-код.' });
    }

    const bodyText = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (bodyText.length < 3) {
      return res.status(400).json({ error: 'Текст відгуку має бути не коротшим за 3 символи.' });
    }
    if (bodyText.length > 16000) {
      return res.status(400).json({ error: 'Текст відгуку занадто довгий.' });
    }

    const [[ship]] = await pool.query(
      `SELECT id, courier_id, status FROM shipments WHERE tracking_code = ? LIMIT 1`,
      [code],
    );
    if (!ship) {
      return res.status(404).json({ error: 'Відправлення за цим кодом не знайдено.' });
    }
    if (ship.status !== SHIPMENT_STATUS.DELIVERED) {
      return res.status(400).json({
        error: 'Відгук можна залишити лише після доставки посилки.',
      });
    }

    const rawCourierId = ship.courier_id;
    let courierId = null;
    if (rawCourierId != null && rawCourierId !== '') {
      const n = Number(rawCourierId);
      if (Number.isFinite(n) && n > 0) {
        courierId = Math.trunc(n);
      }
    }

    const [ins] = await pool.query(
      `INSERT INTO complaints (shipment_id, courier_id, body) VALUES (?, ?, ?)`,
      [ship.id, courierId, bodyText],
    );

    const insertId = ins.insertId;
    const [[created]] = await pool.query(
      `SELECT id, body, created_at FROM complaints WHERE id = ? LIMIT 1`,
      [insertId],
    );

    return res.status(201).json({ feedback: created });
  } catch (err) {
    next(err);
  }
});

export default router;
