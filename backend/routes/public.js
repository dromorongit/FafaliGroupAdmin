const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const multer = require('multer');
const path = require('path');

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/applicant-documents/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Public API endpoints for website integration
// These endpoints are accessible without authentication

/**
 * @route POST /api/public/applications
 * @desc Create a new visa application from the public website
 * @access Public
 */
router.post('/applications', publicController.createPublicApplication);

/**
 * @route GET /api/public/applications/status
 * @desc Check application status (for applicants)
 * @access Public
 */
router.get('/applications/status', publicController.checkApplicationStatus);

/**
 * @route POST /api/public/documents/upload
 * @desc Upload document for an application (for applicants)
 * @access Public
 */
router.post('/documents/upload', upload.single('document'), publicController.uploadApplicantDocument);

/**
 * @route POST /api/public/documents/url-submit
 * @desc Submit document URL (for external systems like Cloudinary)
 * @access Public
 */
router.post('/documents/url-submit', publicController.submitDocumentUrl);

/**
 * @route POST /api/upload/visa-document
 * @desc Legacy endpoint for visa document upload (compatibility with external systems)
 * @access Public
 * @deprecated Use /api/public/documents/upload instead
 */
router.post('/upload/visa-document', upload.single('document'), publicController.uploadApplicantDocument);

/**
 * @route GET /api/public/bookings/status
 * @desc Check booking status (for customers)
 * @access Public
 */
router.get('/bookings/status', publicController.checkBookingStatus);

/**
 * @route POST /api/public/bookings
 * @desc Create a new tour booking from the public website
 * @access Public
 */
router.post('/bookings', publicController.createPublicBooking);

module.exports = router;