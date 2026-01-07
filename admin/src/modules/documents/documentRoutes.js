/**
 * Document Routes
 * Routes for managing document uploads and downloads
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const documentController = require('./documentController');

const router = express.Router();

// Multer upload middleware
const upload = documentController.upload;

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /admin/api/applications/:applicationId/documents
 * @desc    Upload documents for an application
 * @access  Super Admin, Visa Officer
 */
router.post('/applications/:applicationId/documents',
  requireRole('Super Admin', 'Visa Officer'),
  upload.array('documents', 10),
  [
    body('documentType').notEmpty().withMessage('Document type is required')
  ],
  documentController.uploadDocuments
);

/**
 * @route   GET /admin/api/applications/:applicationId/documents
 * @desc    Get all documents for an application
 * @access  All authenticated users
 */
router.get('/applications/:applicationId/documents',
  documentController.getDocuments
);

/**
 * @route   GET /admin/api/documents/:docId/download
 * @desc    Download a document
 * @access  Super Admin, Visa Officer, Finance Officer, Reviewer
 */
router.get('/documents/:docId/download',
  requireRole('Super Admin', 'Visa Officer', 'Finance Officer', 'Reviewer'),
  documentController.downloadDocument
);

/**
 * @route   PATCH /admin/api/documents/:docId/status
 * @desc    Update document status (verify, reject, re-upload required)
 * @access  Super Admin, Visa Officer
 */
router.patch('/documents/:docId/status',
  requireRole('Super Admin', 'Visa Officer'),
  [
    body('status').notEmpty().withMessage('Status is required'),
    body('status').isIn(['Verified', 'Rejected', 'Re-upload Required']).withMessage('Invalid status'),
    body('rejectionReason').optional().isString().withMessage('Rejection reason must be a string')
  ],
  documentController.updateDocumentStatus
);

/**
 * @route   DELETE /admin/api/documents/:docId
 * @desc    Delete a document
 * @access  Super Admin only
 */
router.delete('/documents/:docId',
  requireRole('Super Admin'),
  documentController.deleteDocument
);

/**
 * @route   GET /admin/api/documents/expiring
 * @desc    Get documents with approaching expiry dates
 * @access  Super Admin, Visa Officer
 */
router.get('/documents/expiring',
  requireRole('Super Admin', 'Visa Officer'),
  [
    query('days').optional().isInt({ min: 1 }).withMessage('Days must be a positive integer')
  ],
  documentController.getExpiringDocuments
);

module.exports = router;
