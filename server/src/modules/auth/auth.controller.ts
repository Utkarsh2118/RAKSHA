import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../lib/httpError.js';
import { getCurrentUserById, loginUser, registerUser } from './auth.service.js';

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const name = asString(req.body?.name).trim();
    const email = asString(req.body?.email).trim().toLowerCase();
    const password = asString(req.body?.password);

    if (!name) {
      throw new HttpError(400, 'Name is required');
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, 'Valid email is required');
    }

    if (password.length < 6) {
      throw new HttpError(400, 'Password must be at least 6 characters');
    }

    const user = await registerUser(name, email, password);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const email = asString(req.body?.email).trim().toLowerCase();
    const password = asString(req.body?.password);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, 'Valid email is required');
    }

    if (!password) {
      throw new HttpError(400, 'Password is required');
    }

    const result = await loginUser(email, password);

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new HttpError(401, 'Authentication required');
    }

    const user = await getCurrentUserById(req.user.id);

    res.status(200).json({
      status: 'success',
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function adminTest(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.status(200).json({
      status: 'success',
      message: 'Admin access granted',
    });
  } catch (error) {
    next(error);
  }
}