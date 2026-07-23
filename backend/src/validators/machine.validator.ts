import { z } from 'zod';
import { MachineStatus } from '../models/Machine';

const currentYear = new Date().getFullYear();

// ─── Create Machine ────────────────────────────────────────────────────────────

export const createMachineSchema = z.object({
  body: z.object({
    machineCode: z
      .string()
      .min(1, 'Machine code is required')
      .max(50, 'Machine code cannot exceed 50 characters')
      .regex(/^[A-Za-z0-9_\-]+$/, 'Machine code can only contain letters, numbers, hyphens, and underscores'),
    name: z.string().min(1, 'Machine name is required').max(150, 'Machine name cannot exceed 150 characters'),
    type: z.string().min(1, 'Machine type is required'),
    manufacturer: z.string().max(100).optional(),
    modelNumber: z.string().max(100).optional(),
    serialNumber: z.string().max(100).optional(),
    manufacturingYear: z
      .number()
      .int()
      .min(1900, 'Manufacturing year must be 1900 or later')
      .max(currentYear, 'Manufacturing year cannot be in the future')
      .optional(),
    installationDate: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const date = new Date(val);
          return !isNaN(date.getTime()) && date <= new Date();
        },
        { message: 'Installation date cannot be in the future' }
      ),
    plant: z.string().max(100).optional(),
    department: z.string().max(100).optional(),
    location: z.string().max(200).optional(),
    status: z.nativeEnum(MachineStatus).optional(),
    ratedRPM: z.number().positive('Rated RPM must be positive').optional(),
    ratedVoltage: z.number().positive('Rated voltage must be positive').optional(),
    ratedCurrent: z.number().positive('Rated current must be positive').optional(),
    ratedTemperature: z.number().positive('Rated temperature must be positive').optional(),
    ratedPower: z.number().positive('Rated power must be positive').optional(),
    ratedSound: z.number().positive('Rated sound must be positive').optional(),
    ratedVibration: z.number().positive('Rated vibration must be positive').optional(),
    operatingLimits: z
      .object({
        maxTemperature: z.number().nonnegative().optional(),
        maxVibration: z.number().nonnegative().optional(),
        maxCurrent: z.number().nonnegative().optional(),
        minRPM: z.number().nonnegative().optional(),
      })
      .optional(),
    description: z.string().max(2000).optional(),
    tags: z.array(z.string().max(50)).max(20, 'Cannot have more than 20 tags').optional(),
  }),
});

// ─── Update Machine ────────────────────────────────────────────────────────────

export const updateMachineSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    machineCode: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[A-Za-z0-9_\-]+$/)
      .optional(),
    name: z.string().min(1).max(150).optional(),
    type: z.string().min(1).optional(),
    manufacturer: z.string().max(100).optional(),
    modelNumber: z.string().max(100).optional(),
    serialNumber: z.string().max(100).optional(),
    manufacturingYear: z.number().int().min(1900).max(currentYear).optional(),
    installationDate: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const date = new Date(val);
          return !isNaN(date.getTime()) && date <= new Date();
        },
        { message: 'Installation date cannot be in the future' }
      ),
    plant: z.string().max(100).optional(),
    department: z.string().max(100).optional(),
    location: z.string().max(200).optional(),
    status: z.nativeEnum(MachineStatus).optional(),
    ratedRPM: z.number().positive().optional(),
    ratedVoltage: z.number().positive().optional(),
    ratedCurrent: z.number().positive().optional(),
    ratedTemperature: z.number().positive().optional(),
    ratedPower: z.number().positive().optional(),
    operatingLimits: z
      .object({
        maxTemperature: z.number().nonnegative().optional(),
        maxVibration: z.number().nonnegative().optional(),
        maxCurrent: z.number().nonnegative().optional(),
        minRPM: z.number().nonnegative().optional(),
      })
      .optional(),
    description: z.string().max(2000).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
  }),
});

// ─── Query Schema ──────────────────────────────────────────────────────────────

export const getMachinesQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    type: z.string().optional(),
    status: z.nativeEnum(MachineStatus).optional(),
    plant: z.string().optional(),
    department: z.string().optional(),
    sortBy: z.enum(['name', 'createdAt', 'installationDate']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const machineIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Machine ID is required') }),
});

// ─── Inferred Types ────────────────────────────────────────────────────────────

export type CreateMachineInput = z.infer<typeof createMachineSchema>['body'];
export type UpdateMachineInput = z.infer<typeof updateMachineSchema>['body'];
export type GetMachinesQuery = z.infer<typeof getMachinesQuerySchema>['query'];
