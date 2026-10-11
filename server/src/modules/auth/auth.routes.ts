import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
  forgotPassword,
  resetPassword,
} from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema.js';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), register);
router.post('/login', authLimiter, validate({ body: loginSchema }), login);
router.post('/logout', logout);
router.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), resetPassword);

router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, validate({ body: updateProfileSchema }), updateProfile);
router.patch('/password', authenticate, validate({ body: changePasswordSchema }), changePassword);
router.delete('/account', authenticate, deleteAccount);

export const authRoutes = router;
