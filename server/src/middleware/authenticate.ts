import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { User } from '../modules/auth/user.model.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  let isCookieAuth = false;
  let token = req.cookies?.proofcart_session;
  if (token) {
    isCookieAuth = true;
  }

  // Header takes precedence or serves as fallback
  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
      isCookieAuth = false;
    }
  }

  if (!token) {
    return next(ApiError.unauthorized('Authentication required to access this resource.', 'UNAUTHORIZED'));
  }

  // SEC-02: CSRF protection for cookie-only mutations
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (isCookieAuth && mutatingMethods.includes(req.method)) {
    const requestedWith = req.headers['x-requested-with'];
    if (requestedWith !== 'XMLHttpRequest') {
      return next(ApiError.forbidden('Cross-site request validation failed: missing custom header.', 'CSRF_DETECTED'));
    }
  }

  try {
    const decoded = jwt.verify(token, env.SESSION_SECRET) as {
      id: string;
      email: string;
      tokenVersion?: number;
    };

    // SEC-01: Verify user exists and tokenVersion matches current user state
    const user = await User.findById(decoded.id).select('tokenVersion email').lean();
    if (!user) {
      return next(ApiError.unauthorized('Account no longer exists.', 'USER_NOT_FOUND'));
    }

    if (
      decoded.tokenVersion !== undefined &&
      user.tokenVersion !== undefined &&
      user.tokenVersion !== decoded.tokenVersion
    ) {
      return next(
        ApiError.unauthorized(
          'Session has been revoked due to a credential change. Please sign in again.',
          'SESSION_REVOKED'
        )
      );
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
    };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Session has expired. Please sign in again.', 'SESSION_EXPIRED'));
    }
    return next(ApiError.unauthorized('Invalid authentication token.', 'INVALID_TOKEN'));
  }
};
