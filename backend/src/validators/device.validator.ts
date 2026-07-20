import { z } from 'zod';
import { DeviceStatus, DeviceType } from '../models/Device';

export const createDeviceSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Device name is required').max(150),
    deviceId: z
      .string()
      .min(1, 'Device ID is required')
      .max(50)
      .regex(/^[A-Za-z0-9_-]+$/, 'Device ID can only contain letters, numbers, hyphens, and underscores'),
    type: z.string().optional().default(DeviceType.ESP32),
    firmwareVersion: z.string().optional(),
    macAddress: z
      .string()
      .regex(/^([0-[0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Invalid MAC address format (e.g. AA:BB:CC:DD:EE:FF)')
      .optional()
      .or(z.literal('')),
    serialNumber: z.string().optional(),
    status: z.nativeEnum(DeviceStatus).optional().default(DeviceStatus.OFFLINE),
    machineId: z.string().optional().nullable(),
    description: z.string().max(1000).optional(),
  }),
});

export const updateDeviceSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(150).optional(),
    deviceId: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    type: z.string().optional(),
    firmwareVersion: z.string().optional(),
    macAddress: z.string().optional().or(z.literal('')),
    serialNumber: z.string().optional(),
    status: z.nativeEnum(DeviceStatus).optional(),
    machineId: z.string().optional().nullable(),
    description: z.string().max(1000).optional(),
  }),
});

export const getDevicesQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.nativeEnum(DeviceStatus).optional(),
    machineId: z.string().optional(),
    sortBy: z.enum(['name', 'createdAt', 'lastSeen']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const deviceIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Device ID is required') }),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>['body'];
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>['body'];
export type GetDevicesQuery = z.infer<typeof getDevicesQuerySchema>['query'];
