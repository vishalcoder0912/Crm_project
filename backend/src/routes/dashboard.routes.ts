// hello this is vishal project
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { buildSummary } from '../services/summary';

const router = Router();

router.get(
  '/summary',
  authenticate,
  requirePermission('reports.read'),
  asyncHandler(async (req, res) => {
    res.json(await buildSummary(req.query.branchId));
  })
);

export default router;