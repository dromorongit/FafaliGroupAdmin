/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces role-based permissions on routes
 */

const AuditLog = require('../models/AuditLog');

// Role hierarchy for permission checks
const ROLE_HIERARCHY = {
  'Super Admin': 5,
  'Visa Officer': 4,
  'Finance Officer': 3,
  'Reviewer': 2,
  'Read-only': 1
};

// Role permissions matrix
const ROLE_PERMISSIONS = {
  'Super Admin': ['*'], // Full access
  'Visa Officer': [
    'visa:read',
    'visa:update',
    'visa:create',
    'applicants:read',
    'applicants:update',
    'dashboard:read'
  ],
  'Finance Officer': [
    'payments:read',
    'payments:update',
    'payments:create',
    'reports:read',
    'dashboard:read'
  ],
  'Reviewer': [
    'applications:read',
    'applications:review',
    'dashboard:read'
  ],
  'Read-only': [
    'dashboard:read',
    'logs:read'
  ]
};

/**
 * Check if user has required role
 * @param {Array} allowedRoles - Roles that are allowed access
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.user.role;

    // Super Admin has unrestricted access
    if (userRole === 'Super Admin') {
      return next();
    }

    // Check if user's role is in allowed roles
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      logForbiddenAccess(req, `Role ${userRole} not in allowed roles: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.',
        requiredRoles: allowedRoles,
        userRole: userRole
      });
    }

    next();
  };
};

/**
 * Check if user has required permission
 * @param {String} requiredPermission - Permission string required
 */
const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const permissions = ROLE_PERMISSIONS[userRole] || [];

    // Super Admin has all permissions
    if (permissions.includes('*')) {
      return next();
    }

    if (!permissions.includes(requiredPermission)) {
      logForbiddenAccess(req, `Missing permission: ${requiredPermission}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.',
        requiredPermission,
        userRole
      });
    }

    next();
  };
};

/**
 * Log forbidden access attempts
 */
const logForbiddenAccess = async (req, reason) => {
  try {
    await AuditLog.log({
      userId: req.user?._id,
      userEmail: req.user?.email,
      action: 'FORBIDDEN_ACCESS_ATTEMPT',
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      requestPath: req.originalUrl || req.path,
      requestMethod: req.method,
      statusCode: 403,
      success: false,
      errorMessage: reason
    });
  } catch (error) {
    console.error('Failed to log forbidden access:', error);
  }
};

/**
 * Get user's permissions
 */
const getUserPermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if role has permission
 */
const hasPermission = (role, permission) => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes('*') || permissions.includes(permission);
};

module.exports = {
  requireRole,
  requirePermission,
  getUserPermissions,
  hasPermission,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS
};
