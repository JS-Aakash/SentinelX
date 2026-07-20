import { Device, DeviceStatus } from '../models/Device';
import { pgPool, isTimescaleConnected } from '../database/timescale';
import { logger } from '../utils/logger';

export class DeviceStatusMonitor {
  private static timer: NodeJS.Timeout | null = null;
  private static readonly TIMEOUT_MS = 30000; // 30 seconds threshold
  private static readonly CHECK_INTERVAL_MS = 10000; // Run monitor check every 10 seconds

  public static start(): void {
    if (this.timer) return;

    logger.info('⏱️ Device Status Heartbeat Monitor started (30s threshold)');
    this.timer = setInterval(() => {
      this.checkOfflineDevices().catch((err) => {
        logger.error('Error running DeviceStatusMonitor check:', err);
      });
    }, this.CHECK_INTERVAL_MS);
  }

  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Device Status Heartbeat Monitor stopped');
    }
  }

  private static async checkOfflineDevices(): Promise<void> {
    const cutoffTime = new Date(Date.now() - this.TIMEOUT_MS);

    // Find devices that are currently ONLINE but haven't sent data in > 30 seconds (or lastSeen is null)
    const staleDevices = await Device.find({
      status: DeviceStatus.ONLINE,
      $or: [{ lastSeen: { $lt: cutoffTime } }, { lastSeen: null }],
    }).exec();

    if (staleDevices.length === 0) return;

    for (const device of staleDevices) {
      device.status = DeviceStatus.OFFLINE;
      await device.save();
      logger.info(`🔴 Device ${device.deviceId} timed out (>30s no data) -> marked OFFLINE`);

      // Update TimescaleDB latest_sensor_state status if connected
      if (isTimescaleConnected()) {
        try {
          await pgPool.query(
            `UPDATE latest_sensor_state SET status = 'offline', updated_at = NOW() WHERE device_id = $1`,
            [device.deviceId]
          );
        } catch (err: any) {
          logger.error(`Failed to update offline status in TimescaleDB for device ${device.deviceId}: ${err.message}`);
        }
      }
    }
  }
}
