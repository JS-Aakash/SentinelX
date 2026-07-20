import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';
import { ApiError } from '../utils/ApiError';

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return next(
        ApiError.forbidden(
          `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.user.role}`
        )
      );
    }

    next();
  };
};

// Convenience role guards
export const isSuperAdmin = authorize(UserRole.SUPER_ADMIN);
export const isCompanyAdmin = authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN);
export const isEngineer = authorize(
  UserRole.SUPER_ADMIN,
  UserRole.COMPANY_ADMIN,
  UserRole.MAINTENANCE_ENGINEER
);
