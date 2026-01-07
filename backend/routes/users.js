const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Super Admin only)
router.get('/', auth(['super_admin']), userController.getAllUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth(), userController.getUserById);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', auth(), userController.updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Super Admin only)
router.delete('/:id', auth(['super_admin']), userController.deleteUser);

module.exports = router;