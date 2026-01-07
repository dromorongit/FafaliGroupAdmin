/**
 * Authentication Routes
 * Routes for admin login, logout, and token management
 */

const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authRateLimiter, passwordResetRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @route POST /admin/api/auth/login
 * @desc Admin login
 * @access Public (rate limited)
 */
router.post(
  '/login',
  authRateLimiter,
  [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 1 })
      .withMessage('Password is required')
  ],
  authController.login
);

/**
 * @route POST /admin/api/auth/logout
 * @desc Admin logout
 * @access Private
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * @route POST /admin/api/auth/refresh
 * @desc Refresh access token
 * @access Public (with refresh token)
 */
router.post(
  '/refresh',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required')
  ],
  authController.refresh
);

/**
 * @route POST /admin/api/auth/forgot-password
 * @desc Request password reset (stub)
 * @access Public
 */
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email address')
      .normalizeEmail()
  ],
  authController.forgotPassword
);

/**
 * @route POST /admin/api/auth/reset-password
 * @desc Reset password with token (stub)
 * @access Public
 */
router.post(
  '/reset-password',
  [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/\d/)
      .withMessage('Password must contain at least one number')
  ],
  authController.resetPassword
);

/**
 * @route POST /admin/api/auth/change-password
 * @desc Change password for logged-in user
 * @access Private
 */
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/\d/)
      .withMessage('Password must contain at least one number')
  ],
  authController.changePassword
);

module.exports = router;
