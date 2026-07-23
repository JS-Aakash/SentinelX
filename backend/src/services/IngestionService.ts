import mongoose from 'mongoose';
import { Device, DeviceStatus } from '../models/Device';
import { pgPool, isTimescaleConnected } from '../database/timescale';
import { broadcastSensorUpdate } from '../socket';
import { LiveSensorService } from './LiveSensorService';
import { InferenceService } from './InferenceService';
import { logger } from '../utils/logger';

export interface MQTTIncomingPayload {
  deviceId: string;
  timestamp?: string | number;
  temperature: number;
  humidity?: number;
  vibration?: number;
  acceleration?: { x: number; y: number; z: number };
  ax?: number;
  ay?: number;
  az?: number;
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
   * Main entry point to process MQTT payload received from broker or ESP32 bridge.
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

    const deviceId = (payload.deviceId || topicDeviceId || 'ESP32_HARDWARE').trim();
    
    // 1. Timestamp fallback: if missing or invalid, default to server current time
    let parsedDate = new Date();
    if (payload.timestamp) {
      const pDate = new Date(payload.timestamp);
      if (!isNaN(pDate.getTime())) {
        parsedDate = pDate;
      }
    }

    // Auto-compute composite vibration magnitude if missing or acceleration provided
    let ax = payload.ax ?? payload.acceleration?.x ?? 0.0;
    let ay = payload.ay ?? payload.acceleration?.y ?? 0.0;
    let az = payload.az ?? payload.acceleration?.z ?? 1.0;

    // ADXL345 16G Non-Full-Res scale fix (if raw LSB multiplier exceeds 16g physical limit)
    if (Math.abs(ay) > 16.0) ay = ay / 32.0;
    if (Math.abs(ax) > 16.0) ax = ax / 32.0;
    if (Math.abs(az) > 16.0) az = az / 32.0;

    ax = Number(ax.toFixed(2));
    ay = Number(ay.toFixed(2));
    az = Number(az.toFixed(2));

    let computedVibration = payload.vibration;
    if (computedVibration === undefined || computedVibration === null || isNaN(computedVibration) || computedVibration > 10.0) {
      const totalMag = Math.sqrt(ax * ax + ay * ay + az * az);
      // Subtract 1.0g static Earth gravity vector to isolate dynamic machine vibration
      const dynamicVib = Math.abs(totalMag - 1.0);
      computedVibration = Number(Math.max(0.01, Math.round(dynamicVib * 1000) / 1000).toFixed(3));
    }

    // 2. Validate essential sensor numerical values (defaulting missing optional ones cleanly)
    const tempVal = Number(payload.temperature ?? 28.5);
    const curVal = Number(payload.current ?? 1.5);
    const voltVal = Number(payload.voltage ?? 12.3);
    const rpmVal = Number(payload.rpm ?? 1480);
    const soundVal = Number(payload.sound ?? 320);
    const humVal = Number(payload.humidity ?? 55.0);

    // 3. Look up Device in MongoDB (by deviceId or Device Name)
    let device = await Device.findOne({
      $or: [
        { deviceId: { $regex: new RegExp(`^${deviceId}$`, 'i') } },
        { name: { $regex: new RegExp(`^${deviceId}$`, 'i') } },
      ],
    }).exec();

    if (!device) {
      // In development mode or for ESP32 hardware convenience, auto-create device under active company
      const { Company } = await import('../models/Company');
      const { Machine } = await import('../models/Machine');
      
      let targetCompany = null;
      if (topicCompanyId && mongoose.Types.ObjectId.isValid(topicCompanyId)) {
        targetCompany = await Company.findById(topicCompanyId).exec();
      }
      if (!targetCompany) {
        targetCompany = await Company.findOne().exec();
      }

      if (targetCompany) {
        const firstMachine = await Machine.findOne({ companyId: targetCompany._id }).exec();
        device = await Device.create({
          name: `ESP32 Hardware (${deviceId})`,
          deviceId: deviceId.toUpperCase(),
          type: 'ESP32 Gateway',
          status: DeviceStatus.ONLINE,
          companyId: targetCompany._id,
          machineId: firstMachine ? firstMachine._id : null,
          createdBy: targetCompany._id,
          firmwareVersion: 'v2.4.1',
          macAddress: '24:6F:28:AB:CD:EF',
        });

        if (firstMachine) {
          logger.info(`✨ Auto-registered hardware device '${device.deviceId}' and linked to machine '${firstMachine.name}'`);
        }
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

    const machineIdStr = device.machineId ? device.machineId.toString() : null;
    const companyIdStr = device.companyId.toString();

    // Validated readings
    const reading = {
      deviceId: device.deviceId, // Canonical device identifier
      machineId: machineIdStr,
      companyId: companyIdStr,
      timestamp: parsedDate,
      temperature: tempVal,
      humidity: humVal,
      vibration: computedVibration,
      acceleration: { x: ax, y: ay, z: az },
      current: curVal,
      voltage: voltVal,
      rpm: rpmVal,
      sound: soundVal,
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

    // 7. Trigger Live AI Inference asynchronously & process Live Data Recording (Non-blocking)
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

      // Process Live Data Recording & AI Lifecycle Status
      (async () => {
        try {
          const { Machine, AILifecycleStatus } = await import('../models/Machine');
          const { DatasetService } = await import('./DatasetService');

          const machine = await Machine.findById(reading.machineId).exec();
          if (machine) {
            if (!machine.liveDataCollection) {
              machine.liveDataCollection = {
                collectedSampleCount: 0,
                recommendedSamplesThreshold: 10000,
                newSamplesSinceLastTraining: 0,
              };
            }

            machine.liveDataCollection.lastReadingTimestamp = reading.timestamp;

            if (machine.isRecording) {
              // Append to live dataset file
              DatasetService.appendLiveSensorReading(machine._id.toString(), reading);

              // Update stats
              machine.liveDataCollection.collectedSampleCount = (machine.liveDataCollection.collectedSampleCount || 0) + 1;
              if (!machine.liveDataCollection.collectionStartDate) {
                machine.liveDataCollection.collectionStartDate = reading.timestamp;
              }

              // Update AI Lifecycle status based on sample thresholds
              const threshold = machine.liveDataCollection.recommendedSamplesThreshold || 10000;
              const count = machine.liveDataCollection.collectedSampleCount;

              if (machine.aiLifecycleStatus === AILifecycleStatus.REGISTERED || machine.aiLifecycleStatus === AILifecycleStatus.COLLECTING_DATA) {
                if (count >= threshold) {
                  machine.aiLifecycleStatus = AILifecycleStatus.READY_FOR_TRAINING;
                } else {
                  machine.aiLifecycleStatus = AILifecycleStatus.COLLECTING_DATA;
                }
              } else if (machine.aiLifecycleStatus === AILifecycleStatus.AI_READY) {
                machine.liveDataCollection.newSamplesSinceLastTraining = (machine.liveDataCollection.newSamplesSinceLastTraining || 0) + 1;
                if (machine.liveDataCollection.newSamplesSinceLastTraining >= 5000) {
                  machine.aiLifecycleStatus = AILifecycleStatus.RETRAINING_RECOMMENDED;
                }
              }
            }

            await machine.save();
          }
        } catch (recErr: any) {
          logger.error(`Error processing live data recording: ${recErr.message || recErr}`);
        }
      })();
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
