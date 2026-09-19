import dotenv from 'dotenv';

dotenv.config();

function readPort(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid PORT: "${value}". Expected an integer between 1 and 65535.`);
  }

  return parsed;
}

function readJwtSecret(): string {
  const value = process.env.JWT_SECRET;

  if (value === undefined || value.trim() === '') {
    throw new Error('Missing JWT_SECRET environment variable.');
  }

  return value.trim();
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: readPort(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: readJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
} as const;

export const isProduction = env.nodeEnv === 'production';
