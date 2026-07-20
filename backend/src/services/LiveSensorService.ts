import { Machine } from '../models/Machine';
import { Device } from '../models/Device';
import { pgPool, isTimescaleConnected } from '../database/timescale';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export interface LiveTelemetryResponse {
  machineId: string;
  machineName: string;
  deviceId: string | null;
  deviceName: string | null;
  deviceStatus: string;
  lastSeen: Date | string | null;
  temperature: number | null;
  vibration: number | null;
  current: number | null;
  voltage: number | null;
  rpm: number | null;
  sound: number | null;
}

export interface HistoryQuery {
  page?: string;
  limit?: string;
  startDate?: string;
  endDate?: string;
}

// In-memory cache for ultra-fast live telemetry state
const latestStateCache = new Map<string, {
  deviceId: string;
  machineId?: string | null;
  companyId?: string | null;
  lastSeen: Date;
  temperature: number;
  vibration: number;
  current: number;
  voltage: number;
  rpm: number;
  sound: number;
  status: string;
}>();

export class LiveSensorService {
  /**
   * Update fast in-memory cache when new telemetry is ingested
   */
  public static updateInMemoryCache(reading: {
    deviceId: string;
    machineId?: string | null;
    companyId?: string | null;
    timestamp: Date;
    temperature: number;
    vibration: number;
    current: number;
    voltage: number;
    rpm: number;
    sound: number;
    status: string;
  }) {
    const record = {
      deviceId: reading.deviceId,
      machineId: reading.machineId,
      companyId: reading.companyId,
      lastSeen: reading.timestamp,
      temperature: reading.temperature,
      vibration: reading.vibration,
      current: reading.current,
      voltage: reading.voltage,
      rpm: reading.rpm,
      sound: reading.sound,
      status: reading.status,
    };

    // Cache by deviceId (uppercase)
    latestStateCache.set(reading.deviceId.toUpperCase(), record);

    // Cache by machineId if assigned
    if (reading.machineId) {
      latestStateCache.set(reading.machineId, record);
    }
  }

  /**
   * Get latest live telemetry state for a machine and its attached device
   */
  public static async getLiveTelemetry(machineId: string, companyId: string): Promise<LiveTelemetryResponse> {
    const machine = await Machine.findOne({ _id: machineId, companyId }).exec();
    if (!machine) {
      throw ApiError.notFound('Machine not found');
    }

    const device = await Device.findOne({ machineId: machine._id }).exec();

    if (!device) {
      return {
        machineId: machine._id.toString(),
        machineName: machine.name,
        deviceId: null,
        deviceName: null,
        deviceStatus: 'offline',
        lastSeen: null,
        temperature: null,
        vibration: null,
        current: null,
        voltage: null,
        rpm: null,
        sound: null,
      };
    }

    // 1. Check in-memory fast cache first
    const cachedByMachine = latestStateCache.get(machine._id.toString());
    const cachedByDevice = latestStateCache.get(device.deviceId.toUpperCase());
    const cached = cachedByMachine || cachedByDevice;

    if (cached) {
      return {
        machineId: machine._id.toString(),
        machineName: machine.name,
        deviceId: device.deviceId,
        deviceName: device.name,
        deviceStatus: device.status,
        lastSeen: cached.lastSeen,
        temperature: cached.temperature,
        vibration: cached.vibration,
        current: cached.current,
        voltage: cached.voltage,
        rpm: cached.rpm,
        sound: cached.sound,
      };
    }

    // 2. Query TimescaleDB / PostgreSQL for latest_sensor_state
    if (isTimescaleConnected()) {
      try {
        const res = await pgPool.query(
          `SELECT * FROM latest_sensor_state WHERE device_id = $1 OR machine_id = $2 LIMIT 1`,
          [device.deviceId, machine._id.toString()]
        );

        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            machineId: machine._id.toString(),
            machineName: machine.name,
            deviceId: device.deviceId,
            deviceName: device.name,
            deviceStatus: device.status,
            lastSeen: row.last_seen || device.lastSeen,
            temperature: row.temperature !== null ? Number(row.temperature) : null,
            vibration: row.vibration !== null ? Number(row.vibration) : null,
            current: row.current !== null ? Number(row.current) : null,
            voltage: row.voltage !== null ? Number(row.voltage) : null,
            rpm: row.rpm !== null ? Number(row.rpm) : null,
            sound: row.sound !== null ? Number(row.sound) : null,
          };
        }
      } catch (err: any) {
        logger.error(`Error querying latest_sensor_state from TimescaleDB: ${err.message}`);
      }
    }

    // Fallback if no telemetry records exist yet
    return {
      machineId: machine._id.toString(),
      machineName: machine.name,
      deviceId: device.deviceId,
      deviceName: device.name,
      deviceStatus: device.status,
      lastSeen: device.lastSeen || null,
      temperature: null,
      vibration: null,
      current: null,
      voltage: null,
      rpm: null,
      sound: null,
    };
  }

  /**
   * Get historical telemetry readings with pagination and optional date filter
   */
  public static async getTelemetryHistory(
    machineId: string,
    companyId: string,
    query: HistoryQuery
  ) {
    const machine = await Machine.findOne({ _id: machineId, companyId }).exec();
    if (!machine) {
      throw ApiError.notFound('Machine not found');
    }

    const device = await Device.findOne({ machineId: machine._id }).exec();
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(500, Math.max(1, parseInt(query.limit || '50', 10)));
    const offset = (page - 1) * limit;

    if (!device || !isTimescaleConnected()) {
      return {
        readings: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    try {
      let whereClause = `WHERE (machine_id = $1 OR device_id = $2)`;
      const params: any[] = [machine._id.toString(), device.deviceId];
      let paramIdx = 3;

      if (query.startDate) {
        const start = new Date(query.startDate);
        if (!isNaN(start.getTime())) {
          whereClause += ` AND timestamp >= $${paramIdx}`;
          params.push(start);
          paramIdx++;
        }
      }

      if (query.endDate) {
        const end = new Date(query.endDate);
        if (!isNaN(end.getTime())) {
          whereClause += ` AND timestamp <= $${paramIdx}`;
          params.push(end);
          paramIdx++;
        }
      }

      // Query total count
      const countRes = await pgPool.query(`SELECT COUNT(*) FROM sensor_readings ${whereClause}`, params);
      const total = parseInt(countRes.rows[0].count, 10);

      // Query paginated readings
      const dataQuery = `
        SELECT id, timestamp, device_id, machine_id, company_id, temperature, vibration, current, voltage, rpm, sound
        FROM sensor_readings
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
      `;

      const dataRes = await pgPool.query(dataQuery, [...params, limit, offset]);

      const readings = dataRes.rows.map((row) => ({
        id: row.id,
        timestamp: row.timestamp,
        deviceId: row.device_id,
        machineId: row.machine_id,
        temperature: row.temperature !== null ? Number(row.temperature) : null,
        vibration: row.vibration !== null ? Number(row.vibration) : null,
        current: row.current !== null ? Number(row.current) : null,
        voltage: row.voltage !== null ? Number(row.voltage) : null,
        rpm: row.rpm !== null ? Number(row.rpm) : null,
        sound: row.sound !== null ? Number(row.sound) : null,
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        readings,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (err: any) {
      logger.error(`Error querying sensor history from TimescaleDB: ${err.message}`);
      return {
        readings: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
  }
}
