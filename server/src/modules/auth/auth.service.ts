import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from './user.model.js';
import {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schema.js';
import { Purchase } from '../purchases/purchase.model.js';
import { PurchaseDocument } from '../documents/document.model.js';
import { ServiceRecord } from '../services/service.model.js';
import { Notification } from '../notifications/notification.model.js';
import { getStorageProvider } from '../documents/storage/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

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
  static generateToken(userId: string, email: string, tokenVersion: number = 0): string {
    return jwt.sign({ id: userId, email, tokenVersion }, env.SESSION_SECRET, {
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
      tokenVersion: 0,
    });

    const token = this.generateToken(user._id.toString(), user.email, user.tokenVersion || 0);

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

    const token = this.generateToken(user._id.toString(), user.email, user.tokenVersion || 0);

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
    // Increment tokenVersion to revoke all previously issued tokens (SEC-01)
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    const newToken = this.generateToken(user._id.toString(), user.email, user.tokenVersion);

    return {
      message: 'Password updated successfully. Prior sessions have been invalidated.',
      token: newToken,
    };
  }

  static async requestPasswordReset(input: ForgotPasswordInput) {
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Uniform generic message prevents user enumeration
      return { message: 'If an account exists with this email, a reset code has been sent.' };
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    logger.info(`🔑 [Auth] Password reset code generated for ${user.email}: ${resetCode}`);

    return {
      message: 'If an account exists with this email, a reset code has been sent.',
      resetCode: env.NODE_ENV !== 'production' ? resetCode : undefined,
    };
  }

  static async resetPasswordWithCode(input: ResetPasswordInput) {
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+resetPasswordCode +resetPasswordExpires');
    if (!user || !user.resetPasswordCode || !user.resetPasswordExpires) {
      throw ApiError.badRequest('Invalid or expired reset code.', 'INVALID_RESET_CODE');
    }

    if (user.resetPasswordExpires.getTime() < Date.now()) {
      user.resetPasswordCode = null;
      user.resetPasswordExpires = null;
      await user.save();
      throw ApiError.badRequest('Password reset code has expired. Please request a new one.', 'RESET_CODE_EXPIRED');
    }

    if (user.resetPasswordCode !== input.resetCode.trim()) {
      throw ApiError.badRequest('Incorrect reset code.', 'INVALID_RESET_CODE');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(input.newPassword, salt);
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all prior sessions
    await user.save();

    return { message: 'Password reset successfully. You can now sign in with your new password.' };
  }

  static async revokeTokens(userId: string) {
    await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
  }

  static async deleteAccount(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found.', 'USER_NOT_FOUND');
    }

    const userObjectId = user._id;

    // 1. Delete all physical documents belonging to the user from storage (DB-01)
    const docs = await PurchaseDocument.find({ userId: userObjectId });
    const storage = getStorageProvider();
    for (const doc of docs) {
      try {
        await storage.deleteFile(doc.storageKey);
      } catch (err: any) {
        logger.warn(`Could not delete storage file ${doc.storageKey}: ${err.message}`);
      }
    }

    // 2. Cascading deletion across all collections (GDPR Right to Erasure)
    await Promise.all([
      PurchaseDocument.deleteMany({ userId: userObjectId }),
      ServiceRecord.deleteMany({ userId: userObjectId }),
      Notification.deleteMany({ userId: userObjectId }),
      Purchase.deleteMany({ userId: userObjectId }),
      User.findByIdAndDelete(userId),
    ]);

    return { message: 'Account and all associated records deleted permanently.' };
  }
}
