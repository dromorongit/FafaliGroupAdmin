const User = require('../models/User');
const jwt = require('../utils/jwt');

const authController = {
  // Register a new user (only accessible to super admins)
  register: async (req, res) => {
    try {
      const { firstName, lastName, email, password, role } = req.body;
      
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Create new user
      const user = new User({
        firstName,
        lastName,
        email,
        password,
        role: role || 'visa_officer'
      });
      
      await user.save();
      
      // Generate token
      const token = jwt.generateToken(user._id, user.role);
      
      res.status(201).json({
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Register first user (no auth required)
  registerFirstUser: async (req, res) => {
    try {
      const { firstName, lastName, email, password, role } = req.body;
      
      // Check if any users already exist
      const userCount = await User.countDocuments();
      if (userCount > 0) {
        return res.status(403).json({ message: 'First user already exists. Use regular registration.' });
      }
      
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Create new user as super admin
      const user = new User({
        firstName,
        lastName,
        email,
        password,
        role: 'super_admin' // First user must be super admin
      });
      
      await user.save();
      
      // Generate token
      const token = jwt.generateToken(user._id, user.role);
      
      res.status(201).json({
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Login user
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }
      
      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      // Generate token
      const token = jwt.generateToken(user._id, user.role);
      
      res.json({
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Get current user
  getCurrentUser: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
};

module.exports = authController;