/**
 * Document Controller
 * Handles document upload, download, and management
 */

const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const multer = require('multer');
const Document = require('./Document');
const Application = require('../applications/Application');
const ApplicationTimeline = require('../applications/ApplicationTimeline');
const auditService = require('../../services/auditService');

// Ensure uploads directory exists
const ensureUploadsDir = async (applicationId) => {
  const uploadPath = path.join(__dirname, '../../uploads', applicationId.toString());
  try {
    await fsPromises.mkdir(uploadPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  return uploadPath;
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const applicationId = req.params.applicationId || req.body.applicationId;
      if (!applicationId) {
        return cb(new Error('Application ID is required'));
      }

      // Verify application exists
      const application = await Application.findById(applicationId);
      if (!application) {
        return cb(new Error('Application not found'));
      }

      const uploadPath = await ensureUploadsDir(applicationId);
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Create unique filename: timestamp + original name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

// File filter - only allow PDFs, images
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, GIF, and WebP are allowed.'), false);
  }
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per request
  }
});

/**
 * Upload documents for an application
 */
const uploadDocuments = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const { documentType } = req.body;
    const applicationId = req.params.applicationId;

    if (!documentType) {
      return res.status(400).json({
        success: false,
        error: 'Document type is required'
      });
    }

    // Verify application exists
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    const uploadedDocuments = [];

    for (const file of req.files) {
      const document = new Document({
        applicationId,
        documentType,
        filePath: file.path,
        fileName: path.basename(file.path),
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedBy: req.user._id,
        status: 'Pending'
      });

      await document.save();
      uploadedDocuments.push(document);
    }

    // Log timeline
    await ApplicationTimeline.create({
      applicationId,
      action: 'Document Uploaded',
      performedBy: req.user._id,
      comment: `${uploadedDocuments.length} document(s) uploaded: ${documentType}`
    });

    // Audit log
    await auditService.logEvent({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DOCUMENTS_UPLOADED',
      req,
      metadata: {
        applicationId,
        documentCount: uploadedDocuments.length,
        documentType,
        fileNames: uploadedDocuments.map(d => d.originalName)
      }
    });

    return res.status(201).json({
      success: true,
      data: uploadedDocuments,
      message: `${uploadedDocuments.length} document(s) uploaded successfully`
    });
  } catch (error) {
    console.error('Upload documents error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload documents'
    });
  }
};

/**
 * Get documents for an application
 */
const getDocuments = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const documents = await Document.find({ applicationId })
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name email')
      .populate('verifiedBy', 'name email');

    return res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Get documents error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch documents'
    });
  }
};

/**
 * Download a document
 */
const downloadDocument = async (req, res) => {
  try {
    const { docId } = req.params;

    const document = await Document.findById(docId)
      .populate('uploadedBy', 'name');

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Check if file exists
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on server'
      });
    }

    // Audit log
    await auditService.logEvent({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DOCUMENT_DOWNLOADED',
      req,
      metadata: {
        documentId: document._id,
        applicationId: document.applicationId,
        fileName: document.originalName
      }
    });

    return res.download(document.filePath, document.originalName);
  } catch (error) {
    console.error('Download document error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to download document'
    });
  }
};

/**
 * Update document status (verify, reject, request re-upload)
 */
const updateDocumentStatus = async (req, res) => {
  try {
    const { docId } = req.params;
    const { status, rejectionReason } = req.body;

    const validStatuses = ['Verified', 'Rejected', 'Re-upload Required'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be Verified, Rejected, or Re-upload Required'
      });
    }

    const document = await Document.findById(docId);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Role-based restrictions
    const userRole = req.user.role;
    if (userRole === 'Read-only') {
      return res.status(403).json({
        success: false,
        error: 'Read-only users cannot update document status'
      });
    }

    document.status = status;
    document.verifiedBy = req.user._id;
    document.verifiedAt = new Date();

    if (status === 'Rejected') {
      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required'
        });
      }
      document.rejectionReason = rejectionReason;
    }

    await document.save();

    // Log timeline
    await ApplicationTimeline.create({
      applicationId: document.applicationId,
      action: 'Document Status Changed',
      performedBy: req.user._id,
      comment: `Document "${document.documentType}" marked as ${status}`
    });

    // Audit log
    await auditService.logEvent({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DOCUMENT_STATUS_CHANGED',
      req,
      metadata: {
        documentId: document._id,
        applicationId: document.applicationId,
        newStatus: status,
        rejectionReason: status === 'Rejected' ? rejectionReason : null
      }
    });

    return res.json({
      success: true,
      data: document,
      message: 'Document status updated successfully'
    });
  } catch (error) {
    console.error('Update document status error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update document status'
    });
  }
};

/**
 * Delete a document
 */
const deleteDocument = async (req, res) => {
  try {
    const { docId } = req.params;

    const document = await Document.findById(docId);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Only Super Admin can delete documents
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({
        success: false,
        error: 'Only Super Admin can delete documents'
      });
    }

    const filePath = document.filePath;
    const applicationId = document.applicationId;

    // Delete from database
    await Document.findByIdAndDelete(docId);

    // Delete file from filesystem
    try {
      if (fs.existsSync(filePath)) {
        await fsPromises.unlink(filePath);
      }
    } catch (fsError) {
      console.error('Failed to delete file:', fsError);
    }

    // Log timeline
    await ApplicationTimeline.create({
      applicationId,
      action: 'Document Deleted',
      performedBy: req.user._id,
      comment: `Document "${document.documentType}" deleted`
    });

    // Audit log
    await auditService.logEvent({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DOCUMENT_DELETED',
      req,
      metadata: {
        documentId: docId,
        applicationId,
        fileName: document.originalName
      }
    });

    return res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete document'
    });
  }
};

/**
 * Get all documents with expiry date approaching
 */
const getExpiringDocuments = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const documents = await Document.find({
      expiryDate: {
        $lte: futureDate,
        $gte: new Date()
      },
      status: 'Verified'
    })
      .populate('applicationId')
      .sort({ expiryDate: 1 });

    return res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Get expiring documents error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch expiring documents'
    });
  }
};

module.exports = {
  upload,
  uploadDocuments,
  getDocuments,
  downloadDocument,
  updateDocumentStatus,
  deleteDocument,
  getExpiringDocuments
};
