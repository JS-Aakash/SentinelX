import { Request, Response } from 'express';
import { LiveSensorService } from '../services/LiveSensorService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, ApiResponse } from '../utils/ApiResponse';

// ─── GET /machines/:id/live ───────────────────────────────────────────────────

export const getMachineLiveTelemetry = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const data = await LiveSensorService.getLiveTelemetry(id, companyId);
  sendSuccess(res, 'Live telemetry retrieved successfully', data);
});

// ─── GET /machines/:id/history ────────────────────────────────────────────────

export const getMachineTelemetryHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();
  const query = req.query as Record<string, string>;

  const result = await LiveSensorService.getTelemetryHistory(id, companyId, query);
  new ApiResponse(res, 200, 'Telemetry history retrieved successfully', result.readings)
    .withMeta({
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    })
    .send();
});
