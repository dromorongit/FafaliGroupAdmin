const User = require('../models/User');

const userController = {
  // Get all users (Super Admin only)
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find().select('-password');
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Get user by ID
  getUserById: async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Update user
  updateUser: async (req, res) => {
    try {
      const { firstName, lastName, role, isActive } = req.body;
      
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Only super admins can change roles
      if (req.user.role !== 'super_admin' && role && role !== user.role) {
        return res.status(403).json({ message: 'Only super admins can change user roles' });
      }
      
      // Prevent changing super admin role
      if (user.role === 'super_admin' && role && role !== 'super_admin') {
        return res.status(403).json({ message: 'Cannot change Super Admin role' });
      }
      
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      user.role = role || user.role;
      user.isActive = isActive || user.isActive;
      
      await user.save();
      
      res.json(await User.findById(user._id).select('-password'));
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Delete user
  deleteUser: async (req, res) => {
    try {
      // Check if user exists
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Prevent users from deleting themselves
      if (req.params.id === req.user.id) {
        return res.status(403).json({ 
          message: 'You cannot delete your own account'
        });
      }
      
      // Only super admins can delete other users
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({ 
          message: 'Only Super Admins can delete users'
        });
      }
      
      // WARNING: Allow Super Admin deletion but with important safeguards
      // Check if this is the last Super Admin account
      const superAdminCount = await User.countDocuments({ role: 'super_admin' });
      
      if (user.role === 'super_admin' && superAdminCount <= 1) {
        return res.status(403).json({ 
          message: 'CRITICAL: Cannot delete the last Super Admin account. Create another Super Admin first.'
        });
      }
      
      // Delete the user
      await User.findByIdAndDelete(req.params.id);
      
      res.json({ 
        message: 'User deleted successfully',
        warning: user.role === 'super_admin' ? 'Super Admin account deleted. Ensure you have other Super Admin accounts.' : null
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
};

module.exports = userController;