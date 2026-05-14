import jwt from 'jsonwebtoken';

import { config } from '../config.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Потрібна авторизація.' });
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Потрібна авторизація.' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = {
      id: Number(payload.sub),
      login: payload.login,
      role: payload.role,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Недійсний або прострочений токен.' });
  }
}
