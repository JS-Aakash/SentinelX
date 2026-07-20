import { Request, Response } from 'express';
import { Machine } from '../models/Machine';
import { Device } from '../models/Device';
import { pgPool, isTimescaleConnected } from '../database/timescale';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export const getChartData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();
  const { metric, range, startDate, endDate } = req.query as Record<string, string>;

  const machine = await Machine.findOne({ _id: id, companyId }).exec();
  if (!machine) {
    throw ApiError.notFound('Machine not found');
  }

  const device = await Device.findOne({ machineId: machine._id }).exec();
  if (!device || !isTimescaleConnected()) {
    sendSuccess(res, 'Chart data retrieved', []);
    return;
  }

  // Determine valid metric column
  const validMetrics = ['temperature', 'vibration', 'current', 'voltage', 'rpm', 'sound'];
  const metricCol = validMetrics.includes(metric) ? metric : 'temperature';

  // Determine time range
  let fromDate: Date;
  const now = new Date();

  if (startDate && endDate) {
    fromDate = new Date(startDate);
  } else {
    switch (range) {
      case '5m':
        fromDate = new Date(now.getTime() - 5 * 60 * 1000);
        break;
      case '30m':
        fromDate = new Date(now.getTime() - 30 * 60 * 1000);
        break;
      case '1h':
        fromDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      default:
        fromDate = new Date(now.getTime() - 60 * 60 * 1000); // default 1h
    }
  }

  const toDate = endDate ? new Date(endDate) : now;

  try {
    const result = await pgPool.query(
      `SELECT timestamp, ${metricCol} as value
       FROM sensor_readings
       WHERE (device_id = $1 OR machine_id = $2)
         AND timestamp >= $3
         AND timestamp <= $4
       ORDER BY timestamp ASC
       LIMIT 2000`,
      [device.deviceId, machine._id.toString(), fromDate, toDate]
    );

    const data = result.rows.map((row) => ({
      timestamp: new Date(row.timestamp).toISOString(),
      value: row.value != null ? Number(row.value) : null,
    }));

    sendSuccess(res, 'Chart data retrieved', data);
  } catch (err: any) {
    sendSuccess(res, 'Chart data retrieved', []);
  }
});
