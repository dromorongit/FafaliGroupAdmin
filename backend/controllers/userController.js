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
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
};

module.exports = userController;