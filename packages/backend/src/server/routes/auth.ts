import { Router, Request, Response } from 'express';
import {
  createUser,
  findUserByEmail,
  findUserById,
  userToPublic,
} from '../lib/auth/user.model';
import { hashPassword, comparePassword } from '../lib/auth/password.utils';
import {
  generateTokens,
  verifyRefreshToken,
  verifyAccessToken,
} from '../lib/auth/jwt.utils';
import { LoginRequest, RegisterRequest } from '../lib/auth/types';
import { serializeError } from '../utils/error';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { email, password, name }: RegisterRequest = validation.data;

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res
        .status(409)
        .json({ error: 'User already exists with this email' });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await createUser({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
    });

    // Generate tokens
    const tokens = generateTokens({
      userId: user._id,
      email: user.email,
    });

    return res.status(201).json({
      user,
      ...tokens,
    });
  } catch (err: any) {
    const safeError = serializeError(err);
    console.error('Register error:', safeError);
    return res.status(500).json({ error: safeError.message });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { email, password }: LoginRequest = validation.data;

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user._id!.toString(),
      email: user.email,
    });

    return res.json({
      user: userToPublic(user),
      ...tokens,
    });
  } catch (err: any) {
    const safeError = serializeError(err);
    console.error('Login error:', safeError);
    return res.status(500).json({ error: safeError.message });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res
        .status(401)
        .json({ error: 'Invalid or expired refresh token' });
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: payload.userId,
      email: payload.email,
    });

    return res.json(tokens);
  } catch (err: any) {
    const safeError = serializeError(err);
    console.error('Refresh token error:', safeError);
    return res.status(500).json({ error: safeError.message });
  }
});

// Verify token (protected route)
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await findUserById(payload.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.json({
      valid: true,
      user: userToPublic(user),
    });
  } catch (err: any) {
    const safeError = serializeError(err);
    console.error('Verify token error:', safeError);
    return res.status(500).json({ error: safeError.message });
  }
});

export default router;
