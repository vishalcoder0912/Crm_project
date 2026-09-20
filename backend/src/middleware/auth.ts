import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AuthenticationError } from '../utils/errors';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    roleId: number;
    roleName: string;
  };
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Access token is required');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    req.user = {
      userId: payload.userId,
      email: payload.email,
      roleId: payload.roleId,
      roleName: payload.roleName,
    };

    next();
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else if (error.name === 'TokenExpiredError') {
      next(new AuthenticationError('Access token has expired'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new AuthenticationError('Invalid access token'));
    } else {
      next(new AuthenticationError());
    }
  }
}
