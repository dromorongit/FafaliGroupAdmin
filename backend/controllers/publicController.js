const Application = require('../models/Application');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const { sendEmailNotification } = require('../utils/email');

const publicController = {
  
  // Public endpoint for website visa applications
  createPublicApplication: async (req, res) => {
    try {
      const { 
        applicantName, 
        email, 
        phone, 
        passportNumber, 
        visaType, 
        travelPurpose, 
        travelDate, 
        returnDate, 
        additionalInfo 
      } = req.body;
      
      // Validate required fields
      if (!applicantName || !email || !visaType || !travelPurpose) {
        return res.status(400).json({ 
          message: 'Missing required fields: applicantName, email, visaType, travelPurpose are required'
        });
      }
      
      // Create new application with "Submitted" status
      const newApplication = new Application({
        applicantName,
        email,
        phone,
        passportNumber,
        visaType,
        travelPurpose,
        travelDate,
        returnDate,
        additionalInfo,
        status: 'Submitted',
        source: 'website', // Mark as coming from public website
        referenceNumber: `FAF-${Date.now().toString().slice(-6)}`
      });
      
      // Save the application
      const savedApplication = await newApplication.save();
      
      // Log the creation in audit trail
      await AuditLog.create({
        action: 'Application Created',
        entityType: 'Application',
        entityId: savedApplication._id,
        performedBy: 'Public Website',
        details: `New application created from website: ${applicantName} - ${visaType}`
      });
      
      // Send confirmation email to applicant
      try {
        await sendEmailNotification(
          email,
          'Visa Application Received',
          `Dear ${applicantName},\n\n` +
          `Thank you for applying for a visa with Fafali Group. Your application has been received.\n\n` +
          `Reference Number: ${savedApplication.referenceNumber}\n` +
          `Visa Type: ${visaType}\n` +
          `Status: Submitted\n\n` +
          `Our team will review your application and contact you if additional information is needed.\n\n` +
          `You can check your application status on our website using your reference number.\n\n` +
          `Best regards,\n` +
          `Fafali Group Visa Services`
        );
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError.message);
      }
      
      // Send notification to admin
      try {
        const adminEmail = process.env.ADMIN_EMAIL || 'visas@fafaligroup.org';
        await sendEmailNotification(
          adminEmail,
          `New Visa Application: ${savedApplication.referenceNumber}`,
          `A new visa application has been submitted:\n\n` +
          `Applicant: ${applicantName}\n` +
          `Email: ${email}\n` +
          `Visa Type: ${visaType}\n` +
          `Reference: ${savedApplication.referenceNumber}\n` +
          `Date: ${new Date().toLocaleString()}\n\n` +
          `Login to the admin system to process this application.`
        );
      } catch (adminEmailError) {
        console.error('Failed to send admin notification:', adminEmailError.message);
      }
      
      res.status(201).json({
        message: 'Application submitted successfully',
        application: {
          id: savedApplication._id,
          referenceNumber: savedApplication.referenceNumber,
          status: savedApplication.status,
          createdAt: savedApplication.createdAt
        }
      });
      
    } catch (err) {
      console.error('Error creating public application:', err);
      res.status(500).json({ message: 'Failed to submit application' });
    }
  },
  
  // Public endpoint to check application status
  checkApplicationStatus: async (req, res) => {
    try {
      const { referenceNumber, email } = req.query;
      
      if (!referenceNumber || !email) {
        return res.status(400).json({ 
          message: 'Reference number and email are required'
        });
      }
      
      // Find application by reference number and email
      const application = await Application.findOne({ 
        referenceNumber, 
        email 
      }).select('-documents -internalNotes');
      
      if (!application) {
        return res.status(404).json({ 
          message: 'Application not found. Please check your reference number and email.'
        });
      }
      
      res.json({
        success: true,
        application: {
          referenceNumber: application.referenceNumber,
          applicantName: application.applicantName,
          visaType: application.visaType,
          status: application.status,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
          // Include status-specific messages
          statusMessage: getStatusMessage(application.status)
        }
      });
      
    } catch (err) {
      res.status(500).json({ message: 'Failed to check application status' });
    }
  },
  
  // Public endpoint for document upload (for applicants)
  uploadApplicantDocument: async (req, res) => {
    try {
      const { referenceNumber, email, documentType } = req.body;
      
      if (!referenceNumber || !email || !documentType || !req.file) {
        return res.status(400).json({ 
          message: 'Reference number, email, document type, and file are required'
        });
      }
      
      // Find the application
      const application = await Application.findOne({ 
        referenceNumber, 
        email 
      });
      
      if (!application) {
        return res.status(404).json({ 
          message: 'Application not found'
        });
      }
      
      // Create document record
      const newDocument = new Document({
        applicationId: application._id,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileType: req.file.mimetype,
        documentType,
        uploadedBy: 'applicant',
        status: 'Uploaded'
      });
      
      await newDocument.save();
      
      // Update application documents array
      application.documents.push(newDocument._id);
      await application.save();
      
      // Log the upload
      await AuditLog.create({
        action: 'Document Uploaded',
        entityType: 'Document',
        entityId: newDocument._id,
        performedBy: `Applicant: ${application.applicantName}`,
        details: `Document uploaded: ${documentType} for application ${referenceNumber}`
      });
      
      res.json({
        message: 'Document uploaded successfully',
        document: {
          id: newDocument._id,
          fileName: newDocument.fileName,
          documentType: newDocument.documentType,
          status: newDocument.status
        }
      });
      
    } catch (err) {
      res.status(500).json({ message: 'Failed to upload document' });
    }
  }
};

// Helper function for status messages
function getStatusMessage(status) {
  const messages = {
    'Draft': 'Your application is being prepared. Please complete all required information.',
    'Submitted': 'Your application has been received and is awaiting review by our team.',
    'Under Review': 'Your application is currently being reviewed by our visa officers.',
    'Queried': 'Additional information is required. Please check your email for details.',
    'Approved': 'Congratulations! Your visa application has been approved.',
    'Rejected': 'Unfortunately, your visa application has been rejected. Please contact us for more information.'
  };
  
  return messages[status] || 'Your application is being processed.';
}

module.exports = publicController;