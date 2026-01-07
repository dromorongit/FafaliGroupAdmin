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