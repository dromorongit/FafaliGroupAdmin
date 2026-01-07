/**
 * Application Routes
 * Routes for managing visa, travel, and event applications
 */

const express = require('express');
const { body, query } = require('express-validator');
const { authenticate } = require('../../middleware/auth');
const { requireRole, requirePermission } = require('../../middleware/rbac');
const applicationController = require('./applicationController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /admin/api/applications
 * @desc    Create a new application
 * @access  Super Admin, Visa Officer, Finance Officer
 */
router.post('/',
  requireRole('Super Admin', 'Visa Officer', 'Finance Officer'),
  [
    body('applicationType').notEmpty().withMessage('Application type is required'),
    body('applicantProfile').isObject().withMessage('Applicant profile must be an object'),
    body('applicantProfile.firstName').notEmpty().withMessage('First name is required'),
    body('applicantProfile.lastName').notEmpty().withMessage('Last name is required'),
    body('applicantProfile.email').isEmail().withMessage('Valid email is required')
  ],
  applicationController.createApplication
);

/**
 * @route   GET /admin/api/applications
 * @desc    Get all applications with filtering and pagination
 * @access  All authenticated users
 */
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  applicationController.getApplications
);

/**
 * @route   GET /admin/api/applications/stats
 * @desc    Get application statistics
 * @access  Super Admin, Visa Officer, Finance Officer
 */
router.get('/stats',
  requireRole('Super Admin', 'Visa Officer', 'Finance Officer'),
  applicationController.getApplicationStats
);

/**
 * @route   GET /admin/api/applications/:id
 * @desc    Get single application with timeline and documents
 * @access  All authenticated users
 */
router.get('/:id',
  applicationController.getApplicationById
);

/**
 * @route   PATCH /admin/api/applications/:id/status
 * @desc    Update application status
 * @access  Super Admin, Visa Officer (cannot approve/reject), Reviewer (cannot approve/reject)
 */
router.patch('/:id/status',
  requireRole('Super Admin', 'Visa Officer', 'Reviewer'),
  [
    body('status').notEmpty().withMessage('Status is required'),
    body('comment').optional().isString().withMessage('Comment must be a string')
  ],
  applicationController.updateApplicationStatus
);

/**
 * @route   PATCH /admin/api/applications/:id/assign
 * @desc    Assign application to an officer
 * @access  Super Admin
 */
router.patch('/:id/assign',
  requireRole('Super Admin'),
  [
    body('officerId').notEmpty().withMessage('Officer ID is required')
  ],
  applicationController.assignOfficer
);

/**
 * @route   POST /admin/api/applications/:id/notes
 * @desc    Add internal note to application
 * @access  Super Admin, Visa Officer, Reviewer
 */
router.post('/:id/notes',
  requireRole('Super Admin', 'Visa Officer', 'Reviewer'),
  [
    body('note').notEmpty().withMessage('Note content is required'),
    body('note').isLength({ max: 2000 }).withMessage('Note cannot exceed 2000 characters')
  ],
  applicationController.addNote
);

module.exports = router;
