import { Router } from 'express';

import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/couriers', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         c.id,
         c.full_name,
         c.phone,
         c.available,
         (
           SELECT AVG(r.score)
           FROM ratings r
           INNER JOIN shipments s ON s.id = r.shipment_id
           WHERE s.courier_id = c.id
         ) AS avg_rating,
         (
           SELECT COUNT(*)
           FROM shipments s
           WHERE s.courier_id = c.id AND s.delivered_at IS NOT NULL
         ) AS completed_deliveries,
         (
           SELECT AVG(TIMESTAMPDIFF(MINUTE, s.created_at, s.delivered_at))
           FROM shipments s
           WHERE s.courier_id = c.id AND s.delivered_at IS NOT NULL
         ) AS avg_delivery_minutes,
         (
           SELECT COUNT(*)
           FROM complaints co
           INNER JOIN shipments sh ON sh.id = co.shipment_id
           WHERE COALESCE(co.courier_id, sh.courier_id) = c.id
         ) AS complaints_count
       FROM couriers c
       WHERE c.deleted_at IS NULL
       ORDER BY c.full_name ASC`,
    );

    const couriers = rows.map((row) => ({
      id: row.id,
      full_name: row.full_name,
      phone: row.phone,
      available: Boolean(row.available),
      avg_rating:
        row.avg_rating != null && Number.isFinite(Number(row.avg_rating))
          ? Math.round(Number(row.avg_rating) * 100) / 100
          : null,
      completed_deliveries: Number(row.completed_deliveries ?? 0),
      avg_delivery_minutes:
        row.avg_delivery_minutes != null && Number.isFinite(Number(row.avg_delivery_minutes))
          ? Math.round(Number(row.avg_delivery_minutes))
          : null,
      complaints_count: Number(row.complaints_count ?? 0),
    }));

    return res.json({ couriers });
  } catch (err) {
    next(err);
  }
});

export default router;
