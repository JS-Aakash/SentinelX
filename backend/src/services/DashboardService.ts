import { Machine } from '../models/Machine';
import { Device, DeviceStatus } from '../models/Device';
import { pgPool, isTimescaleConnected } from '../database/timescale';
import { logger } from '../utils/logger';

export interface DashboardOverview {
  machines: {
    total: number;
    active: number;
    idle: number;
    offline: number;
    maintenance: number;
    fault: number;
  };
  devices: {
    total: number;
    online: number;
    offline: number;
  };
  alerts: number; // placeholder
  todaySensorRecords: number;
  averageTemperature: number | null;
  averagePowerConsumption: number | null;
  machineFleet: Array<{
    _id: string;
    name: string;
    machineCode: string;
    type: string;
    status: string;
    image?: string;
    deviceId: string | null;
    deviceName: string | null;
    deviceStatus: string | null;
    latestTemperature: number | null;
    latestRPM: number | null;
    lastSeen: string | null;
  }>;
}

export class DashboardService {
  public static async getOverview(companyId: string): Promise<DashboardOverview> {
    // 1. Machine stats from MongoDB
    const [totalMachines, activeMachines, idleMachines, offlineMachines, maintenanceMachines, faultMachines] =
      await Promise.all([
        Machine.countDocuments({ companyId }),
        Machine.countDocuments({ companyId, status: 'active' }),
        Machine.countDocuments({ companyId, status: 'idle' }),
        Machine.countDocuments({ companyId, status: 'offline' }),
        Machine.countDocuments({ companyId, status: 'maintenance' }),
        Machine.countDocuments({ companyId, status: 'fault' }),
      ]);

    // 2. Device stats from MongoDB
    const [totalDevices, onlineDevices, offlineDevices] = await Promise.all([
      Device.countDocuments({ companyId }),
      Device.countDocuments({ companyId, status: DeviceStatus.ONLINE }),
      Device.countDocuments({ companyId, status: DeviceStatus.OFFLINE }),
    ]);

    // 3. Sensor stats from TimescaleDB
    let todaySensorRecords = 0;
    let averageTemperature: number | null = null;
    let averagePowerConsumption: number | null = null;

    if (isTimescaleConnected()) {
      try {
        // Today's record count
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const countRes = await pgPool.query(
          `SELECT COUNT(*) FROM sensor_readings WHERE company_id = $1 AND timestamp >= $2`,
          [companyId, todayStart]
        );
        todaySensorRecords = parseInt(countRes.rows[0].count, 10);

        // Averages from latest_sensor_state
        const avgRes = await pgPool.query(
          `SELECT AVG(temperature) as avg_temp, AVG(voltage * current) as avg_power FROM latest_sensor_state WHERE company_id = $1`,
          [companyId]
        );
        if (avgRes.rows.length > 0) {
          averageTemperature = avgRes.rows[0].avg_temp ? parseFloat(parseFloat(avgRes.rows[0].avg_temp).toFixed(1)) : null;
          averagePowerConsumption = avgRes.rows[0].avg_power ? parseFloat(parseFloat(avgRes.rows[0].avg_power).toFixed(1)) : null;
        }
      } catch (err: any) {
        logger.error(`Dashboard TimescaleDB query error: ${err.message}`);
      }
    }

    // 4. Machine fleet with latest device / sensor data
    const allMachines = await Machine.find({ companyId })
      .select('name machineCode type status image')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const machineFleet = await Promise.all(
      allMachines.map(async (m: any) => {
        const device = await Device.findOne({ machineId: m._id, companyId }).lean().exec();

        let latestTemperature: number | null = null;
        let latestRPM: number | null = null;
        let lastSeen: string | null = null;

        if (device && isTimescaleConnected()) {
          try {
            const stateRes = await pgPool.query(
              `SELECT temperature, rpm, last_seen FROM latest_sensor_state WHERE device_id = $1 LIMIT 1`,
              [device.deviceId]
            );
            if (stateRes.rows.length > 0) {
              latestTemperature = stateRes.rows[0].temperature != null ? Number(stateRes.rows[0].temperature) : null;
              latestRPM = stateRes.rows[0].rpm != null ? Number(stateRes.rows[0].rpm) : null;
              lastSeen = stateRes.rows[0].last_seen ? new Date(stateRes.rows[0].last_seen).toISOString() : null;
            }
          } catch {
            // non-critical
          }
        }

        if (!lastSeen && device?.lastSeen) {
          lastSeen = new Date(device.lastSeen).toISOString();
        }

        return {
          _id: m._id.toString(),
          name: m.name,
          machineCode: m.machineCode,
          type: m.type,
          status: m.status,
          image: m.image || undefined,
          deviceId: device?.deviceId || null,
          deviceName: device?.name || null,
          deviceStatus: device?.status || null,
          latestTemperature,
          latestRPM,
          lastSeen,
        };
      })
    );

    return {
      machines: {
        total: totalMachines,
        active: activeMachines,
        idle: idleMachines,
        offline: offlineMachines,
        maintenance: maintenanceMachines,
        fault: faultMachines,
      },
      devices: {
        total: totalDevices,
        online: onlineDevices,
        offline: offlineDevices,
      },
      alerts: 0, // placeholder
      todaySensorRecords,
      averageTemperature,
      averagePowerConsumption,
      machineFleet,
    };
  }
}
