import { Router } from 'express';
import prisma from '../config/database';
import { createCrudRouter } from '../utils/crud';
import { ValidationError, BusinessRuleError } from '../utils/errors';
import bcrypt from 'bcrypt';

const router = Router();

router.use(
  '/',
  createCrudRouter({
    model: 'user',
    entity: 'User',
    prefixKey: 'user',
    tableName: 'users',
    softDelete: true,
    searchFields: ['businessId', 'email', 'firstName', 'lastName', 'phone'],
    filterFields: ['roleId', 'isActive'],
    includes: { role: true },
    omit: { passwordHash: true, refreshToken: true },
    permissions: {
      read: 'users.read',
      create: 'users.create',
      update: 'users.update',
      remove: 'users.delete',
    },
    createBody: async (_req, body) => {
      if (!body.email || !body.password) {
        throw new ValidationError('Email and password are required');
      }
      const email = String(body.email).toLowerCase();
      if (await prisma.user.findUnique({ where: { email } })) {
        throw new BusinessRuleError('A user with this email already exists');
      }
      const { password, ...rest } = body;
      const roleId = Number(body.roleId);
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) {
        throw new ValidationError('Invalid roleId');
      }
      if (rest.firstName === undefined || String(rest.firstName).trim() === '') {
        throw new ValidationError('firstName is required');
      }
      if (rest.lastName === undefined || String(rest.lastName).trim() === '') {
        throw new ValidationError('lastName is required');
      }
      return {
        ...rest,
        email,
        passwordHash: await bcrypt.hash(String(password), 10),
        roleId: role.id,
      };
    },
    updateBody: async (_req, body) => {
      const { password, email, ...rest } = body;
      if (email) {
        rest.email = String(email).toLowerCase();
      }
      if (body.roleId !== undefined) {
        const role = await prisma.role.findUnique({ where: { id: Number(body.roleId) } });
        if (!role) {
          throw new ValidationError('Invalid roleId');
        }
        rest.roleId = role.id;
      }
      if (password) {
        rest.passwordHash = await bcrypt.hash(String(password), 10);
      }
      return rest;
    },
    beforeRemove: async (req, id) => {
      if (req.user?.userId === id) {
        throw new BusinessRuleError('You cannot delete your own account');
      }
    },
  })
);

export default router;