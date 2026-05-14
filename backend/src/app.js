import express from 'express';
import cors from 'cors';

import { config } from './config.js';
import authRouter from './routes/auth.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ error: 'Не знайдено.' });
      return;
    }
    next();
  });

  app.use((err, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Внутрішня помилка сервера.' });
  });

  return app;
}
