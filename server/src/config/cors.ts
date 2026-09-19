import type { CorsOptions } from 'cors';
import { env } from './env.js';

const localOrigins = new Set([
  env.clientOrigin,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (origin === undefined || localOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
