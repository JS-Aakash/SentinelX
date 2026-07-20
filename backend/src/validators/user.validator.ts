import { z } from 'zod';

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phoneNumber: z.string().optional(),
  }),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
