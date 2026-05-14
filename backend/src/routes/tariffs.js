import { Router } from 'express';

import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { parseIdParam } from '../util/ids.js';

const router = Router();
router.use(requireAuth);

function parseMoney(value, fieldLabel) {
  if (value === undefined || value === null || value === '') {
    return { error: `Вкажіть ${fieldLabel}.` };
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return { error: `${fieldLabel} має бути невід’ємним числом.` };
  }
  return { value: n };
}

function parseBool01(value, defaultValue) {
  if (value === undefined) return defaultValue;
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;
  return null;
}

function mapTariffRow(row) {
  return {
    ...row,
    base_price: Number(row.base_price),
    price_per_kg: Number(row.price_per_kg),
    price_per_km: Number(row.price_per_km),
    is_active: Boolean(row.is_active),
  };
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, label, base_price, price_per_kg, price_per_km, is_active, created_at, updated_at
       FROM tariffs
       ORDER BY is_active DESC, id ASC`,
    );
    res.json({ tariffs: rows.map(mapTariffRow) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;

    const [rows] = await pool.query(
      `SELECT id, label, base_price, price_per_kg, price_per_km, is_active, created_at, updated_at
       FROM tariffs WHERE id = ? LIMIT 1`,
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Тариф не знайдено.' });
    }
    return res.json({ tariff: mapTariffRow(rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { label } = req.body ?? {};
    const base = parseMoney(req.body?.base_price, 'базову ціну');
    if (base.error) return res.status(400).json({ error: base.error });
    const pkg = parseMoney(req.body?.price_per_kg, 'ставку за кг');
    if (pkg.error) return res.status(400).json({ error: pkg.error });
    const km = parseMoney(req.body?.price_per_km, 'ставку за км');
    if (km.error) return res.status(400).json({ error: km.error });

    const labelTrim =
      typeof label === 'string' && label.trim() ? label.trim().slice(0, 128) : 'tariff';

    const isActive = parseBool01(req.body?.is_active, 1);
    if (isActive === null) {
      return res.status(400).json({ error: 'Некоректне поле «активний».' });
    }

    const [result] = await pool.query(
      `INSERT INTO tariffs (label, base_price, price_per_kg, price_per_km, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [labelTrim, base.value, pkg.value, km.value, isActive],
    );

    const [rows] = await pool.query(`SELECT * FROM tariffs WHERE id = ? LIMIT 1`, [result.insertId]);
    return res.status(201).json({ tariff: mapTariffRow(rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;

    const { label } = req.body ?? {};
    const base = parseMoney(req.body?.base_price, 'базову ціну');
    if (base.error) return res.status(400).json({ error: base.error });
    const pkg = parseMoney(req.body?.price_per_kg, 'ставку за кг');
    if (pkg.error) return res.status(400).json({ error: pkg.error });
    const km = parseMoney(req.body?.price_per_km, 'ставку за км');
    if (km.error) return res.status(400).json({ error: km.error });

    const labelTrim =
      typeof label === 'string' && label.trim() ? label.trim().slice(0, 128) : 'tariff';

    const isActive = parseBool01(req.body?.is_active, 1);
    if (isActive === null) {
      return res.status(400).json({ error: 'Некоректне поле «активний».' });
    }

    const [upd] = await pool.query(
      `UPDATE tariffs SET label = ?, base_price = ?, price_per_kg = ?, price_per_km = ?, is_active = ?
       WHERE id = ?`,
      [labelTrim, base.value, pkg.value, km.value, isActive, id],
    );
    if (upd.affectedRows === 0) {
      return res.status(404).json({ error: 'Тариф не знайдено.' });
    }

    const [rows] = await pool.query(`SELECT * FROM tariffs WHERE id = ? LIMIT 1`, [id]);
    return res.json({ tariff: mapTariffRow(rows[0]) });
  } catch (err) {
    next(err);
  }
});

export default router;
