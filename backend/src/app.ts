// hello this is vishal project
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import apiRouter from './routes';
import { env } from './config/env';
import { AppError } from './utils/errors';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use(limiter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/', apiRouter);
app.use('/api', apiRouter);

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
});

app.use((err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  const pe = err as { name?: string; code?: string; meta?: any };
  if (pe?.name === 'PrismaClientKnownRequestError') {
    if (pe.code === 'P2002') {
      const field = Array.isArray(pe.meta?.target) ? pe.meta.target.join(', ') : pe.meta?.target ?? 'field';
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: `A record with the same ${field} already exists.`, details: pe.meta },
      });
    }
    if (pe.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Record not found', details: pe.meta },
      });
    }
    if (pe.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Referenced record does not exist.', details: pe.meta },
      });
    }
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid data provided.', details: pe.meta },
    });
  }

  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';
  const message = err.message ?? 'Internal Server Error';

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
});