import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthRequest, authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticationError, ValidationError } from '../utils/errors';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import bcrypt from 'bcrypt';
import { createAuditLog } from '../utils/helpers';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { role: true },
  });

  if (!user || user.deletedAt) {
    throw new AuthenticationError('Invalid email or password');
  }

  if (!user.isActive) {
    throw new AuthenticationError('Your account has been deactivated');
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    throw new AuthenticationError('Invalid email or password');
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
  });
  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken, lastLoginAt: new Date() },
  });

  await createAuditLog(req, 'LOGIN', 'user', user.id, undefined, { email: user.email });

  res.json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      businessId: user.businessId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      roleName: user.role.name,
    },
  });
});

export const refresh = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body as { refreshToken: string };

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { role: true },
  });

  if (!user || !user.isActive || user.deletedAt || user.refreshToken !== refreshToken) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
  });
  const newRefreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: newRefreshToken },
  });

  res.json({ success: true, accessToken, refreshToken: newRefreshToken });
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.userId) {
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { refreshToken: null },
    });
    await createAuditLog(req, 'LOGOUT', 'user', req.user.userId);
  }
  res.json({ success: true });
});

export const me = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
  if (!user) {
    throw new ValidationError('User not found');
  }

  const role = user.role;
  res.json({
    success: true,
    user: {
      id: user.id,
      businessId: user.businessId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      roleId: role.id,
      roleName: role.name,
      permissions: role.permissions.map((rp) => rp.permission.code),
    },
  });
});

export const authRouter = {
  protect: authenticate,
};