import { z } from 'zod';
import { SensorStatus, SamplingInterval, SensorType } from '../models/Sensor';

export const createSensorSchema = z.object({
  body: z.object({
    sensorName: z.string().min(1, 'Sensor name is required'),
    sensorId: z.string().min(1, 'Sensor ID is required'),
    type: z.nativeEnum(SensorType),
    unit: z.string().min(1, 'Unit is required'),
    status: z.nativeEnum(SensorStatus).optional(),
    samplingInterval: z.nativeEnum(SamplingInterval).optional(),
    isEnabled: z.boolean().optional(),
    thresholds: z
      .object({
        maxTemperature: z.number().optional(),
        maxVibration: z.number().optional(),
        maxCurrent: z.number().optional(),
        minVoltage: z.number().optional(),
        maxVoltage: z.number().optional(),
        minRPM: z.number().optional(),
        maxSound: z.number().optional(),
      })
      .optional(),
    deviceId: z.string().min(1, 'Device ID is required'),
  }),
});

export const updateSensorSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    sensorName: z.string().optional(),
    status: z.nativeEnum(SensorStatus).optional(),
    samplingInterval: z.nativeEnum(SamplingInterval).optional(),
    isEnabled: z.boolean().optional(),
    thresholds: z
      .object({
        maxTemperature: z.number().optional().nullable(),
        maxVibration: z.number().optional().nullable(),
        maxCurrent: z.number().optional().nullable(),
        minVoltage: z.number().optional().nullable(),
        maxVoltage: z.number().optional().nullable(),
        minRPM: z.number().optional().nullable(),
        maxSound: z.number().optional().nullable(),
      })
      .optional(),
  }),
});

export const sensorIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export type CreateSensorInput = z.infer<typeof createSensorSchema>['body'];
export type UpdateSensorInput = z.infer<typeof updateSensorSchema>['body'];
