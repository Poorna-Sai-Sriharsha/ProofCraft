import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

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

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  // Extract token from either HttpOnly cookie or Authorization Bearer header
  let token = req.cookies?.proofcart_session;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return next(ApiError.unauthorized('Authentication required to access this resource.', 'UNAUTHORIZED'));
  }

  try {
    const decoded = jwt.verify(token, env.SESSION_SECRET) as { id: string; email: string };
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
