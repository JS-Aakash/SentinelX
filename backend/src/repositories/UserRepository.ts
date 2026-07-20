import { User, IUser } from '../models/User';
import mongoose from 'mongoose';

export class UserRepository {
  async create(data: Partial<IUser>): Promise<IUser> {
    const user = new User(data);
    return user.save();
  }

  async findById(id: string | mongoose.Types.ObjectId): Promise<IUser | null> {
    return User.findById(id);
  }

  async findByIdWithPassword(id: string | mongoose.Types.ObjectId): Promise<IUser | null> {
    return User.findById(id).select('+password');
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() });
  }

  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() }).select('+password');
  }

  async findByEmailWithRefreshToken(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');
  }

  async findByIdWithRefreshToken(id: string | mongoose.Types.ObjectId): Promise<IUser | null> {
    return User.findById(id).select('+refreshToken');
  }

  async findByCompanyId(companyId: string | mongoose.Types.ObjectId): Promise<IUser[]> {
    return User.find({ companyId });
  }

  async update(
    id: string | mongoose.Types.ObjectId,
    data: Partial<IUser>
  ): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }

  async updateRefreshToken(
    id: string | mongoose.Types.ObjectId,
    refreshToken: string | null
  ): Promise<void> {
    await User.findByIdAndUpdate(id, { $set: { refreshToken } });
  }

  async updatePassword(
    id: string | mongoose.Types.ObjectId,
    hashedPassword: string
  ): Promise<void> {
    await User.findByIdAndUpdate(id, { $set: { password: hashedPassword } });
  }

  async updateAvatar(
    id: string | mongoose.Types.ObjectId,
    avatarPath: string
  ): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, { $set: { profilePicture: avatarPath } }, { new: true });
  }
}

export const userRepository = new UserRepository();
