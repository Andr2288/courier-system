import { Router } from 'express';

import { pool } from '../db.js';
import { ROUTE_EVENT, SHIPMENT_STATUS } from '../constants/logistics.js';
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
              co.full_name AS courier_name,
              p.id AS package_id, p.weight_kg, p.length_cm, p.width_cm, p.height_cm,
              rt.score AS rating_score
       FROM shipments s
       INNER JOIN clients c ON c.id = s.client_id AND c.deleted_at IS NULL
       LEFT JOIN couriers co ON co.id = s.courier_id AND co.deleted_at IS NULL
       LEFT JOIN packages p ON p.shipment_id = s.id
       LEFT JOIN ratings rt ON rt.shipment_id = s.id
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
      courier_name: row.courier_name ?? null,
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
    const [logRows] = await pool.query(
      `SELECT id, event_type, comment, created_at
       FROM route_logs WHERE shipment_id = ?
       ORDER BY created_at ASC, id ASC`,
      [id],
    );

    const [complaintRows] = await pool.query(
      `SELECT id, body, created_at
       FROM complaints
       WHERE shipment_id = ?
       ORDER BY created_at DESC, id DESC`,
      [id],
    );

    const rating =
      row.rating_score != null && row.rating_score !== undefined
        ? { score: Number(row.rating_score) }
        : null;

    return res.json({
      shipment,
      package: pkg,
      route_logs: logRows,
      rating,
      complaints: complaintRows,
    });
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

router.post('/:id/assign', async (req, res, next) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;

    const courierId = Number(req.body?.courier_id);
    if (!Number.isInteger(courierId) || courierId < 1) {
      return res.status(400).json({ error: 'Оберіть кур’єра.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[ship]] = await conn.query(
        `SELECT id, status, courier_id FROM shipments WHERE id = ? FOR UPDATE`,
        [id],
      );
      if (!ship) {
        await conn.rollback();
        return res.status(404).json({ error: 'Відправлення не знайдено.' });
      }
      if (ship.status === SHIPMENT_STATUS.DELIVERED) {
        await conn.rollback();
        return res.status(409).json({ error: 'Неможливо змінити кур’єра: відправлення вже доставлено.' });
      }

      const [[courier]] = await conn.query(
        `SELECT id, full_name FROM couriers WHERE id = ? AND deleted_at IS NULL AND available = 1 LIMIT 1`,
        [courierId],
      );
      if (!courier) {
        await conn.rollback();
        return res.status(400).json({ error: 'Кур’єра не знайдено або він недоступний.' });
      }

      const nextStatus =
        ship.status === SHIPMENT_STATUS.CREATED ? SHIPMENT_STATUS.ASSIGNED : ship.status;

      await conn.query(
        `UPDATE shipments SET courier_id = ?, status = ? WHERE id = ?`,
        [courierId, nextStatus, id],
      );

      const logComment =
        ship.courier_id && Number(ship.courier_id) !== courierId
          ? `Перепризначено на ${courier.full_name}`
          : `Призначено кур’єра: ${courier.full_name}`;

      await conn.query(
        `INSERT INTO route_logs (shipment_id, event_type, comment)
         VALUES (?, ?, ?)`,
        [id, ROUTE_EVENT.COURIER_ASSIGNED, logComment],
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/:id/events', async (req, res, next) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;

    const eventType = req.body?.event_type;
    const allowed = [ROUTE_EVENT.PICKED_UP, ROUTE_EVENT.DELIVERED, ROUTE_EVENT.NOTE];
    if (typeof eventType !== 'string' || !allowed.includes(eventType)) {
      return res.status(400).json({ error: 'Некоректний тип події.' });
    }

    let comment =
      typeof req.body?.comment === 'string' ? req.body.comment.trim().slice(0, 512) : '';
    if (eventType === ROUTE_EVENT.NOTE && !comment) {
      return res.status(400).json({ error: 'Для нотатки вкажіть текст.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[ship]] = await conn.query(
        `SELECT id, status FROM shipments WHERE id = ? FOR UPDATE`,
        [id],
      );
      if (!ship) {
        await conn.rollback();
        return res.status(404).json({ error: 'Відправлення не знайдено.' });
      }
      if (ship.status === SHIPMENT_STATUS.DELIVERED) {
        await conn.rollback();
        return res.status(409).json({ error: 'Відправлення вже доставлено.' });
      }

      let logComment = comment || null;

      if (eventType === ROUTE_EVENT.PICKED_UP) {
        if (ship.status !== SHIPMENT_STATUS.ASSIGNED) {
          await conn.rollback();
          return res.status(400).json({
            error: 'Подію «Забрано» можна додати лише після призначення кур’єра (статус «Призначено»).',
          });
        }
        await conn.query(
          `UPDATE shipments SET status = ? WHERE id = ?`,
          [SHIPMENT_STATUS.IN_TRANSIT, id],
        );
        if (!logComment) logComment = 'Посилку забрано, в дорозі';
      } else if (eventType === ROUTE_EVENT.DELIVERED) {
        if (
          ship.status !== SHIPMENT_STATUS.ASSIGNED &&
          ship.status !== SHIPMENT_STATUS.IN_TRANSIT
        ) {
          await conn.rollback();
          return res.status(400).json({
            error: 'Доставку можна зафіксувати лише зі статусів «Призначено» або «В дорозі».',
          });
        }
        await conn.query(
          `UPDATE shipments SET status = ?, delivered_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [SHIPMENT_STATUS.DELIVERED, id],
        );
        if (!logComment) logComment = 'Доставлено отримувачу';
      } else if (eventType === ROUTE_EVENT.NOTE) {
        // статус без змін
      }

      await conn.query(
        `INSERT INTO route_logs (shipment_id, event_type, comment) VALUES (?, ?, ?)`,
        [id, eventType, logComment],
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/:id/rating', async (req, res, next) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;

    const raw = req.body?.score;
    const score = Number(raw);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Оцінка має бути цілим числом від 1 до 5.' });
    }

    const [[ship]] = await pool.query(`SELECT id, status FROM shipments WHERE id = ? LIMIT 1`, [id]);
    if (!ship) {
      return res.status(404).json({ error: 'Відправлення не знайдено.' });
    }
    if (ship.status !== SHIPMENT_STATUS.DELIVERED) {
      return res
        .status(400)
        .json({ error: 'Оцінку можна залишити лише після доставки відправлення.' });
    }

    await pool.query(
      `INSERT INTO ratings (shipment_id, score) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE score = VALUES(score)`,
      [id, score],
    );

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/:id/complaints', async (req, res, next) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;

    const bodyText = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (bodyText.length < 3) {
      return res.status(400).json({ error: 'Текст скарги має бути не коротшим за 3 символи.' });
    }
    if (bodyText.length > 16000) {
      return res.status(400).json({ error: 'Текст скарги занадто довгий.' });
    }

    const [[ship]] = await pool.query(
      `SELECT id, courier_id FROM shipments WHERE id = ? LIMIT 1`,
      [id],
    );
    if (!ship) {
      return res.status(404).json({ error: 'Відправлення не знайдено.' });
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
      [id, courierId, bodyText],
    );

    const insertId = ins.insertId;
    const [[created]] = await pool.query(
      `SELECT id, shipment_id, courier_id, body, created_at
       FROM complaints WHERE id = ? LIMIT 1`,
      [insertId],
    );

    return res.status(201).json({ complaint: created });
  } catch (err) {
    next(err);
  }
});

export default router;
