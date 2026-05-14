import { Router } from 'express';

import { ACTIVE_SHIPMENT_IN_SQL, ACTIVE_SHIPMENT_STATUSES } from '../constants/shipments.js';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { parseIdParam } from '../util/ids.js';
import { parsePhoneForDb } from '../util/contactValidation.js';

const router = Router();
router.use(requireAuth);

function parseAvailable(body) {
  if (body.available === undefined) return 1;
  if (body.available === true || body.available === 1 || body.available === '1') return 1;
  if (body.available === false || body.available === 0 || body.available === '0') return 0;
  return null;
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, phone, available, created_at, updated_at
       FROM couriers
       WHERE deleted_at IS NULL
       ORDER BY full_name ASC`,
    );
    const couriers = rows.map((r) => ({
      ...r,
      available: Boolean(r.available),
    }));
    res.json({ couriers });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;

    const [rows] = await pool.query(
      `SELECT id, full_name, phone, available, created_at, updated_at
       FROM couriers
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Кур’єра не знайдено.' });
    }
    const c = rows[0];
    return res.json({ courier: { ...c, available: Boolean(c.available) } });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { full_name, phone } = req.body ?? {};
    if (typeof full_name !== 'string' || !full_name.trim()) {
      return res.status(400).json({ error: 'Вкажіть ПІБ кур’єра.' });
    }
    if (typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ error: 'Вкажіть телефон.' });
    }
    const nameTrim = full_name.trim();
    if (nameTrim.length > 255) {
      return res.status(400).json({ error: 'Занадто довге ПІБ кур’єра.' });
    }

    const phoneParsed = parsePhoneForDb(phone);
    if (phoneParsed.error) {
      return res.status(400).json({ error: phoneParsed.error });
    }

    const available = parseAvailable(req.body ?? {});
    if (available === null) {
      return res.status(400).json({ error: 'Некоректне поле «доступний».' });
    }

    const [result] = await pool.query(
      `INSERT INTO couriers (full_name, phone, available) VALUES (?, ?, ?)`,
      [nameTrim, phoneParsed.value, available],
    );

    const [rows] = await pool.query(
      `SELECT id, full_name, phone, available, created_at, updated_at FROM couriers WHERE id = ? LIMIT 1`,
      [result.insertId],
    );
    const c = rows[0];
    return res.status(201).json({ courier: { ...c, available: Boolean(c.available) } });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;

    const { full_name, phone } = req.body ?? {};
    if (typeof full_name !== 'string' || !full_name.trim()) {
      return res.status(400).json({ error: 'Вкажіть ПІБ кур’єра.' });
    }
    if (typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ error: 'Вкажіть телефон.' });
    }
    const nameTrim = full_name.trim();
    if (nameTrim.length > 255) {
      return res.status(400).json({ error: 'Занадто довге ПІБ кур’єра.' });
    }

    const phoneParsed = parsePhoneForDb(phone);
    if (phoneParsed.error) {
      return res.status(400).json({ error: phoneParsed.error });
    }

    const available = parseAvailable(req.body ?? {});
    if (available === null) {
      return res.status(400).json({ error: 'Некоректне поле «доступний».' });
    }

    const [upd] = await pool.query(
      `UPDATE couriers SET full_name = ?, phone = ?, available = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [nameTrim, phoneParsed.value, available, id],
    );
    if (upd.affectedRows === 0) {
      return res.status(404).json({ error: 'Кур’єра не знайдено.' });
    }

    const [rows] = await pool.query(
      `SELECT id, full_name, phone, available, created_at, updated_at FROM couriers WHERE id = ? LIMIT 1`,
      [id],
    );
    const c = rows[0];
    return res.json({ courier: { ...c, available: Boolean(c.available) } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;

    const [block] = await pool.query(
      `SELECT COUNT(*) AS c FROM shipments
       WHERE courier_id = ? AND status IN (${ACTIVE_SHIPMENT_IN_SQL})`,
      [id, ...ACTIVE_SHIPMENT_STATUSES],
    );
    if (Number(block[0].c) > 0) {
      return res.status(409).json({
        error: 'Неможливо видалити: кур’єр призначений на активне відправлення.',
      });
    }

    const [upd] = await pool.query(
      `UPDATE couriers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    if (upd.affectedRows === 0) {
      return res.status(404).json({ error: 'Кур’єра не знайдено.' });
    }
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
