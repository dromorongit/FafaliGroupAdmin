/**
 * Audit Service
 * Centralized audit logging for admin actions
 */

const AuditLog = require('../models/AuditLog');

/**
 * Log an audit event
 */
const logEvent = async ({ userId, userEmail, action, req, metadata = {}, success = true, errorMessage = null }) => {
  try {
    const logEntry = {
      userId,
      userEmail,
      action,
      ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
      userAgent: req?.headers?.['user-agent'] || 'unknown',
      requestPath: req?.originalUrl || req?.path,
      requestMethod: req?.method,
      metadata,
      success,
      errorMessage
    };

    await AuditLog.log(logEntry);
    return true;
  } catch (error) {
    console.error('AuditService: Failed to log event:', error);
    return false;
  }
};

const logLogin = async (user, req) => {
  return logEvent({
    userId: user._id,
    userEmail: user.email,
    action: 'LOGIN_SUCCESS',
    req,
    success: true
  });
};

const logFailedLogin = async (email, req, reason = 'Invalid credentials') => {
  return logEvent({
    userEmail: email,
    action: 'LOGIN_FAILED',
    req,
    success: false,
    errorMessage: reason
  });
};

const logLogout = async (user, req) => {
  return logEvent({
    userId: user._id,
    userEmail: user.email,
    action: 'LOGOUT',
    req,
    success: true
  });
};

const logTokenRefresh = async (user, req) => {
  return logEvent({
    userId: user._id,
    userEmail: user.email,
    action: 'REFRESH_TOKEN',
    req,
    success: true
  });
};

/**
 * Get audit logs with pagination
 */
const getLogs = async (filters = {}, options = {}) => {
  const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  
  const query = {};
  if (filters.userId) query.userId = filters.userId;
  if (filters.action) query.action = filters.action;
  if (filters.startDate && filters.endDate) {
    query.createdAt = { $gte: filters.startDate, $lte: filters.endDate };
  }
  
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  
  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort(sort).skip(skip).limit(limit).populate('userId', 'name email role'),
    AuditLog.countDocuments(query)
  ]);
  
  return {
    logs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  };
};

module.exports = {
  logEvent,
  logLogin,
  logFailedLogin,
  logLogout,
  logTokenRefresh,
  getLogs
};
