/**
 * Admin Routes
 * Routes for admin profile, dashboard, and admin management
 */

const express = require('express');
const { body, query } = require('express-validator');
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { apiRateLimiter, adminRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /admin/api/profile
 * @desc Get current admin profile
 * @access Private
 */
router.get('/profile', adminController.getProfile);

/**
 * @route GET /admin/api/dashboard
 * @desc Get admin dashboard data
 * @access Private
 */
router.get('/dashboard', adminController.getDashboard);

/**
 * @route GET /admin/api/audit-logs
 * @desc Get audit logs (Super Admin only)
 * @access Private (Super Admin)
 */
router.get(
  '/audit-logs',
  adminRateLimiter,
  requireRole('Super Admin'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('action').optional().isString(),
    query('userId').optional().isMongoId(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  adminController.getAuditLogs
);

/**
 * @route GET /admin/api/admin-users
 * @desc Get all admin users (Super Admin only)
 * @access Private (Super Admin)
 */
router.get(
  '/admin-users',
  adminRateLimiter,
  requireRole('Super Admin'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isIn(['Super Admin', 'Visa Officer', 'Finance Officer', 'Reviewer', 'Read-only']),
    query('isActive').optional().isBoolean()
  ],
  adminController.getAdminUsers
);

/**
 * @route POST /admin/api/admin-users
 * @desc Create new admin user (Super Admin only)
 * @access Private (Super Admin)
 */
router.post(
  '/admin-users',
  adminRateLimiter,
  requireRole('Super Admin'),
  [
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/\d/),
    body('role').optional().isIn(['Super Admin', 'Visa Officer', 'Finance Officer', 'Reviewer', 'Read-only'])
  ],
  adminController.createAdminUser
);

/**
 * @route PATCH /admin/api/admin-users/:id
 * @desc Update admin user (Super Admin only)
 * @access Private (Super Admin)
 */
router.patch(
  '/admin-users/:id',
  adminRateLimiter,
  requireRole('Super Admin'),
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('role').optional().isIn(['Super Admin', 'Visa Officer', 'Finance Officer', 'Reviewer', 'Read-only']),
    body('isActive').optional().isBoolean()
  ],
  adminController.updateAdminUser
);

/**
 * @route DELETE /admin/api/admin-users/:id
 * @desc Delete admin user (Super Admin only)
 * @access Private (Super Admin)
 */
router.delete(
  '/admin-users/:id',
  adminRateLimiter,
  requireRole('Super Admin'),
  adminController.deleteAdminUser
);

module.exports = router;
