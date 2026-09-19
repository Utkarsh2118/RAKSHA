import cors from 'cors';
import express from 'express';

import { corsOptions } from './config/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { emergencyRouter } from './modules/emergency/emergency.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  app.use(cors(corsOptions));
  app.use(express.json());

  app.use('/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/emergency-requests', emergencyRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}