const AuditLog = require('../models/AuditLog');

const logAction = async (action, entityType, entityId, performedBy, oldValue, newValue, req) => {
  try {
    const auditLog = new AuditLog({
      action,
      entityType,
      entityId,
      performedBy,
      oldValue,
      newValue,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent']
    });
    
    await auditLog.save();
  } catch (err) {
    console.error('Failed to log audit action:', err);
  }
};

module.exports = {
  logAction
};