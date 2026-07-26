import { Pool } from 'pg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const pgPool = new Pool({
  connectionString: env.TIMESCALE_URI,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let isPgConnected = false;

pgPool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client:', err);
  isPgConnected = false;
});

export async function initTimescaleDB(): Promise<boolean> {
  try {
    const client = await pgPool.connect();
    logger.info('🐘 PostgreSQL / TimescaleDB client connected successfully');
    isPgConnected = true;

    try {
      // 1. Enable TimescaleDB extension if available
      try {
        await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;');
        logger.info('⚡ TimescaleDB extension enabled');
      } catch (tsExtErr: any) {
        logger.warn(`TimescaleDB extension check note: ${tsExtErr.message || tsExtErr}. Using standard PostgreSQL tables.`);
      }

      // 2. Create sensor_readings table
      await client.query(`
        CREATE TABLE IF NOT EXISTS sensor_readings (
          id BIGSERIAL,
          timestamp TIMESTAMPTZ NOT NULL,
          device_id VARCHAR(100) NOT NULL,
          machine_id VARCHAR(100),
          company_id VARCHAR(100),
          temperature DOUBLE PRECISION,
          vibration DOUBLE PRECISION,
          current DOUBLE PRECISION,
          voltage DOUBLE PRECISION,
          rpm DOUBLE PRECISION,
          sound DOUBLE PRECISION,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          PRIMARY KEY (timestamp, id)
        );
      `);

      // 3. Convert to Hypertable if TimescaleDB is enabled
      try {
        await client.query(`SELECT create_hypertable('sensor_readings', 'timestamp', if_not_exists => TRUE);`);
        logger.info('📊 sensor_readings hypertable created/verified');
      } catch (hyperErr: any) {
        logger.warn(`Hypertable note (standard PG fallback): ${hyperErr.message || hyperErr}`);
      }

      // 4. Create indexes on sensor_readings
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time ON sensor_readings (device_id, timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_sensor_readings_machine_time ON sensor_readings (machine_id, timestamp DESC);
      `);

      // 5. Create latest_sensor_state table
      await client.query(`
        CREATE TABLE IF NOT EXISTS latest_sensor_state (
          device_id VARCHAR(100) PRIMARY KEY,
          machine_id VARCHAR(100),
          company_id VARCHAR(100),
          last_seen TIMESTAMPTZ NOT NULL,
          temperature DOUBLE PRECISION,
          vibration DOUBLE PRECISION,
          current DOUBLE PRECISION,
          voltage DOUBLE PRECISION,
          rpm DOUBLE PRECISION,
          sound DOUBLE PRECISION,
          status VARCHAR(20) DEFAULT 'online',
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 6. Create rejected_payload_logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS rejected_payload_logs (
          id BIGSERIAL PRIMARY KEY,
          timestamp TIMESTAMPTZ DEFAULT NOW(),
          topic VARCHAR(255),
          device_id VARCHAR(100),
          company_id VARCHAR(100),
          reason TEXT NOT NULL,
          raw_payload TEXT
        );
      `);

      logger.info('✅ TimescaleDB database schemas and tables initialized');
      return true;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error(`⚠️ TimescaleDB connection warning: ${error.message || error}. Data ingestion will run with resilience.`);
    isPgConnected = false;
    return false;
  }
}

export function isTimescaleConnected(): boolean {
  return isPgConnected;
}
