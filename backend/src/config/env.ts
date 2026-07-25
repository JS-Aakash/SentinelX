import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  PASSWORD_RESET_SECRET: z.string().min(32, 'PASSWORD_RESET_SECRET must be at least 32 characters'),
  PASSWORD_RESET_EXPIRES_IN: z.string().default('1h'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE: z.string().default('5242880'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX: z.string().default('100'),
  AUTH_RATE_LIMIT_MAX: z.string().default('10'),
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

  // SMTP Mail
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
  SMTP_FROM: z.string().default('SentinelX <noreply@sentinelx.com>'),

  // MQTT Broker Config
  MQTT_URL: z.string().default('mqtt://localhost:1883'),
  MQTT_CLIENT_ID: z.string().default('sentinelx_backend_ingestion'),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),

  // Python AI Microservice
  PYTHON_AI_SERVICE_URL: z.string().default('http://localhost:8000'),

  // TimescaleDB / PostgreSQL Config
  TIMESCALE_HOST: z.string().default('localhost'),
  TIMESCALE_PORT: z.string().default('5432'),
  TIMESCALE_DB: z.string().default('sentinelx_timescale'),
  TIMESCALE_USER: z.string().default('postgres'),
  TIMESCALE_PASSWORD: z.string().default('postgres'),
  TIMESCALE_URI: z.string().default('postgresql://postgres:postgres@localhost:5432/sentinelx_timescale'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
