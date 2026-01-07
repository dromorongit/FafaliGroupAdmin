const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const auth = require('../middleware/auth');

// @route   POST /api/documents/upload
// @desc    Upload document
// @access  Private
router.post('/upload', 
  auth(), 
  documentController.upload.single('file'), 
  documentController.uploadDocument
);

// @route   GET /api/documents/application/:applicationId
// @desc    Get all documents for an application
// @access  Private
router.get('/application/:applicationId', auth(), documentController.getDocumentsByApplication);

// @route   GET /api/documents/:id
// @desc    Get document by ID
// @access  Private
router.get('/:id', auth(), documentController.getDocumentById);

// @route   PUT /api/documents/:id/status
// @desc    Update document status
// @access  Private
router.put('/:id/status', auth(), documentController.updateDocumentStatus);

// @route   GET /api/documents/:id/download
// @desc    Download document
// @access  Private
router.get('/:id/download', auth(), documentController.downloadDocument);

module.exports = router;