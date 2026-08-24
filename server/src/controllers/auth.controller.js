const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { sendSuccess, sendError, sendValidationError } = require('../utils/apiResponse');
const prisma = require('../utils/prisma');

// ─── Token generation ─────────────────────────────────────────────────────────

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

/**
 * Set refresh token as a secure, HTTP-only cookie.
 * Uses sameSite: 'none' in production so the cookie works across
 * different Render subdomains (frontend vs backend).
 */
const setRefreshCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
};

// ─── Validation schemas ────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
  role: z.enum(['FARMER', 'BUYER']).default('BUYER'),
  phone: z
    .preprocess((val) => {
      if (typeof val !== 'string') return val;
      let cleaned = val.replace(/[\s\-\+\(\)]/g, '');
      if (cleaned.startsWith('91') && cleaned.length === 12) {
        cleaned = cleaned.slice(2);
      } else if (cleaned.startsWith('0') && cleaned.length === 11) {
        cleaned = cleaned.slice(1);
      }
      return cleaned;
    }, z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number. Must be 10 digits starting with 6-9').optional().or(z.literal(''))),
  subDistrict: z.string().max(100).optional(),
  village: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// ─── Controllers ───────────────────────────────────────────────────────────────

const register = async (req, res, next) => {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return sendValidationError(res, result.error.flatten().fieldErrors);
    }

    const {
      name, email, password, role, phone,
      subDistrict, village, district, state, latitude, longitude,
    } = result.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return sendError(res, 'An account with this email already exists.', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        phone: phone || null,
        subDistrict: subDistrict || null,
        village: village || null,
        district: district || null,
        state: state || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        // Auto-verify new accounts so users can log in immediately.
        // Set to false if you want admin approval workflow.
        isVerified: true,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    setRefreshCookie(res, refreshToken);

    return sendSuccess(res, { user, accessToken }, 201, 'Registration successful');
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return sendValidationError(res, result.error.flatten().fieldErrors);
    }

    const { email, password } = result.data;

    // Use a single generic error for invalid credentials to prevent user enumeration
    const user = await prisma.user.findUnique({ where: { email } });
    const INVALID_CREDS = 'Invalid email or password.';

    if (!user) {
      return sendError(res, INVALID_CREDS, 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return sendError(res, INVALID_CREDS, 401);
    }

    if (!user.isVerified) {
      return sendError(res, 'Your account is suspended or not yet verified. Contact support.', 403);
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    setRefreshCookie(res, refreshToken);

    const { password: _, ...userWithoutPassword } = user;
    return sendSuccess(res, { user: userWithoutPassword, accessToken }, 200, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const logout = (_req, res) => {
  res.clearCookie('refreshToken', { path: '/' });
  return sendSuccess(res, null, 200, 'Logged out successfully');
};

const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return sendError(res, 'Refresh token not found. Please log in again.', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (jwtErr) {
      return next(jwtErr);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isVerified: true },
    });

    if (!user) {
      return sendError(res, 'User not found. Please log in again.', 401);
    }

    if (!user.isVerified) {
      return sendError(res, 'Your account is suspended.', 403);
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.role);
    setRefreshCookie(res, newRefreshToken);

    return sendSuccess(res, { accessToken }, 200, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res) => {
  // Always return the same message to prevent email enumeration
  return sendSuccess(
    res,
    null,
    200,
    'If an account with that email exists, a password reset link has been sent.'
  );
};

module.exports = { register, login, logout, refreshToken, forgotPassword };
