import { Request, Response } from 'express';
import { MaintenanceService } from '../services/MaintenanceService';
import { sendSuccess, sendCreated } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

export const getMaintenanceOverview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const overview = await MaintenanceService.getOverview(req.user!.companyId);
  sendSuccess(res, 'Predictive maintenance overview retrieved successfully', overview);
});

export const getWorkOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await MaintenanceService.getWorkOrders(req.user!.companyId, req.query as Record<string, any>);
  sendSuccess(res, 'Work orders retrieved successfully', result);
});

export const createWorkOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId, title, description, dueDate } = req.body;
  if (!machineId || !title || !description || !dueDate) {
    throw ApiError.badRequest('machineId, title, description, and dueDate are required');
  }

  const workOrder = await MaintenanceService.createWorkOrder(req.user!.companyId, req.user!.userId, req.body);
  sendCreated(res, 'Work order created successfully', workOrder);
});

export const updateWorkOrderStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { status } = req.body;
  if (!status) {
    throw ApiError.badRequest('status is required');
  }

  const workOrder = await MaintenanceService.updateWorkOrderStatus(req.user!.companyId, id, status);
  sendSuccess(res, 'Work order status updated successfully', workOrder);
});

export const completeWorkOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const files = (req.files as any[]) || [];
  const workOrder = await MaintenanceService.completeWorkOrder(req.user!.companyId, id, req.user!.userId, req.body, files);
  sendSuccess(res, 'Work order completed and evidence uploaded to IPFS successfully', workOrder);
});

export const verifyWorkOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const workOrder = await MaintenanceService.verifyWorkOrder(req.user!.companyId, id, req.user!.userId);
  sendSuccess(res, 'Work order verified and recorded on Ethereum Sepolia Testnet successfully', workOrder);
});

export const getBlockchainExplorerLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const logs = await MaintenanceService.getBlockchainExplorerLogs(req.user!.companyId);
  sendSuccess(res, 'Ethereum Sepolia blockchain explorer logs retrieved successfully', logs);
});

export const getMachineHistoryTimeline = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const machineId = req.params.machineId as string;
  const timeline = await MaintenanceService.getMachineHistoryTimeline(req.user!.companyId, machineId);
  sendSuccess(res, 'Machine maintenance timeline retrieved successfully', timeline);
});
