/**
 * Authentication Controller
 * Handles admin login, logout, and token management
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const AdminUser = require('../models/AdminUser');
const auditService = require('../services/auditService');

/**
 * Generate JWT tokens
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * @route POST /admin/api/auth/login
 * @desc Admin login
 * @access Public (rate limited)
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      await auditService.logFailedLogin(email, req, 'Missing credentials');
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    // Find user with password
    const user = await AdminUser.findByEmail(email).select('+passwordHash');

    if (!user) {
      await auditService.logFailedLogin(email, req, 'User not found');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      await auditService.logFailedLogin(email, req, 'Account deactivated');
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact an administrator.'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await auditService.logFailedLogin(email, req, 'Invalid password');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Calculate refresh token expiry
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    // Store refresh token
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: refreshTokenExpiry
    });

    // Remove expired tokens (keep only last 5)
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log successful login
    await auditService.logLogin(user, req);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    await auditService.logFailedLogin(req.body?.email, req, error.message);
    res.status(500).json({
      success: false,
      error: 'An error occurred during login.'
    });
  }
};

/**
 * @route POST /admin/api/auth/logout
 * @desc Admin logout
 * @access Private
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Remove refresh token from user
    if (refreshToken && req.user) {
      req.user.refreshTokens = req.user.refreshTokens.filter(
        rt => rt.token !== refreshToken
      );
      await req.user.save();
    }

    // Log logout
    if (req.user) {
      await auditService.logLogout(req.user, req);
    }

    res.json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during logout.'
    });
  }
};

/**
 * @route POST /admin/api/auth/refresh
 * @desc Refresh access token
 * @access Public (with refresh token)
 */
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required.'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type.'
      });
    }

    // Find user and check if refresh token exists
    const user = await AdminUser.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive.'
      });
    }

    const tokenExists = user.refreshTokens.some(
      rt => rt.token === refreshToken && new Date(rt.expiresAt) > new Date()
    );

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token expired or invalid.'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);

    // Replace old refresh token with new one
    user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
    
    const newRefreshExpiry = new Date();
    newRefreshExpiry.setDate(newRefreshExpiry.getDate() + 7);
    
    user.refreshTokens.push({
      token: tokens.refreshToken,
      expiresAt: newRefreshExpiry
    });

    await user.save();

    // Log token refresh
    await auditService.logTokenRefresh(user, req);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token.'
      });
    }
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while refreshing token.'
    });
  }
};

/**
 * @route POST /admin/api/auth/forgot-password
 * @desc Request password reset (stub)
 * @access Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required.'
      });
    }

    // Check if user exists
    const user = await AdminUser.findByEmail(email);

    if (user) {
      // In production, send email with reset link
      // For now, just log the attempt
      console.log(`Password reset requested for: ${email}`);
    }

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link will be sent.',
      // Include a stub for frontend development
      stub: {
        resetToken: 'stub-reset-token-' + Date.now(),
        expiresIn: '1h'
      }
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred processing your request.'
    });
  }
};

/**
 * @route POST /admin/api/auth/reset-password
 * @desc Reset password with token (stub)
 * @access Public
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters.'
      });
    }

    // In production, verify token and update password
    // For now, just return success
    res.json({
      success: true,
      message: 'Password has been reset successfully.',
      stub: true
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred resetting password.'
    });
  }
};

/**
 * @route POST /admin/api/auth/change-password
 * @desc Change password for logged-in user
 * @access Private
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters.'
      });
    }

    // Get user with password
    const user = await AdminUser.findById(req.user._id).select('+passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      await auditService.logEvent(req.user._id, 'password_change_failed', 'Invalid current password', req);
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect.'
      });
    }

    // Hash new password
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    user.passwordHash = await bcrypt.hash(newPassword, rounds);

    // Invalidate all refresh tokens for security
    user.refreshTokens = [];

    await user.save();

    // Log password change
    await auditService.logEvent(req.user._id, 'password_changed', 'Password updated successfully', req);

    // Generate new tokens
    const tokens = generateTokens(user._id);

    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    user.refreshTokens.push({
      token: tokens.refreshToken,
      expiresAt: refreshTokenExpiry
    });

    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again.',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred changing password.'
    });
  }
};

module.exports = {
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  changePassword,
  generateTokens
};
