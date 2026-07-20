import { Request, Response } from 'express';
import path from 'path';
import { userService } from '../services/UserService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await userService.getProfile(req.user!.userId);
  sendSuccess(res, 'Profile retrieved successfully', user);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await userService.updateProfile(req.user!.userId, req.body);
  sendSuccess(res, 'Profile updated successfully', user);
});

export const uploadAvatar = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    throw ApiError.badRequest('No avatar file provided');
  }

  const imageUrl = req.file.path; // Cloudinary secure URL is provided in path parameter
  const user = await userService.updateAvatar(req.user!.userId, imageUrl);

  sendSuccess(res, 'Avatar updated successfully', user);
});
