import { Router } from 'express';

import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { parseIdParam } from '../util/ids.js';
import {
  calculateShipmentPrice,
  generateTrackingCode,
  MAX_TRACKING_ATTEMPTS,
} from '../services/shipmentService.js';

const router = Router();
router.use(requireAuth);

function mapShipmentListRow(row) {
  return {
    id: row.id,
    tracking_code: row.tracking_code,
    status: row.status,
    distance_km: Number(row.distance_km),
    calculated_price: Number(row.calculated_price),
    created_at: row.created_at,
    client_id: row.client_id,
    client_name: row.client_name,
    address_pickup: row.address_pickup,
    address_delivery: row.address_delivery,
    weight_kg: row.weight_kg != null ? Number(row.weight_kg) : null,
    length_cm: row.length_cm != null ? Number(row.length_cm) : null,
    width_cm: row.width_cm != null ? Number(row.width_cm) : null,
    height_cm: row.height_cm != null ? Number(row.height_cm) : null,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.tracking_code, s.status, s.distance_km, s.calculated_price, s.created_at,
              s.client_id, s.address_pickup, s.address_delivery,
              c.name AS client_name,
              p.weight_kg, p.length_cm, p.width_cm, p.height_cm
       FROM shipments s
       INNER JOIN clients c ON c.id = s.client_id AND c.deleted_at IS NULL
       LEFT JOIN packages p ON p.shipment_id = s.id
       ORDER BY s.id DESC`,
    );
    res.json({ shipments: rows.map(mapShipmentListRow) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;

    const [rows] = await pool.query(
      `SELECT s.id, s.tracking_code, s.status, s.distance_km, s.calculated_price, s.created_at,
              s.updated_at, s.delivered_at, s.client_id, s.courier_id, s.address_pickup, s.address_delivery,
              c.name AS client_name,
              p.id AS package_id, p.weight_kg, p.length_cm, p.width_cm, p.height_cm
       FROM shipments s
       INNER JOIN clients c ON c.id = s.client_id AND c.deleted_at IS NULL
       LEFT JOIN packages p ON p.shipment_id = s.id
       WHERE s.id = ?
       LIMIT 1`,
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Відправлення не знайдено.' });
    }
    const row = rows[0];
    const shipment = {
      id: row.id,
      tracking_code: row.tracking_code,
      status: row.status,
      distance_km: Number(row.distance_km),
      calculated_price: Number(row.calculated_price),
      created_at: row.created_at,
      updated_at: row.updated_at,
      delivered_at: row.delivered_at,
      client_id: row.client_id,
      client_name: row.client_name,
      courier_id: row.courier_id,
      address_pickup: row.address_pickup,
      address_delivery: row.address_delivery,
    };
    const pkg = row.package_id
      ? {
          id: row.package_id,
          weight_kg: Number(row.weight_kg),
          length_cm: Number(row.length_cm),
          width_cm: Number(row.width_cm),
          height_cm: Number(row.height_cm),
        }
      : null;
    return res.json({ shipment, package: pkg });
  } catch (err) {
    next(err);
  }
});

function parsePositiveDecimal(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return { error: `${label} має бути додатним числом.` };
  }
  return { value: n };
}

router.post('/', async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const {
      client_id,
      address_pickup,
      address_delivery,
      distance_km,
      length_cm,
      width_cm,
      height_cm,
      weight_kg,
    } = body;

    const clientId = Number(client_id);
    if (!Number.isInteger(clientId) || clientId < 1) {
      return res.status(400).json({ error: 'Оберіть клієнта.' });
    }

    if (typeof address_pickup !== 'string' || !address_pickup.trim()) {
      return res.status(400).json({ error: 'Вкажіть адресу пункту А (забір).' });
    }
    if (typeof address_delivery !== 'string' || !address_delivery.trim()) {
      return res.status(400).json({ error: 'Вкажіть адресу пункту Б (доставка).' });
    }
    const addrA = address_pickup.trim().slice(0, 512);
    const addrB = address_delivery.trim().slice(0, 512);

    const d = parsePositiveDecimal(distance_km, 'Відстань');
    if (d.error) return res.status(400).json({ error: d.error });

    const L = parsePositiveDecimal(length_cm, 'Довжина');
    if (L.error) return res.status(400).json({ error: L.error });
    const W = parsePositiveDecimal(width_cm, 'Ширина');
    if (W.error) return res.status(400).json({ error: W.error });
    const H = parsePositiveDecimal(height_cm, 'Висота');
    if (H.error) return res.status(400).json({ error: H.error });
    const weight = parsePositiveDecimal(weight_kg, 'Вага');
    if (weight.error) return res.status(400).json({ error: weight.error });

    const [[client]] = await pool.query(
      `SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [clientId],
    );
    if (!client) {
      return res.status(400).json({ error: 'Клієнта не знайдено або він видалений.' });
    }

    const [tariffRows] = await pool.query(
      `SELECT id, base_price, price_per_kg, price_per_km FROM tariffs WHERE is_active = 1 ORDER BY id ASC LIMIT 1`,
    );
    if (tariffRows.length === 0) {
      return res.status(400).json({ error: 'Немає активного тарифу. Увімкніть тариф у довіднику.' });
    }
    const tariff = tariffRows[0];
    const calculatedPrice = calculateShipmentPrice(tariff, weight.value, d.value);

    const conn = await pool.getConnection();
    let shipmentId;
    let trackingCode;

    try {
      await conn.beginTransaction();

      for (let attempt = 0; attempt < MAX_TRACKING_ATTEMPTS; attempt += 1) {
        trackingCode = generateTrackingCode();
        try {
          const [ins] = await conn.query(
            `INSERT INTO shipments (
            client_id, tracking_code, address_pickup, address_delivery,
            distance_km, status, calculated_price
          ) VALUES (?, ?, ?, ?, ?, 'created', ?)`,
            [clientId, trackingCode, addrA, addrB, d.value, calculatedPrice],
          );
          shipmentId = ins.insertId;
          break;
        } catch (e) {
          if (e.code === 'ER_DUP_ENTRY' && attempt < MAX_TRACKING_ATTEMPTS - 1) {
            continue;
          }
          throw e;
        }
      }

      if (!shipmentId) {
        await conn.rollback();
        return res.status(500).json({ error: 'Не вдалося згенерувати унікальний трекінг-код.' });
      }

      await conn.query(
        `INSERT INTO packages (shipment_id, length_cm, width_cm, height_cm, weight_kg)
       VALUES (?, ?, ?, ?, ?)`,
        [shipmentId, L.value, W.value, H.value, weight.value],
      );

      await conn.query(
        `INSERT INTO route_logs (shipment_id, event_type, comment)
       VALUES (?, 'created', ?)`,
        [shipmentId, 'Відправлення створено'],
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const [createdRows] = await pool.query(
      `SELECT s.id, s.tracking_code, s.status, s.distance_km, s.calculated_price, s.created_at,
              s.client_id, s.address_pickup, s.address_delivery,
              c.name AS client_name,
              p.weight_kg, p.length_cm, p.width_cm, p.height_cm
       FROM shipments s
       INNER JOIN clients c ON c.id = s.client_id
       LEFT JOIN packages p ON p.shipment_id = s.id
       WHERE s.id = ?
       LIMIT 1`,
      [shipmentId],
    );
    const created = createdRows[0];

    return res.status(201).json({
      shipment: mapShipmentListRow(created),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
