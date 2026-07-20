import { userRepository } from '../repositories/UserRepository';
import { ApiError } from '../utils/ApiError';
import { IUser } from '../models/User';

export class UserService {
  async getProfile(userId: string): Promise<IUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; phoneNumber?: string }): Promise<IUser> {
    const user = await userRepository.update(userId, data);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  async updateAvatar(userId: string, avatarPath: string): Promise<IUser> {
    const user = await userRepository.updateAvatar(userId, avatarPath);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }
}

export const userService = new UserService();
