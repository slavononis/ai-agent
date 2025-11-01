import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/auth/jwt.utils';
import { findUserById } from '../lib/auth/user.model';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    _id: string;
    email: string;
    name?: string;
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Verify user still exists
    const user = await findUserById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.userId = payload.userId;
    req.user = {
      _id: user._id!.toString(),
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}
