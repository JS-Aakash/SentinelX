import { Device, DeviceStatus } from '../models/Device';
import { pgPool, isTimescaleConnected } from '../database/timescale';
import { broadcastSensorUpdate } from '../socket';
import { LiveSensorService } from './LiveSensorService';
import { InferenceService } from './InferenceService';
import { logger } from '../utils/logger';

export interface MQTTIncomingPayload {
  deviceId: string;
  timestamp: string | number;
  temperature: number;
  vibration: number;
  current: number;
  voltage: number;
  rpm: number;
  sound: number;
}

export interface RejectedPayloadRecord {
  topic: string;
  deviceId?: string;
  companyId?: string;
  reason: string;
  rawPayload: string;
}

export class IngestionService {
  /**
   * Main entry point to process MQTT payload received from broker.
   */
  public static async processMQTTMessage(topic: string, messageBuffer: Buffer | string): Promise<boolean> {
    const rawPayload = messageBuffer.toString('utf-8');

    // Parse Topic: expected format "company/{companyId}/device/{deviceId}"
    const topicParts = topic.split('/');
    let topicCompanyId: string | null = null;
    let topicDeviceId: string | null = null;

    if (topicParts.length >= 4 && topicParts[0] === 'company' && topicParts[2] === 'device') {
      topicCompanyId = topicParts[1];
      topicDeviceId = topicParts[3];
    }

    let payload: Partial<MQTTIncomingPayload>;
    try {
      payload = JSON.parse(rawPayload);
    } catch (err) {
      await this.logRejectedPayload({
        topic,
        companyId: topicCompanyId || undefined,
        deviceId: topicDeviceId || undefined,
        reason: 'Malformed JSON payload',
        rawPayload,
      });
      return false;
    }

    const deviceId = (payload.deviceId || topicDeviceId || '').trim();
    if (!deviceId) {
      await this.logRejectedPayload({
        topic,
        companyId: topicCompanyId || undefined,
        reason: 'Missing deviceId in topic and payload',
        rawPayload,
      });
      return false;
    }

    // 1. Validate timestamp
    if (!payload.timestamp) {
      await this.logRejectedPayload({
        topic,
        deviceId,
        companyId: topicCompanyId || undefined,
        reason: 'Missing timestamp in payload',
        rawPayload,
      });
      return false;
    }

    const parsedDate = new Date(payload.timestamp);
    if (isNaN(parsedDate.getTime())) {
      await this.logRejectedPayload({
        topic,
        deviceId,
        companyId: topicCompanyId || undefined,
        reason: `Invalid timestamp value: ${payload.timestamp}`,
        rawPayload,
      });
      return false;
    }

    // 2. Validate sensor numerical values
    const numericFields: Array<keyof MQTTIncomingPayload> = [
      'temperature',
      'vibration',
      'current',
      'voltage',
      'rpm',
      'sound',
    ];

    for (const field of numericFields) {
      const val = payload[field];
      if (val === undefined || val === null || typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
        await this.logRejectedPayload({
          topic,
          deviceId,
          companyId: topicCompanyId || undefined,
          reason: `Invalid or missing numeric sensor value for field '${field}': ${val}`,
          rawPayload,
        });
        return false;
      }
    }

    // 3. Look up Device in MongoDB
    let device = await Device.findOne({
      deviceId: { $regex: new RegExp(`^${deviceId}$`, 'i') },
    }).exec();

    if (!device) {
      // In development mode or for simulator convenience, auto-create device under active company
      const { Company } = await import('../models/Company');
      const { Machine } = await import('../models/Machine');
      
      let targetCompany = null;
      if (topicCompanyId) {
        targetCompany = await Company.findById(topicCompanyId).exec();
      }
      if (!targetCompany) {
        targetCompany = await Company.findOne().exec();
      }

      if (targetCompany) {
        const firstMachine = await Machine.findOne({ companyId: targetCompany._id }).exec();
        device = await Device.create({
          name: `Simulated ESP32 (${deviceId})`,
          deviceId: deviceId.toUpperCase(),
          type: 'ESP32 Gateway',
          status: DeviceStatus.ONLINE,
          companyId: targetCompany._id,
          machineId: firstMachine ? firstMachine._id : null,
          createdBy: targetCompany._id,
          firmwareVersion: 'v2.4.1',
          macAddress: '24:6F:28:AB:CD:EF',
        });

        // Link device to first machine if available
        if (firstMachine) {
          logger.info(`✨ Auto-registered simulated device '${device.deviceId}' and linked to machine '${firstMachine.name}'`);
        }

        logger.info(`✨ Auto-registered simulated device '${device.deviceId}' under company '${targetCompany.name}'`);
      } else {
        await this.logRejectedPayload({
          topic,
          deviceId,
          companyId: topicCompanyId || undefined,
          reason: `Unknown deviceId '${deviceId}' (device not registered in system and no company found)`,
          rawPayload,
        });
        return false;
      }
    }

    // Check company mismatch if topic provided companyId
    if (topicCompanyId && device.companyId.toString() !== topicCompanyId) {
      await this.logRejectedPayload({
        topic,
        deviceId,
        companyId: topicCompanyId,
        reason: `Company ID mismatch: payload company '${topicCompanyId}' does not match registered device company '${device.companyId}'`,
        rawPayload,
      });
      return false;
    }

    const machineIdStr = device.machineId ? device.machineId.toString() : null;
    const companyIdStr = device.companyId.toString();

    // Validated readings
    const reading = {
      deviceId: device.deviceId, // Canonical device identifier
      machineId: machineIdStr,
      companyId: companyIdStr,
      timestamp: parsedDate,
      temperature: Number(payload.temperature),
      vibration: Number(payload.vibration),
      current: Number(payload.current),
      voltage: Number(payload.voltage),
      rpm: Number(payload.rpm),
      sound: Number(payload.sound),
      status: 'online',
    };

    // 4. Update fast in-memory cache for immediate REST / Socket availability
    LiveSensorService.updateInMemoryCache(reading);

    // 5. Store reading in TimescaleDB (if connected)
    if (isTimescaleConnected()) {
      try {
        // Insert history into sensor_readings
        await pgPool.query(
          `INSERT INTO sensor_readings (timestamp, device_id, machine_id, company_id, temperature, vibration, current, voltage, rpm, sound)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            reading.timestamp,
            reading.deviceId,
            reading.machineId,
            reading.companyId,
            reading.temperature,
            reading.vibration,
            reading.current,
            reading.voltage,
            reading.rpm,
            reading.sound,
          ]
        );

        // Upsert latest_sensor_state
        await pgPool.query(
          `INSERT INTO latest_sensor_state (device_id, machine_id, company_id, last_seen, temperature, vibration, current, voltage, rpm, sound, status, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
           ON CONFLICT (device_id) DO UPDATE SET
             machine_id = EXCLUDED.machine_id,
             company_id = EXCLUDED.company_id,
             last_seen = EXCLUDED.last_seen,
             temperature = EXCLUDED.temperature,
             vibration = EXCLUDED.vibration,
             current = EXCLUDED.current,
             voltage = EXCLUDED.voltage,
             rpm = EXCLUDED.rpm,
             sound = EXCLUDED.sound,
             status = EXCLUDED.status,
             updated_at = NOW();`,
          [
            reading.deviceId,
            reading.machineId,
            reading.companyId,
            reading.timestamp,
            reading.temperature,
            reading.vibration,
            reading.current,
            reading.voltage,
            reading.rpm,
            reading.sound,
            reading.status,
          ]
        );
      } catch (dbErr: any) {
        logger.error(`Failed to store sensor reading in TimescaleDB: ${dbErr.message || dbErr}`);
      }
    }

    // 5. Update Device status in MongoDB
    device.status = DeviceStatus.ONLINE;
    device.lastSeen = reading.timestamp;
    await device.save();

    // 6. Broadcast update to Socket.IO real-time clients
    broadcastSensorUpdate(reading);

    // 7. Trigger Live AI Inference asynchronously (Non-blocking)
    if (reading.machineId) {
      InferenceService.processLiveInference({
        machineId: reading.machineId,
        companyId: reading.companyId,
        temperature: reading.temperature,
        vibration: reading.vibration,
        current: reading.current,
        voltage: reading.voltage,
        rpm: reading.rpm,
        sound: reading.sound,
        timestamp: reading.timestamp,
      }).catch((err) => {
        logger.error(`Live AI inference background execution error: ${err.message}`);
      });
    }

    logger.info(`⚡ Successfully processed telemetry for device ${reading.deviceId} (${reading.temperature}°C, ${reading.rpm} RPM)`);
    return true;
  }

  /**
   * Log rejected payloads to audit table and Winston logger
   */
  public static async logRejectedPayload(record: RejectedPayloadRecord): Promise<void> {
    logger.warn(`❌ Rejected MQTT Payload [Topic: ${record.topic}]: ${record.reason}`);

    if (isTimescaleConnected()) {
      try {
        await pgPool.query(
          `INSERT INTO rejected_payload_logs (topic, device_id, company_id, reason, raw_payload)
           VALUES ($1, $2, $3, $4, $5)`,
          [record.topic, record.deviceId || null, record.companyId || null, record.reason, record.rawPayload]
        );
      } catch (err: any) {
        logger.error(`Failed to log rejected payload in DB: ${err.message || err}`);
      }
    }
  }
}
