import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { env } from '../../config/env.js';

const setAuthCookie = (res: Response, token: string) => {
  const isProduction = env.NODE_ENV === 'production';
  res.cookie('proofcart_session', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
};

const clearAuthCookie = (res: Response) => {
  const isProduction = env.NODE_ENV === 'production';
  res.clearCookie('proofcart_session', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body);
  setAuthCookie(res, result.token);

  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      token: result.token,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);
  setAuthCookie(res, result.token);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      token: result.token,
    },
  });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    data: {
      message: 'Successfully logged out.',
    },
  });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const profile = await AuthService.getProfile(req.user!.id);
  res.status(200).json({
    success: true,
    data: profile,
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await AuthService.updateProfile(req.user!.id, req.body);
  res.status(200).json({
    success: true,
    data: profile,
  });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.changePassword(req.user!.id, req.body);
  res.status(200).json({
    success: true,
    data: result,
  });
});

export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.deleteAccount(req.user!.id);
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    data: result,
  });
});
