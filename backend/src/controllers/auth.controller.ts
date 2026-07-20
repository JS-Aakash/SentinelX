import { Request, Response } from 'express';
import { authService } from '../services/AuthService';
import { tokenService } from '../services/TokenService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { user, company, accessToken, refreshToken } = await authService.register(req.body);

  // Set refresh token as HttpOnly cookie
  res.cookie('refreshToken', refreshToken, tokenService.getRefreshTokenCookieOptions());

  sendCreated(res, 'Registration successful. Welcome to SentinelX!', {
    user,
    company,
    accessToken,
  });
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { user, company, accessToken, refreshToken } = await authService.login(req.body);

  res.cookie('refreshToken', refreshToken, tokenService.getRefreshTokenCookieOptions());

  sendSuccess(res, 'Login successful', { user, company, accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await authService.logout(req.user!.userId);

  res.clearCookie('refreshToken', { path: '/' });

  sendSuccess(res, 'Logged out successfully');
});

export const refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    throw ApiError.unauthorized('No refresh token provided');
  }

  const { accessToken, refreshToken: newRefreshToken } = await authService.refreshToken(token);

  res.cookie('refreshToken', newRefreshToken, tokenService.getRefreshTokenCookieOptions());

  sendSuccess(res, 'Token refreshed', { accessToken });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await authService.forgotPassword(req.body);
  // Always return success to prevent email enumeration
  sendSuccess(
    res,
    'If an account with that email exists, a password reset link has been sent.'
  );
});

export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await authService.resetPassword(req.body);
  sendSuccess(res, 'Password reset successfully. You can now log in with your new password.');
});

export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await authService.changePassword(req.user!.userId, req.body);

  // Clear refresh token cookie (forces re-login)
  res.clearCookie('refreshToken', { path: '/' });

  sendSuccess(res, 'Password changed successfully. Please log in again.');
});

export const getMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  sendSuccess(res, 'Current user info', req.user);
});
