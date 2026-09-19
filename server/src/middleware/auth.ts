import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { env } from '../config/env.js';
import { HttpError } from '../lib/httpError.js';

export const userRoles = ['CITIZEN', 'VOLUNTEER', 'RESPONDER', 'COORDINATOR', 'ADMIN'] as const;
export type UserRole = (typeof userRoles)[number];

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return next(new HttpError(401, 'Authentication required'));
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());

  if (!match) {
    return next(new HttpError(401, 'Authentication required'));
  }

  try {
    const token = match[1];

    if (!token) {
      return next(new HttpError(401, 'Invalid or expired token'));
    }

    const decodedToken = jwt.verify(token, env.jwtSecret) as JwtPayload & {
      sub?: string;
      role?: string;
    };

    if (typeof decodedToken.sub !== 'string' || typeof decodedToken.role !== 'string') {
      return next(new HttpError(401, 'Invalid or expired token'));
    }

    const role = decodedToken.role as UserRole;

    if (!userRoles.includes(role)) {
      return next(new HttpError(401, 'Invalid or expired token'));
    }

    req.user = {
      id: decodedToken.sub,
      role,
    };

    return next();
  } catch {
    return next(new HttpError(401, 'Invalid or expired token'));
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Forbidden'));
    }

    return next();
  };
}
