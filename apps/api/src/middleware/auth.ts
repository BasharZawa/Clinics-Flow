import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/auth';
import { AppError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization token required', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Not authenticated', 401, 'UNAUTHORIZED'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
      return;
    }

    next();
  };
};

export const requireClinicAccess = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    next(new AppError('Not authenticated', 401, 'UNAUTHORIZED'));
    return;
  }

  const clinicIdFromParams = req.params.clinicId || req.body.clinicId;
  
  if (clinicIdFromParams && clinicIdFromParams !== req.user.clinicId) {
    next(new AppError('Access denied to this clinic', 403, 'FORBIDDEN'));
    return;
  }

  next();
};
