import { Router } from 'express';

import { ACTIVE_SHIPMENT_IN_SQL, ACTIVE_SHIPMENT_STATUSES } from '../constants/shipments.js';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { parseIdParam } from '../util/ids.js';

const router = Router();
router.use(requireAuth);

function normalizeEmail(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t.length === 0 ? null : t;
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, phone, email, created_at, updated_at
       FROM clients
       WHERE deleted_at IS NULL
       ORDER BY name ASC`,
    );
    res.json({ clients: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;

    const [rows] = await pool.query(
      `SELECT id, name, phone, email, created_at, updated_at
       FROM clients
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Клієнта не знайдено.' });
    }
    return res.json({ client: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, phone, email } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Вкажіть назву клієнта.' });
    }
    if (typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ error: 'Вкажіть телефон.' });
    }
    const nameTrim = name.trim();
    const phoneTrim = phone.trim();
    if (nameTrim.length > 255 || phoneTrim.length > 32) {
      return res.status(400).json({ error: 'Занадто довге значення поля.' });
    }

    const emailNorm = normalizeEmail(email);
    if (emailNorm && emailNorm.length > 255) {
      return res.status(400).json({ error: 'Email занадто довгий.' });
    }

    const [result] = await pool.query(
      `INSERT INTO clients (name, phone, email) VALUES (?, ?, ?)`,
      [nameTrim, phoneTrim, emailNorm],
    );

    const [rows] = await pool.query(
      `SELECT id, name, phone, email, created_at, updated_at FROM clients WHERE id = ? LIMIT 1`,
      [result.insertId],
    );
    return res.status(201).json({ client: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;

    const { name, phone, email } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Вкажіть назву клієнта.' });
    }
    if (typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ error: 'Вкажіть телефон.' });
    }
    const nameTrim = name.trim();
    const phoneTrim = phone.trim();
    const emailNorm = normalizeEmail(email);
    if (nameTrim.length > 255 || phoneTrim.length > 32) {
      return res.status(400).json({ error: 'Занадто довге значення поля.' });
    }
    if (emailNorm && emailNorm.length > 255) {
      return res.status(400).json({ error: 'Email занадто довгий.' });
    }

    const [upd] = await pool.query(
      `UPDATE clients SET name = ?, phone = ?, email = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [nameTrim, phoneTrim, emailNorm, id],
    );
    if (upd.affectedRows === 0) {
      return res.status(404).json({ error: 'Клієнта не знайдено.' });
    }

    const [rows] = await pool.query(
      `SELECT id, name, phone, email, created_at, updated_at FROM clients WHERE id = ? LIMIT 1`,
      [id],
    );
    return res.json({ client: rows[0] });
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
       WHERE client_id = ? AND status IN (${ACTIVE_SHIPMENT_IN_SQL})`,
      [id, ...ACTIVE_SHIPMENT_STATUSES],
    );
    if (Number(block[0].c) > 0) {
      return res.status(409).json({
        error: 'Неможливо видалити: є активні відправлення з цим клієнтом.',
      });
    }

    const [upd] = await pool.query(
      `UPDATE clients SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    if (upd.affectedRows === 0) {
      return res.status(404).json({ error: 'Клієнта не знайдено.' });
    }
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
