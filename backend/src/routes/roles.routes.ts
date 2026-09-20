import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError } from '../utils/errors';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('users.read'),
  asyncHandler(async (_req: AuthRequest, res) => {
    const roles = await prisma.role.findMany({
      orderBy: { id: 'asc' },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    res.json(roles);
  })
);

router.get(
  '/:id',
  authenticate,
  requirePermission('users.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const role = await prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) {
      throw new NotFoundError('Role', id);
    }
    res.json(role);
  })
);

router.get(
  '/:id/permissions',
  authenticate,
  requirePermission('users.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: id },
      include: { permission: true },
    });
    res.json(rolePermissions.map((rp) => rp.permission));
  })
);

export default router;