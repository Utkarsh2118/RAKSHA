import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
} as const;

function sanitizeUser<T extends { id: string; name: string; email: string; role: string; isActive: boolean }>(
  user: T,
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}

export async function registerUser(name: string, email: string, password: string) {
  const trimmedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!trimmedName) {
    throw new HttpError(400, 'Name is required');
  }

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new HttpError(400, 'Valid email is required');
  }

  if (password.length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters');
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    throw new HttpError(409, 'User with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
    },
    select: publicUserSelect,
  });

  return sanitizeUser(user);
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user) {
    throw new HttpError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new HttpError(401, 'Account is inactive');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn as '1d' | '24h' | number,
    },
  );

  return {
    user: sanitizeUser(user),
    token,
  };
}

export async function getCurrentUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: publicUserSelect,
  });

  if (!user) {
    throw new HttpError(401, 'Authentication required');
  }

  return sanitizeUser(user);
}