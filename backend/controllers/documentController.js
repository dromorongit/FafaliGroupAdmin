const Document = require('../models/Document');
const Application = require('../models/Application');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Helper function to update application status based on document statuses
async function updateApplicationStatusBasedOnDocuments(applicationId) {
  try {
    const application = await Application.findById(applicationId);
    if (!application) {
      console.log(`Application ${applicationId} not found for status update`);
      return;
    }
    
    console.log(`Updating application status for application ${applicationId}, current status: ${application.status}`);
    
    // Get all documents for this application
    const documents = await Document.find({ applicationId });
    
    console.log(`Found ${documents.length} documents for application ${applicationId}`);
    
    if (documents.length === 0) {
      // No documents uploaded yet
      if (application.status === 'Draft') {
        // Keep as Draft if no documents
        console.log(`No documents found, keeping application as Draft`);
        return;
      }
      // For other statuses, we might want to keep them as is
      console.log(`No documents found, keeping application status as ${application.status}`);
      return;
    }
    
    // Check document statuses
    const hasRejected = documents.some(doc => doc.status === 'Rejected' || doc.status === 'Re-upload Required');
    const hasUploaded = documents.some(doc => doc.status === 'Uploaded');
    const allVerified = documents.every(doc => doc.status === 'Verified');
    
    console.log(`Document status analysis - hasRejected: ${hasRejected}, hasUploaded: ${hasUploaded}, allVerified: ${allVerified}`);
    
    // Determine application status based on document statuses
    if (hasRejected) {
      // If any document is rejected, set application to Queried
      if (application.status !== 'Queried') {
        console.log(`Setting application status to Queried (was ${application.status})`);
        application.status = 'Queried';
        application.updatedAt = Date.now();
        await application.save();
      }
    } else if (hasUploaded && !allVerified) {
      // If some documents are uploaded but not all verified, set to Under Review
      if (application.status !== 'Under Review' && application.status !== 'Submitted') {
        console.log(`Setting application status to Under Review (was ${application.status})`);
        application.status = 'Under Review';
        application.updatedAt = Date.now();
        await application.save();
      }
    } else if (allVerified) {
      // If all documents are verified, set to Approved (unless it's already approved/rejected)
      if (application.status !== 'Approved' && application.status !== 'Rejected') {
        console.log(`Setting application status to Approved (was ${application.status})`);
        application.status = 'Approved';
        application.updatedAt = Date.now();
        await application.save();
      }
    }
    
  } catch (err) {
    console.error('Error updating application status based on documents:', err);
  }
}

const documentController = {
  upload,
  
  // Upload document
  uploadDocument: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const { applicationId, documentType } = req.body;
      
      // Check if application exists
      const application = await Application.findById(applicationId);
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      // Check if user has access to this application
      if (req.user.role === 'visa_officer' && application.assignedTo?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Check if application is locked (can't upload to locked applications)
      if (application.locked) {
        return res.status(400).json({ message: 'Cannot upload documents to locked application' });
      }
      
      const document = new Document({
        applicationId,
        documentType,
        filePath: req.file.path,
        originalFileName: req.file.originalname,
        uploadedBy: req.user.id
      });
      
      await document.save();
      
      // Update application status based on document statuses
      await updateApplicationStatusBasedOnDocuments(applicationId);
      
      console.log(`Document uploaded for application ${applicationId}, document status: ${document.status}`);
      res.status(201).json(document);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Get all documents for an application
  getDocumentsByApplication: async (req, res) => {
    try {
      const { applicationId } = req.params;
      
      // Check if application exists
      const application = await Application.findById(applicationId);
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      // Check if user has access to this application
      if (req.user.role === 'visa_officer' && application.assignedTo?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const documents = await Document.find({ applicationId })
        .populate('uploadedBy', 'firstName lastName email')
        .populate('verifiedBy', 'firstName lastName email');
      
      res.json(documents);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Get document by ID
  getDocumentById: async (req, res) => {
    try {
      const document = await Document.findById(req.params.id)
        .populate('uploadedBy', 'firstName lastName email')
        .populate('verifiedBy', 'firstName lastName email');
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Check if user has access to this document's application
      const application = await Application.findById(document.applicationId);
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      if (req.user.role === 'visa_officer' && application.assignedTo?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(document);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Update document status
  updateDocumentStatus: async (req, res) => {
    try {
      const { status, rejectionReason } = req.body;
      
      const document = await Document.findById(req.params.id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Check if user has access to this document's application
      const application = await Application.findById(document.applicationId);
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      if (req.user.role === 'visa_officer' && application.assignedTo?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      document.status = status;
      document.rejectionReason = rejectionReason || '';
      
      if (status === 'Verified') {
        document.verifiedBy = req.user.id;
      }
      
      document.updatedAt = Date.now();
      
      await document.save();
      
      // Update application status based on document statuses
      await updateApplicationStatusBasedOnDocuments(application._id);
      
      console.log(`Document status updated to ${status} for application ${application._id}`);
      res.json(document);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Download document
  downloadDocument: async (req, res) => {
    try {
      const document = await Document.findById(req.params.id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Check if user has access to this document's application
      const application = await Application.findById(document.applicationId);
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      if (req.user.role === 'visa_officer' && application.assignedTo?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Check if file exists
      if (!fs.existsSync(document.filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      res.download(document.filePath, document.originalFileName);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
};

module.exports = documentController;