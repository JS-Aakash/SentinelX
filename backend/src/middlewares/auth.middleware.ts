import { Request, Response, NextFunction } from 'express';
import { tokenService, TokenPayload } from '../services/TokenService';
import { userRepository } from '../repositories/UserRepository';
import { ApiError } from '../utils/ApiError';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No authentication token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = tokenService.verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await userRepository.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or account deactivated');
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(ApiError.unauthorized('Invalid or expired token'));
    }
  }
};
