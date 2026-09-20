// hello this is vishal project
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AuthorizationError } from '../utils/errors';
import prisma from '../config/database';

/**
 * RBAC middleware — checks if the authenticated user's role has the required permission.
 * Authorization is enforced on the BACKEND, not just by hiding UI elements.
 */
export function requirePermission(...requiredPermissions: string[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required before authorization check');
      }

      // Admin role has all permissions
      if (req.user.roleName === 'Admin') {
        return next();
      }

      // Fetch user's permissions from DB
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { roleId: req.user.roleId },
        include: { permission: true },
      });

      const userPermissions = rolePermissions.map((rp) => rp.permission.code);

      // Check if user has ALL required permissions
      const hasAllPermissions = requiredPermissions.every((p) => userPermissions.includes(p));

      if (!hasAllPermissions) {
        const missing = requiredPermissions.filter((p) => !userPermissions.includes(p));
        throw new AuthorizationError(
          `You do not have permission to perform this action. Missing: ${missing.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require any one of the listed permissions (OR logic)
 */
export function requireAnyPermission(...permissions: string[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      if (req.user.roleName === 'Admin') {
        return next();
      }

      const rolePermissions = await prisma.rolePermission.findMany({
        where: { roleId: req.user.roleId },
        include: { permission: true },
      });

      const userPermissions = rolePermissions.map((rp) => rp.permission.code);
      const hasAny = permissions.some((p) => userPermissions.includes(p));

      if (!hasAny) {
        throw new AuthorizationError('You do not have permission to perform this action');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
