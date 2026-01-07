/**
 * Rate Limiting Middleware
 * Prevents brute force attacks on authentication endpoints
 */

const rateLimit = require('express-rate-limit');
const AuditLog = require('../models/AuditLog');

/**
 * General API rate limiter
 * - 100 requests per 15 minutes per IP
 */
const apiRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
  handler: (req, res, options) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Stricter rate limiter for auth endpoints
 * - 5 login attempts per 15 minutes per IP
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
  skipSuccessfulRequests: true,
  handler: async (req, res, options) => {
    try {
      await AuditLog.log({
        userEmail: req.body?.email,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        requestPath: req.originalUrl,
        requestMethod: req.method,
        statusCode: 429,
        success: false,
        errorMessage: 'Rate limit exceeded'
      });
    } catch (error) {
      console.error('Failed to log rate limit violation:', error);
    }
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Rate limiter for admin endpoints
 */
const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'Too many admin requests, please slow down.',
    retryAfter: 1
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for password reset endpoints
 */
const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: 'Too many password reset attempts. Please try again after 1 hour.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  apiRateLimiter,
  authRateLimiter,
  adminRateLimiter,
  passwordResetRateLimiter
};
