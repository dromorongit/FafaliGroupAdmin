/**
 * Admin Controller
 * Handles admin profile, dashboard, and audit logs
 */

const AdminUser = require('../models/AdminUser');
const auditService = require('../services/auditService');

/**
 * @route GET /admin/api/profile
 * @desc Get current admin profile
 * @access Private
 */
const getProfile = async (req, res) => {
  try {
    const user = await AdminUser.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred fetching profile.'
    });
  }
};

/**
 * @route GET /admin/api/dashboard
 * @desc Get admin dashboard data
 * @access Private
 */
const getDashboard = async (req, res) => {
  try {
    const user = req.user;

    const dashboardData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      metrics: {
        totalAdmins: await AdminUser.countDocuments({ isActive: true }),
        activeToday: await AdminUser.countDocuments({
          isActive: true,
          lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
      },
      apiVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred fetching dashboard data.'
    });
  }
};

/**
 * @route GET /admin/api/audit-logs
 * @desc Get audit logs (Super Admin only)
 * @access Private (Super Admin)
 */
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId, startDate, endDate } = req.query;

    const filters = {};
    if (action) filters.action = action;
    if (userId) filters.userId = userId;
    if (startDate || endDate) {
      filters.startDate = startDate ? new Date(startDate) : new Date(0);
      filters.endDate = endDate ? new Date(endDate) : new Date();
    }

    const result = await auditService.getLogs(filters, { page: parseInt(page), limit: parseInt(limit) });

    res.json({
      success: true,
      data: {
        logs: result.logs,
        pagination: result.pagination
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred fetching audit logs.'
    });
  }
};

/**
 * @route GET /admin/api/admin-users
 * @desc Get all admin users (Super Admin only)
 * @access Private (Super Admin)
 */
const getAdminUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, isActive } = req.query;

    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      AdminUser.find(query).select('-passwordHash -refreshTokens').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      AdminUser.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
      }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ success: false, error: 'An error occurred fetching admin users.' });
  }
};

/**
 * @route POST /admin/api/admin-users
 * @desc Create new admin user (Super Admin only)
 * @access Private (Super Admin)
 */
const createAdminUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const existingUser = await AdminUser.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'An admin with this email already exists.' });
    }

    const admin = new AdminUser({
      name,
      email,
      passwordHash: password,
      role: role || 'Read-only'
    });

    await admin.save();

    await auditService.logEvent({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'ADMIN_CREATED',
      req,
      metadata: { createdAdminId: admin._id, role: admin.role }
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully.',
      data: { user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role, isActive: admin.isActive } }
    });
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({ success: false, error: 'An error occurred creating admin user.' });
  }
};

/**
 * @route PATCH /admin/api/admin-users/:id
 * @desc Update admin user (Super Admin only)
 * @access Private (Super Admin)
 */
const updateAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, isActive } = req.body;

    const admin = await AdminUser.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin user not found.' });
    }

    if (id === req.user._id.toString() && isActive === false) {
      return res.status(400).json({ success: false, error: 'You cannot deactivate your own account.' });
    }

    if (name) admin.name = name;
    if (role) admin.role = role;
    if (isActive !== undefined) admin.isActive = isActive;

    await admin.save();

    await auditService.logEvent({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'ADMIN_UPDATED',
      req,
      metadata: { updatedAdminId: id, changes: { name, role, isActive } }
    });

    res.json({
      success: true,
      message: 'Admin user updated successfully.',
      data: { user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role, isActive: admin.isActive } }
    });
  } catch (error) {
    console.error('Update admin user error:', error);
    res.status(500).json({ success: false, error: 'An error occurred updating admin user.' });
  }
};

/**
 * @route DELETE /admin/api/admin-users/:id
 * @desc Delete admin user (Super Admin only)
 * @access Private (Super Admin)
 */
const deleteAdminUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own account.' });
    }

    const admin = await AdminUser.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin user not found.' });
    }

    await AdminUser.findByIdAndDelete(id);

    await auditService.logEvent({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'ADMIN_DELETED',
      req,
      metadata: { deletedAdminId: id, deletedEmail: admin.email }
    });

    res.json({ success: true, message: 'Admin user deleted successfully.' });
  } catch (error) {
    console.error('Delete admin user error:', error);
    res.status(500).json({ success: false, error: 'An error occurred deleting admin user.' });
  }
};

module.exports = {
  getProfile,
  getDashboard,
  getAuditLogs,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser
};
