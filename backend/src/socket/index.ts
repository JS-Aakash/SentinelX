import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let io: SocketIOServer | null = null;

export function initSocketIO(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: [env.CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`🔌 Realtime client connected: ${socket.id}`);

    // Subscribe to machine updates
    socket.on('join:machine', (machineId: string) => {
      if (machineId) {
        socket.join(`machine:${machineId}`);
        logger.info(`Client ${socket.id} joined room machine:${machineId}`);
      }
    });

    socket.on('leave:machine', (machineId: string) => {
      if (machineId) {
        socket.leave(`machine:${machineId}`);
      }
    });

    // Subscribe to device updates
    socket.on('join:device', (deviceId: string) => {
      if (deviceId) {
        socket.join(`device:${deviceId}`);
        logger.info(`Client ${socket.id} joined room device:${deviceId}`);
      }
    });

    socket.on('leave:device', (deviceId: string) => {
      if (deviceId) {
        socket.leave(`device:${deviceId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Client disconnected ${socket.id}: ${reason}`);
    });
  });

  logger.info('⚡ Socket.IO server initialized');
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO server has not been initialized');
  }
  return io;
}

export function broadcastSensorUpdate(data: {
  deviceId: string;
  machineId?: string | null;
  companyId?: string | null;
  timestamp: string | Date;
  temperature: number;
  humidity?: number;
  vibration: number;
  acceleration?: { x: number; y: number; z: number };
  current: number;
  voltage: number;
  rpm: number;
  sound: number;
  status: string;
}) {
  if (!io) return;

  const payload = {
    ...data,
    timestamp: typeof data.timestamp === 'string' ? data.timestamp : data.timestamp.toISOString(),
  };

  // Broadcast to global event
  io.emit('sensor:update', payload);

  // Broadcast to machine room if machineId present
  if (data.machineId) {
    io.to(`machine:${data.machineId}`).emit('sensor:update', payload);
  }

  // Broadcast to device room
  if (data.deviceId) {
    io.to(`device:${data.deviceId}`).emit('sensor:update', payload);
  }
}

export function broadcastAIPrediction(companyId: string, machineId: string, predictionData: any) {
  if (!io) return;

  const payload = {
    ...predictionData,
    timestamp: typeof predictionData.timestamp === 'string'
      ? predictionData.timestamp
      : predictionData.timestamp?.toISOString() || new Date().toISOString(),
  };

  io.emit('ai:prediction', payload);
  if (machineId) {
    io.to(`machine:${machineId}`).emit('ai:prediction', payload);
  }
}
