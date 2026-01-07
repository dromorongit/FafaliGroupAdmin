/**
 * JWT Authentication Middleware
 * Verifies access tokens and protects routes
 */

const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');
const AuditLog = require('../models/AuditLog');

/**
 * Authenticate JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await logUnauthorizedAccess(req, 'No token provided');
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await AdminUser.findById(decoded.userId).select('-passwordHash -refreshTokens');

    if (!user) {
      await logUnauthorizedAccess(req, 'User not found', decoded.userId);
      return res.status(401).json({
        success: false,
        error: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      await logUnauthorizedAccess(req, 'User account deactivated', user._id);
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact an administrator.'
      });
    }

    // Attach user to request
    req.user = user;
    req.tokenData = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      await logUnauthorizedAccess(req, 'Invalid token');
      return res.status(401).json({
        success: false,
        error: 'Invalid token.'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed.'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await AdminUser.findById(decoded.userId).select('-passwordHash -refreshTokens');

    if (user && user.isActive) {
      req.user = user;
      req.tokenData = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Log unauthorized access attempts
 */
const logUnauthorizedAccess = async (req, reason, userId = null) => {
  try {
    await AuditLog.log({
      userId,
      userEmail: userId ? null : req.body?.email,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      requestPath: req.originalUrl || req.path,
      requestMethod: req.method,
      statusCode: 401,
      success: false,
      errorMessage: reason
    });
  } catch (error) {
    console.error('Failed to log unauthorized access:', error);
  }
};

module.exports = {
  authenticate,
  optionalAuth
};
