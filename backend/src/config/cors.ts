import { CorsOptions } from 'cors';
import { env } from './env';

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Strip trailing slashes from CLIENT_URL if present
    const cleanClientUrl = env.CLIENT_URL ? env.CLIENT_URL.replace(/\/+$/, '') : '';
    const allowedOrigins = [
      cleanClientUrl,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://sentinelxai.vercel.app',
    ].filter(Boolean);

    // Allow request if no origin (server-to-server / curl), matching origin, or any *.vercel.app domain
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-device-id', 'x-company-id', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'Set-Cookie'],
  maxAge: 86400,
};
