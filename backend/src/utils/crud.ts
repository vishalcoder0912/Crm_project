// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { NotFoundError, ValidationError } from './errors';
import { parsePaginationParams, buildPaginatedResult, getPrismaSkipTake } from './pagination';
import { asyncHandler } from './asyncHandler';
import { generateBusinessId } from './idGenerator';

export type CrudPermission = {
  read: string;
  create: string;
  update: string;
  remove: string;
};

export interface CrudOptions {
  model: string;
  entity: string;
  permissions: CrudPermission;
  prefixKey?: string;
  tableName?: string;
  searchFields?: string[];
  filterFields?: string[];
  includes?: Record<string, unknown>;
  omit?: Record<string, true>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  softDelete?: boolean;
  where?: Record<string, unknown>;
  createBody?: (req: AuthRequest, body: Record<string, unknown>) => Promise<Record<string, unknown>>;
  updateBody?: (req: AuthRequest, body: Record<string, unknown>) => Promise<Record<string, unknown>>;
  beforeCreate?: (req: AuthRequest) => Promise<void>;
  beforeUpdate?: (req: AuthRequest, id: number) => Promise<void>;
  beforeRemove?: (req: AuthRequest, id: number) => Promise<void>;
}

function parseId(id: string): number {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) {
    throw new ValidationError(`Invalid ID: ${id}`);
  }
  return parsed;
}

function baseWhere(options: CrudOptions): Record<string, unknown> {
  const where: Record<string, unknown> = { ...(options.where ?? {}) };
  if (options.softDelete) {
    where.deletedAt = null;
  }
  return where;
}

export function createCrudRouter(options: CrudOptions): Router {
  const router = Router();
  const delegate = (prisma as any)[options.model];

  if (!delegate) {
    throw new Error(`Unknown Prisma model: ${options.model}`);
  }

  router.get(
    '/',
    authenticate,
    requirePermission(options.permissions.read),
    asyncHandler(async (req: AuthRequest, res) => {
      const params = parsePaginationParams(req.query);
      const page = params.page;
      const pageSize = params.pageSize;

      const where: Record<string, unknown> = baseWhere(options);

      const q = (req.query.q as string)?.trim();
      if (q && options.searchFields?.length) {
        where.OR = options.searchFields.map((field) => ({
          [field]: { contains: q, mode: 'insensitive' },
        }));
      }

      if (options.filterFields) {
        for (const field of options.filterFields) {
          const raw = req.query[field];
          if (raw === undefined) continue;
          if (/Id$/.test(field)) {
            const str = Array.isArray(raw) ? String(raw[0]) : String(raw);
            if (str === '') continue;
            const num = Number(str);
            if (!Number.isInteger(num)) {
              throw new ValidationError(`Invalid value for filter "${field}": ${str}`);
            }
            where[field] = num;
          } else {
            const str = Array.isArray(raw) ? String(raw[0]) : String(raw);
            if (str === '') continue;
            if (str === 'true' || str === 'false') {
              where[field] = str === 'true';
            } else {
              where[field] = raw;
            }
          }
        }
      }

      const orderBy = options.orderBy ?? { createdAt: 'desc' };

      const [totalItems, data] = await Promise.all([
        delegate.count({ where }),
        delegate.findMany({
          where,
          ...getPrismaSkipTake({ ...params, page, pageSize }),
          orderBy,
          include: options.includes,
          omit: options.omit,
        }),
      ]);

      res.json(buildPaginatedResult(data, totalItems, params));
    })
  );

  router.get(
    '/:id',
    authenticate,
    requirePermission(options.permissions.read),
    asyncHandler(async (req: AuthRequest, res) => {
      const id = parseId(req.params.id);
      const record = await (options.softDelete
        ? delegate.findFirst({
            where: { id, deletedAt: null },
            include: options.includes,
            omit: options.omit,
          })
        : delegate.findUnique({
            where: { id },
            include: options.includes,
            omit: options.omit,
          }));
      if (!record) {
        throw new NotFoundError(options.entity, id);
      }
      res.json(record);
    })
  );

  router.post(
    '/',
    authenticate,
    requirePermission(options.permissions.create),
    asyncHandler(async (req: AuthRequest, res) => {
      if (options.beforeCreate) {
        await options.beforeCreate(req);
      }

      let data: Record<string, unknown> = req.body ?? {};
      if (options.createBody) {
        data = await options.createBody(req, data);
      }

      if (options.prefixKey) {
        const tableName = options.tableName ?? options.model;
        if (!data.businessId) {
          data.businessId = await generateBusinessId(options.prefixKey, tableName);
        }
      }

      const record = await delegate.create({
        data,
        include: options.includes,
        omit: options.omit,
      });
      res.status(201).json(record);
    })
  );

  router.patch(
    '/:id',
    authenticate,
    requirePermission(options.permissions.update),
    asyncHandler(async (req: AuthRequest, res) => {
      const id = parseId(req.params.id);
      if (options.beforeUpdate) {
        await options.beforeUpdate(req, id);
      }

      const existing = options.softDelete
        ? await delegate.findFirst({ where: { id, deletedAt: null } })
        : await delegate.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError(options.entity, id);
      }

      let data: Record<string, unknown> = req.body ?? {};
      if (options.updateBody) {
        data = await options.updateBody(req, data);
      }

      const record = await delegate.update({
        where: { id },
        data,
        include: options.includes,
        omit: options.omit,
      });
      res.json(record);
    })
  );

  router.delete(
    '/:id',
    authenticate,
    requirePermission(options.permissions.remove),
    asyncHandler(async (req: AuthRequest, res) => {
      const id = parseId(req.params.id);
      if (options.beforeRemove) {
        await options.beforeRemove(req, id);
      }

      const existing = options.softDelete
        ? await delegate.findFirst({ where: { id, deletedAt: null } })
        : await delegate.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError(options.entity, id);
      }

      let record;
      if (options.softDelete) {
        record = await delegate.update({ where: { id }, data: { deletedAt: new Date() } });
      } else {
        record = await delegate.delete({ where: { id } });
      }
      res.json({ success: true, deleted: record });
    })
  );

  return router;
}