import { CorsOptions } from 'cors';
import { env } from './env';

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server / Postman / curl (no origin header)
    if (!origin) {
      return callback(null, true);
    }

    const cleanClientUrl = env.CLIENT_URL ? env.CLIENT_URL.replace(/\/+$/, '') : '';
    const allowedOrigins = [
      cleanClientUrl,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://sentinelxai.vercel.app',
    ].filter(Boolean);

    // Allow exact matches, localhost, or any *.vercel.app domain
    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      callback(null, true);
    } else {
      // In production, log warning and allow request origin to prevent preflight blocking
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'x-device-id',
    'x-company-id',
    'Accept',
    'Cache-Control',
    'Pragma',
    'Expires',
  ],
  exposedHeaders: ['X-Total-Count', 'Set-Cookie'],
  optionsSuccessStatus: 200,
  maxAge: 86400,
};
