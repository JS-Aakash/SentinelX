import { Request, Response } from 'express';
import { DashboardService } from '../services/DashboardService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';

export const getDashboardOverview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const companyId = req.user!.companyId.toString();
  const overview = await DashboardService.getOverview(companyId);
  sendSuccess(res, 'Dashboard overview retrieved successfully', overview);
});
