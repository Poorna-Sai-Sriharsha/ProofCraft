import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from './user.model.js';
import { RegisterInput, LoginInput, UpdateProfileInput, ChangePasswordInput } from './auth.schema.js';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';

export interface AuthResult {
  user: {
    id: string;
    name: string;
    email: string;
    createdAt?: Date;
  };
  token: string;
}

export class AuthService {
  static generateToken(userId: string, email: string): string {
    return jwt.sign({ id: userId, email }, env.SESSION_SECRET, {
      expiresIn: '7d',
    });
  }

  static async register(input: RegisterInput): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw ApiError.conflict('An account with this email address already exists.', 'EMAIL_ALREADY_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await User.create({
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const token = this.generateToken(user._id.toString(), user.email);

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  static async login(input: LoginInput): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Explicitly select passwordHash since it is excluded by default
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    const token = this.generateToken(user._id.toString(), user.email);

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  static async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User profile not found.', 'USER_NOT_FOUND');
    }
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  static async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User profile not found.', 'USER_NOT_FOUND');
    }

    if (input.name) {
      user.name = input.name.trim();
    }
    await user.save();

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  static async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw ApiError.notFound('User not found.', 'USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect.', 'INVALID_CURRENT_PASSWORD');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(input.newPassword, salt);
    await user.save();

    return { message: 'Password updated successfully.' };
  }

  static async deleteAccount(userId: string) {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      throw ApiError.notFound('User not found.', 'USER_NOT_FOUND');
    }
    return { message: 'Account deleted successfully.' };
  }
}
