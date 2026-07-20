import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { IUser } from '../models/User';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  companyId: string;
}

export class TokenService {
  generateAccessToken(user: IUser): string {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      companyId: user.companyId.toString(),
    };
    const options: SignOptions = {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
  }

  generateRefreshToken(user: IUser): string {
    const payload = { userId: user._id.toString() };
    const options: SignOptions = {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
  }

  verifyRefreshToken(token: string): { userId: string } {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
  }

  generatePasswordResetToken(user: IUser): string {
    const payload = { userId: user._id.toString(), email: user.email };
    const options: SignOptions = {
      expiresIn: env.PASSWORD_RESET_EXPIRES_IN as SignOptions['expiresIn'],
    };
    return jwt.sign(payload, env.PASSWORD_RESET_SECRET, options);
  }

  verifyPasswordResetToken(token: string): { userId: string; email: string } {
    return jwt.verify(token, env.PASSWORD_RESET_SECRET) as { userId: string; email: string };
  }

  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  getRefreshTokenCookieOptions() {
    const isProduction = env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    };
  }
}

export const tokenService = new TokenService();
