import { Request, Response } from 'express';
import path from 'path';
import { companyService } from '../services/CompanyService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export const getCompany = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const company = await companyService.getCompany(req.user!.companyId);
  sendSuccess(res, 'Company retrieved successfully', company);
});

export const updateCompany = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const company = await companyService.updateCompany(req.user!.companyId, req.body);
  sendSuccess(res, 'Company updated successfully', company);
});

export const uploadCompanyLogo = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw ApiError.badRequest('No logo file provided');
    }

    const imageUrl = req.file.path; // Cloudinary secure URL is provided in path parameter
    const company = await companyService.updateLogo(req.user!.companyId, imageUrl);

    sendSuccess(res, 'Company logo updated successfully', company);
  }
);
