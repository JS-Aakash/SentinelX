import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const isLocalIp = (ip: string) =>
  ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.includes('localhost');

export const globalRateLimiter = rateLimit({
  windowMs: Number(env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 5000 : Number(env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  skip: (req) => env.NODE_ENV === 'development' || isLocalIp(req.ip || ''),
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'development' ? 500 : Number(env.AUTH_RATE_LIMIT_MAX) || 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  skip: (req) => env.NODE_ENV === 'development' || isLocalIp(req.ip || ''),
  skipSuccessfulRequests: true,
});
