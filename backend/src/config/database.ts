import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env';
import { logger } from '../utils/logger';

// Force IPv4 DNS result order first for Node.js 17+ on Windows institutional networks
if (dns.setDefaultResultOrder) {
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch {}
}

/**
 * Constructs a direct seedlist URI from SRV URI for institutional Wi-Fi (Kongu WiFi)
 * Bypasses SRV lookup (_mongodb._tcp) which is often blocked or dropped by campus firewalls.
 */
function getDirectSeedlistUri(srvUri: string): string {
  if (srvUri.includes('database1.vsmdyho.mongodb.net')) {
    return srvUri
      .replace('mongodb+srv://', 'mongodb://')
      .replace(
        'database1.vsmdyho.mongodb.net',
        'ac-xd4hs28-shard-00-00.vsmdyho.mongodb.net:27017,ac-xd4hs28-shard-00-01.vsmdyho.mongodb.net:27017,ac-xd4hs28-shard-00-02.vsmdyho.mongodb.net:27017'
      ) + '&ssl=true&authSource=admin';
  }
  return srvUri;
}

export const connectDB = async (): Promise<void> => {
  const options: mongoose.ConnectOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
    family: 4, // Force IPv4 to prevent dual-stack IPv6 DNS/SNI connection hangs on institutional Wi-Fi
  };

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, options);
    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    setupConnectionListeners();
  } catch (error: any) {
    logger.warn(`⚠️ Primary SRV MongoDB connection failed (${error?.message || error}). Attempting Direct Seedlist Fallback for Kongu WiFi...`);

    try {
      const fallbackUri = getDirectSeedlistUri(env.MONGODB_URI);
      const conn = await mongoose.connect(fallbackUri, options);
      logger.info(`✅ MongoDB Connected (Direct Seedlist Fallback): ${conn.connection.host}`);
      setupConnectionListeners();
    } catch (fallbackError) {
      logger.error('❌ MongoDB Direct Seedlist connection failed:', fallbackError);
      logger.warn('🔄 Retrying MongoDB connection in 3 seconds...');
      setTimeout(() => {
        connectDB();
      }, 3000);
    }
  }
};

function setupConnectionListeners(): void {
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
}
