import { Request, Response } from 'express';
import { AnomalyEvent, AnomalySeverity, AnomalyStatus } from '../models/AnomalyEvent';
import { Machine } from '../models/Machine';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export const getLiveAnomalyStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const machine = await Machine.findOne({ _id: machineId, companyId }).exec();
  if (!machine) {
    throw ApiError.notFound('Machine not found');
  }

  const activeEvent = await AnomalyEvent.findOne({ machineId, companyId, status: { $in: ['Active', 'Acknowledged'] } })
    .sort({ timestamp: -1 })
    .lean()
    .exec();

  sendSuccess(res, 'Live anomaly status retrieved', {
    machineId,
    activeEvent: activeEvent || null,
    severity: activeEvent ? activeEvent.severity : 'Normal',
    anomalyScore: activeEvent ? activeEvent.anomalyScore : 0.05,
    status: activeEvent ? activeEvent.status : 'Normal',
  });
});

export const getAnomalyHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { machineId } = req.params as Record<string, string>;
  const { page = '1', limit = '50', severity, status, search } = req.query as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));

  const query: Record<string, any> = { machineId, companyId };

  if (severity && severity !== 'all') {
    query.severity = severity;
  }
  if (status && status !== 'all') {
    query.status = status;
  }
  if (search) {
    query.$or = [
      { primaryCause: { $regex: search, $options: 'i' } },
      { recommendedAction: { $regex: search, $options: 'i' } },
      { affectedSensors: { $elemMatch: { $regex: search, $options: 'i' } } },
    ];
  }

  const total = await AnomalyEvent.countDocuments(query);
  const events = await AnomalyEvent.find(query)
    .sort({ timestamp: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean()
    .exec();

  sendSuccess(res, 'Anomaly history log retrieved', {
    events,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

export const acknowledgeAnomalyEvent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { eventId } = req.params as Record<string, string>;
  const companyId = req.user!.companyId.toString();

  const event = await AnomalyEvent.findOne({ _id: eventId, companyId }).exec();
  if (!event) {
    throw ApiError.notFound('Anomaly event not found');
  }

  event.status = 'Acknowledged';
  event.acknowledgedAt = new Date();
  event.acknowledgedBy = req.user!.userId as any;
  await event.save();

  sendSuccess(res, 'Anomaly event acknowledged successfully', event);
});

export const resolveAnomalyEvent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { eventId } = req.params as Record<string, string>;
  const { resolutionNotes } = req.body as { resolutionNotes?: string };
  const companyId = req.user!.companyId.toString();

  const event = await AnomalyEvent.findOne({ _id: eventId, companyId }).exec();
  if (!event) {
    throw ApiError.notFound('Anomaly event not found');
  }

  event.status = 'Resolved';
  event.resolvedAt = new Date();
  event.resolvedBy = req.user!.userId as any;
  event.resolutionNotes = resolutionNotes || 'Resolved by operator';
  await event.save();

  sendSuccess(res, 'Anomaly event resolved successfully', event);
});
