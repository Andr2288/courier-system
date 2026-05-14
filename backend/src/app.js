import express from 'express';
import cors from 'cors';

import { config } from './config.js';
import authRouter from './routes/auth.js';
import clientsRouter from './routes/clients.js';
import couriersRouter from './routes/couriers.js';
import tariffsRouter from './routes/tariffs.js';

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
  app.use('/api/clients', clientsRouter);
  app.use('/api/couriers', couriersRouter);
  app.use('/api/tariffs', tariffsRouter);

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
