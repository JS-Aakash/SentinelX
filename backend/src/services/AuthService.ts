import mongoose from 'mongoose';
import { userRepository } from '../repositories/UserRepository';
import { companyRepository } from '../repositories/CompanyRepository';
import { tokenService } from './TokenService';
import { mailService } from './MailService';
import { ApiError } from '../utils/ApiError';
import { UserRole } from '../models/User';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from '../validators/auth.validator';

export class AuthService {
  async register(data: RegisterInput) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if user email already exists
      const existingUser = await userRepository.findByEmail(data.user.email);
      if (existingUser) {
        throw ApiError.conflict('A user with this email already exists');
      }

      // Check if company email already exists
      const existingCompany = await companyRepository.findByEmail(data.company.email);
      if (existingCompany) {
        throw ApiError.conflict('A company with this email already exists');
      }

      // Create company
      const company = await companyRepository.create(data.company);

      // Create first admin user
      const user = await userRepository.create({
        ...data.user,
        role: UserRole.COMPANY_ADMIN,
        companyId: company._id,
        isEmailVerified: true, // Auto-verified for first admin
      });

      // Generate tokens
      const accessToken = tokenService.generateAccessToken(user);
      const refreshToken = tokenService.generateRefreshToken(user);

      // Save refresh token
      await userRepository.updateRefreshToken(user._id, refreshToken);

      await session.commitTransaction();

      // Send welcome email (non-blocking)
      mailService.sendWelcomeEmail(user.email, user.name, company.name).catch(() => {});

      return { user, company, accessToken, refreshToken };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async login(data: LoginInput) {
    // Get user with password
    const user = await userRepository.findByEmailWithPassword(data.email);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Your account has been deactivated. Please contact your admin.');
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(data.password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Get company info
    const company = await companyRepository.findById(user.companyId);

    // Generate tokens
    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken(user);

    // Save refresh token
    await userRepository.updateRefreshToken(user._id, refreshToken);

    return { user, company, accessToken, refreshToken };
  }

  async logout(userId: string) {
    await userRepository.updateRefreshToken(userId, null);
  }

  async refreshToken(token: string) {
    try {
      const decoded = tokenService.verifyRefreshToken(token);

      const user = await userRepository.findByIdWithRefreshToken(decoded.userId);
      if (!user || user.refreshToken !== token) {
        throw ApiError.unauthorized('Invalid refresh token');
      }

      if (!user.isActive) {
        throw ApiError.unauthorized('Account deactivated');
      }

      // Rotate refresh token
      const newAccessToken = tokenService.generateAccessToken(user);
      const newRefreshToken = tokenService.generateRefreshToken(user);

      await userRepository.updateRefreshToken(user._id, newRefreshToken);

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
  }

  async forgotPassword(data: ForgotPasswordInput) {
    const user = await userRepository.findByEmail(data.email);

    // Always return success to prevent email enumeration
    if (!user) return;

    const resetToken = tokenService.generatePasswordResetToken(user);

    // Send email (mocked)
    await mailService.sendPasswordResetEmail(user.email, resetToken, user.name);
  }

  async resetPassword(data: ResetPasswordInput) {
    try {
      const decoded = tokenService.verifyPasswordResetToken(data.token);

      const user = await userRepository.findByIdWithPassword(decoded.userId);
      if (!user || user.email !== decoded.email) {
        throw ApiError.badRequest('Invalid or expired reset token');
      }

      // Update password - pre-save hook will hash it
      user.password = data.password;
      await user.save();

      // Invalidate all refresh tokens
      await userRepository.updateRefreshToken(user._id, null);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Invalid or expired reset token');
    }
  }

  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isCurrentPasswordValid = await user.comparePassword(data.currentPassword);
    if (!isCurrentPasswordValid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    if (data.currentPassword === data.newPassword) {
      throw ApiError.badRequest('New password must be different from current password');
    }

    // Update via save to trigger pre-save hook
    user.password = data.newPassword;
    await user.save();

    // Invalidate all sessions
    await userRepository.updateRefreshToken(user._id, null);
  }
}

export const authService = new AuthService();
