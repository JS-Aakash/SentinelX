import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    company: z.object({
      name: z.string().min(2, 'Company name must be at least 2 characters').max(100),
      industryType: z.string().min(2, 'Industry type is required'),
      email: z.string().email('Invalid company email'),
      contactNumber: z.string().min(7, 'Contact number must be at least 7 digits'),
      address: z.string().min(5, 'Address is required'),
      country: z.string().min(2, 'Country is required'),
      state: z.string().min(2, 'State is required'),
      city: z.string().min(2, 'City is required'),
    }),
    user: z.object({
      name: z.string().min(2, 'Name must be at least 2 characters').max(100),
      email: z.string().email('Invalid email address'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/\d/, 'Password must contain at least one number'),
      phoneNumber: z.string().optional(),
    }),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/\d/, 'Password must contain at least one number'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/\d/, 'Password must contain at least one number'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
