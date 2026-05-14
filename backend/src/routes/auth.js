import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { login, password } = req.body ?? {};

    if (typeof login !== 'string' || typeof password !== 'string' || !login.trim() || !password) {
      return res.status(400).json({ error: 'Вкажіть логін і пароль.' });
    }

    const trimmedLogin = login.trim();

    const [rows] = await pool.query(
      'SELECT id, login, password_hash, role FROM users WHERE login = ? LIMIT 1',
      [trimmedLogin],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Невірний логін або пароль.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Невірний логін або пароль.' });
    }

    const token = jwt.sign(
      { sub: String(user.id), login: user.login, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn },
    );

    return res.json({
      token,
      user: { id: user.id, login: user.login, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

export default router;
