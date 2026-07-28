import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';

import { env } from './config/env';
import { connectDB } from './config/database';
import { corsOptions } from './config/cors';
import { morganMiddleware } from './middlewares/logger.middleware';
import { globalRateLimiter } from './middlewares/rateLimiter.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import v1Routes from './routes/v1/index';
import { logger } from './utils/logger';

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow serving uploaded files
  })
);
app.use(cors(corsOptions));

// ─── Request Parsing ────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Logging ────────────────────────────────────────────────────────────────
app.use(morganMiddleware);

// ─── Rate Limiting ──────────────────────────────────────────────────────────
app.use(globalRateLimiter);

// Sanitizes double slashes in incoming request URLs (e.g. /api/v1//telemetry/ingest -> /api/v1/telemetry/ingest)
app.use((req, _res, next) => {
  if (req.url.includes('//')) {
    req.url = req.url.replace(/\/+/g, '/');
  }
  next();
});

// ─── Serve Uploaded Static Files ───────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), 'uploads');
const digitalTwinsDir = path.join(uploadsDir, 'digital-twins');
if (!require('fs').existsSync(digitalTwinsDir)) {
  require('fs').mkdirSync(digitalTwinsDir, { recursive: true });
}

app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
}, express.static(uploadsDir, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.glb')) {
      res.setHeader('Content-Type', 'model/gltf-binary');
    } else if (filePath.endsWith('.gltf')) {
      res.setHeader('Content-Type', 'model/gltf+json');
    }
  },
}));

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/v1', v1Routes);

// ─── Root health check ──────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: '🛡️ SentinelX API – Predict. Prevent. Prolong.',
    version: '1.0.0',
    docs: '/api/v1/health',
  });
});

// ─── Error Handling ─────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

import http from 'http';
import { initTimescaleDB } from './database/timescale';
import { initSocketIO } from './socket';
import { initMQTTClient } from './mqtt/mqttClient';
import { DeviceStatusMonitor } from './services/DeviceStatusMonitor';

// Create HTTP Server
const httpServer = http.createServer(app);

// Initialize Socket.IO
initSocketIO(httpServer);

// ─── Database + Server Boot ─────────────────────────────────────────────────
const startServer = async (): Promise<void> => {
  const PORT = Number(process.env.PORT) || Number(env.PORT) || 5000;

  // 1. Start HTTP Server immediately on 0.0.0.0 so platform healthchecks pass instantly
  if (!httpServer.listening) {
    httpServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        logger.warn(`⚠️ Port ${PORT} is temporarily busy. Automatically releasing port ${PORT}...`);
        try {
          const { execSync } = require('child_process');
          if (process.platform === 'win32') {
            execSync(`npx kill-port ${PORT}`, { stdio: 'ignore' });
          } else {
            execSync(`fuser -k ${PORT}/tcp`, { stdio: 'ignore' });
          }
        } catch {}
        setTimeout(() => {
          if (!httpServer.listening) {
            try { httpServer.close(); } catch {}
            httpServer.listen(PORT, '0.0.0.0');
          }
        }, 1000);
      } else {
        logger.error('❌ Server error:', err);
      }
    });

    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 SentinelX Server running on port ${PORT} (0.0.0.0)`);
      logger.info(`🌍 Environment: ${env.NODE_ENV}`);
      logger.info(`📡 API Base: http://0.0.0.0:${PORT}/api/v1`);
      logger.info(`🔌 Socket.IO Server active on port ${PORT}`);
    });
  }

  // 2. Connect DBs & Services asynchronously
  try {
    await connectDB();

    try {
      await initTimescaleDB();
    } catch (tsErr: any) {
      logger.warn(`⚠️ TimescaleDB init failed (non-fatal): ${tsErr.message || tsErr}. Sensor history will be unavailable until reconnected.`);
    }

    try {
      initMQTTClient();
    } catch (mqttErr: any) {
      logger.warn(`⚠️ MQTT init failed (non-fatal): ${mqttErr.message || mqttErr}. Live ingestion will be unavailable until reconnected.`);
    }

    DeviceStatusMonitor.start();

    // Auto-restore any active simulation sessions after server startup / restart
    const { SimulationService } = await import('./services/SimulationService');
    await SimulationService.restoreSimulations();
  } catch (error) {
    logger.error('❌ Database connection error during startup:', error);
  }

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    DeviceStatusMonitor.stop();
    httpServer.close(() => {
      logger.info('HTTP & Socket.IO server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGUSR2', () => {
    DeviceStatusMonitor.stop();
    httpServer.close(() => {
      process.kill(process.pid, 'SIGUSR2');
    });
  });
};

startServer();

export default app;
