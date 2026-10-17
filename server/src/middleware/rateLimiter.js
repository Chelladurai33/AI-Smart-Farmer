const rateLimit = require('express-rate-limit');

/**
 * Returns a standard rate limit exceeded message.
 */
const rateLimitMessage = (msg) => ({
  success: false,
  message: 'Too Many Requests',
  data: null,
  error: msg,
});

/**
 * General API limiter — 1500 req per 15 min per IP.
 * High limit for modern SPA dashboards with multiple concurrent API calls.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  message: rateLimitMessage('Too many requests. Please try again in 15 minutes.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' || req.path === '/health' || req.path === '/' || req.path === '/api/health',
  validate: { trustProxy: false },
});

/**
 * Auth limiter — 50 attempts per 15 min.
 * Protects login/register from brute-force while allowing reasonable user retries.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: rateLimitMessage('Too many authentication attempts. Please try again in 15 minutes.'),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

/**
 * AI endpoint limiter — 30 req per minute.
 * Prevents AI API quota abuse while allowing active interactive chats.
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: rateLimitMessage('AI request limit reached. Please wait a moment before trying again.'),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

/**
 * Strict limiter for upload endpoints — 30 req per 10 min.
 */
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: rateLimitMessage('Upload limit reached. Please wait before uploading again.'),
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { generalLimiter, authLimiter, aiLimiter, uploadLimiter };
