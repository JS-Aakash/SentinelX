import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env';
import { logger } from '../utils/logger';

// Bypasses local DNS resolution limitations (VPN/local routers blocking SRV) by setting public DNS resolvers
if (process.env.NODE_ENV !== 'test') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};
