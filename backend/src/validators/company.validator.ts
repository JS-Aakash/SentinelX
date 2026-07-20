import { z } from 'zod';

export const updateCompanySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    industryType: z.string().min(2).optional(),
    email: z.string().email().optional(),
    contactNumber: z.string().min(7).optional(),
    address: z.string().min(5).optional(),
    country: z.string().min(2).optional(),
    state: z.string().min(2).optional(),
    city: z.string().min(2).optional(),
  }),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>['body'];
