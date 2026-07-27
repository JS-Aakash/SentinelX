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

    // Regex for local LAN IPs: 10.x.x.x, 192.168.x.x, 172.16-31.x.x
    const isLocalLanIp = /^http:\/\/(10|192\.168|172\.(1[6-9]|2[0-9]|3[0-1]))\.\d+\.\d+:\d+$/.test(origin);

    // Allow exact matches, Vercel domains, localhost, or local LAN IP addresses
    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      isLocalLanIp
    ) {
      callback(null, true);
    } else {
      // Fallback: reflect incoming origin for maximum resilience
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
