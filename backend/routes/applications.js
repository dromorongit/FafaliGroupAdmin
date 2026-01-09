const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const auth = require('../middleware/auth');

// @route   POST /api/applications
// @desc    Create new application
// @access  Private
router.post('/', auth(), applicationController.createApplication);

// @route   GET /api/applications
// @desc    Get all applications
// @access  Private
router.get('/', auth(), applicationController.getAllApplications);

// @route   GET /api/applications/stats
// @desc    Get application statistics for dashboard
// @access  Private
router.get('/stats', auth(), applicationController.getApplicationStats);

// @route   GET /api/applications/:id
// @desc    Get application by ID
// @access  Private
router.get('/:id', auth(), applicationController.getApplicationById);

// @route   PUT /api/applications/:id
// @desc    Update application
// @access  Private
router.put('/:id', auth(), applicationController.updateApplication);

// @route   POST /api/applications/:id/submit
// @desc    Submit application (lock it)
// @access  Private
router.post('/:id/submit', auth(), applicationController.submitApplication);

// @route   POST /api/applications/:id/comments
// @desc    Add comment to application
// @access  Private
router.post('/:id/comments', auth(), applicationController.addComment);

// @route   POST /api/applications/:id/notes
// @desc    Add internal note to application
// @access  Private
router.post('/:id/notes', auth(), applicationController.addInternalNote);

// @route   DELETE /api/applications/:id
// @desc    Delete single application
// @access  Private (Admin or Owner)
router.delete('/:id', auth(), applicationController.deleteApplication);

// @route   DELETE /api/applications/bulk-delete
// @desc    Bulk delete applications
// @access  Private (Admin or Owner)
router.delete('/bulk/delete', auth(), applicationController.bulkDeleteApplications);

module.exports = router;