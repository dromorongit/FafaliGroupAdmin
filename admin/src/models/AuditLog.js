/**
 * AuditLog Model
 * Tracks administrative actions for security and compliance
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
    required: false,
    index: true
  },
  userEmail: {
    type: String,
    required: false
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'REFRESH_TOKEN',
      'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_COMPLETE',
      'UNAUTHORIZED_ACCESS_ATTEMPT', 'FORBIDDEN_ACCESS_ATTEMPT',
      'PROFILE_UPDATE', 'ADMIN_CREATED', 'ADMIN_UPDATED',
      'ADMIN_DELETED', 'ADMIN_ACTIVATED', 'ADMIN_DEACTIVATED'
    ],
    index: true
  },
  ipAddress: {
    type: String,
    required: [true, 'IP address is required'],
    trim: true
  },
  userAgent: {
    type: String,
    required: [true, 'User agent is required'],
    trim: true
  },
  requestPath: {
    type: String,
    trim: true
  },
  requestMethod: {
    type: String,
    uppercase: true
  },
  statusCode: {
    type: Number
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  collection: 'audit_logs'
});

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });

// Static method to log an event
auditLogSchema.statics.log = async function(logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to save audit log:', error);
    return null;
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
