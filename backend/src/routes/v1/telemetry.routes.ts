import { Router } from 'express';
import { IngestionService } from '../../services/IngestionService';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * Ingest ESP32 Telemetry via HTTP POST (JSON or raw Serial block)
 * POST /api/v1/telemetry/ingest
 */
router.post('/ingest', async (req, res) => {
  try {
    let payload = req.body;

    // Handle raw string text block from ESP32 Serial output
    if (typeof payload === 'string' || (req.is('text/*') && typeof req.body === 'string')) {
      const rawText = typeof payload === 'string' ? payload : req.body;
      const tempMatch = rawText.match(/Temperature\s*:\s*([\d\.-]+)/i);
      const humMatch = rawText.match(/Humidity\s*:\s*([\d\.-]+)/i);
      const xMatch = rawText.match(/X\s*:\s*([\d\.-]+)/i);
      const yMatch = rawText.match(/Y\s*:\s*([\d\.-]+)/i);
      const zMatch = rawText.match(/Z\s*:\s*([\d\.-]+)/i);
      const rpmMatch = rawText.match(/RPM\s*:\s*([\d\.-]+)/i);
      const voltMatch = rawText.match(/Voltage\s*:\s*([\d\.-]+)/i);
      const curMatch = rawText.match(/Current\s*:\s*([\d\.-]+)/i);
      const soundMatch = rawText.match(/Sound ADC\s*:\s*([\d\.-]+)/i);

      const ax = xMatch ? parseFloat(xMatch[1]) : 0.0;
      const ay = yMatch ? parseFloat(yMatch[1]) : 0.0;
      const az = zMatch ? parseFloat(zMatch[1]) : 1.0;
      const mag = Math.sqrt(ax * ax + ay * ay + az * az);

      payload = {
        deviceId: (req.headers['x-device-id'] as string) || 'ESP32_HARDWARE',
        timestamp: new Date().toISOString(),
        temperature: tempMatch ? parseFloat(tempMatch[1]) : 28.5,
        humidity: humMatch ? parseFloat(humMatch[1]) : 58.2,
        voltage: voltMatch ? parseFloat(voltMatch[1]) : 12.3,
        current: curMatch ? parseFloat(curMatch[1]) : 1.54,
        rpm: rpmMatch ? parseFloat(rpmMatch[1]) : 1450,
        sound: soundMatch ? parseFloat(soundMatch[1]) : 320,
        vibration: Math.max(0.01, Math.round(mag * 1000) / 1000),
        acceleration: { x: ax, y: ay, z: az },
      };
    }

    const deviceId = payload.deviceId || (req.headers['x-device-id'] as string) || 'ESP32_HARDWARE';
    const topic = `company/default/device/${deviceId}`;
    const success = await IngestionService.processMQTTMessage(topic, JSON.stringify(payload));

    if (success) {
      res.json({
        success: true,
        message: 'ESP32 Telemetry ingested successfully',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Telemetry payload rejected',
      });
    }
  } catch (err: any) {
    logger.error('Error in HTTP telemetry ingestion:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Telemetry ingestion failed',
    });
  }
});

export default router;
