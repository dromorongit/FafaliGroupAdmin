const Application = require('../models/Application');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const { sendEmail, sendApplicationNotification } = require('../utils/email');

const publicController = {
  
  // Public endpoint for website visa applications
  createPublicApplication: async (req, res) => {
    try {
      // Log raw body for debugging
      console.log('Raw request body:', req.body);
      
      // Handle case where body might be stringified incorrectly
      let bodyData = req.body;
      
      // If body is a string (malformed JSON), try to parse it
      if (typeof bodyData === 'string') {
        console.log('Body is string, attempting to parse...');
        try {
          // Try to fix common JSON errors: single quotes to double quotes
          let fixedJson = bodyData.replace(/'/g, '"');
          bodyData = JSON.parse(fixedJson);
          console.log('Successfully parsed fixed JSON');
        } catch (parseErr) {
          // If that fails, try a more aggressive fix
          try {
            // Add quotes around keys if missing
            const keyRegex = /([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
            let fixedJson2 = bodyData.replace(keyRegex, '$1"$2":');
            bodyData = JSON.parse(fixedJson2);
            console.log('Successfully parsed aggressively fixed JSON');
          } catch (finalErr) {
            return res.status(400).json({
              message: 'Invalid JSON format. Please ensure your request uses valid JSON with double quotes around all keys and string values.',
              example: '{"applicantName":"John Doe","email":"john@example.com","visaType":"Tourist Visa","travelPurpose":"Tourism"}',
              received: bodyData.substring(0, 100)
            });
          }
        }
      }
      
      const { 
        applicantName, 
        email, 
        phone, 
        passportNumber, 
        visaType, 
        travelPurpose, 
        travelDate, 
        returnDate, 
        additionalInfo,
        destination,
        duration,
        userId,
        paymentStatus,
        status: incomingStatus
      } = bodyData;
      
      // Map email to applicantEmail (support both field names)
      const applicantEmail = email;
      const applicantPhone = phone || '';
      
      // Validate required fields
      if (!applicantName || !applicantEmail || !visaType || !travelPurpose) {
        return res.status(400).json({
          message: 'Missing required fields: applicantName, email, visaType, travelPurpose are required',
          received: {
            applicantName,
            applicantEmail,
            visaType,
            travelPurpose
          }
        });
      }
      
      // Determine status (use incoming status if provided, otherwise default to 'Submitted')
      const applicationStatus = incomingStatus || 'Submitted';
      
      // Create new application
      const newApplication = new Application({
        applicantName,
        applicantEmail,
        applicantPhone,
        passportNumber,
        visaType,
        travelPurpose,
        destination: destination || '',
        duration: duration || '',
        userId: userId || '',
        paymentStatus: paymentStatus || 'pending',
        travelDate,
        returnDate,
        additionalInfo,
        status: applicationStatus,
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
        await sendEmail(
          applicantEmail,
          `Visa Application Received - ${savedApplication.referenceNumber}`,
          `Dear ${applicantName},<br><br>` +
          `Thank you for applying for a visa with Fafali Group. Your application has been received.<br><br>` +
          `Reference Number: ${savedApplication.referenceNumber}<br>` +
          `Visa Type: ${visaType}<br>` +
          `Status: Submitted<br><br>` +
          `Our team will review your application and contact you if additional information is needed.<br><br>` +
          `Best regards,<br>` +
          `Fafali Group Visa Services`
        );
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError.message);
      }
      
      // Send notification to admin
      try {
        const adminEmail = process.env.ADMIN_EMAIL || 'visas@fafaligroup.org';
        await sendEmail(
          adminEmail,
          `New Visa Application: ${savedApplication.referenceNumber}`,
          `A new visa application has been submitted:<br><br>` +
          `Applicant: ${applicantName}<br>` +
          `Email: ${applicantEmail}<br>` +
          `Visa Type: ${visaType}<br>` +
          `Reference: ${savedApplication.referenceNumber}<br>` +
          `Date: ${new Date().toLocaleString()}<br><br>` +
          `Login to the admin system to process this application.`
        );
      } catch (adminEmailError) {
        console.error('Failed to send admin notification:', adminEmailError.message);
      }
      
      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        application: {
          id: savedApplication._id,
          referenceNumber: savedApplication.referenceNumber,
          status: savedApplication.status,
          createdAt: savedApplication.createdAt
        }
      });
      
    } catch (err) {
      console.error('Error creating public application:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        code: err.code,
        requestBody: req.body,
        requestHeaders: req.headers
      });
      
      // Enhanced error response
      const errorResponse = {
        message: 'Failed to submit application',
        error: err.message,
        details: 'Admin system connection failed',
        timestamp: new Date().toISOString()
      };
      
      // Add specific error information
      if (err.name === 'ValidationError') {
        errorResponse.validationErrors = err.errors;
      } else if (err.code === 11000) {
        errorResponse.duplicateError = true;
      } else if (err.message.includes('ECONNREFUSED')) {
        errorResponse.networkError = true;
      } else if (err.type === 'entity.parse.failed') {
        errorResponse.bodyParseError = true;
        errorResponse.receivedBody = req.body;
      }
      
      res.status(500).json(errorResponse);
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
      
      // Find application by reference number and email (using applicantEmail field)
      const application = await Application.findOne({ 
        referenceNumber, 
        applicantEmail: email 
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
      
      // Find the application using applicantEmail field
      const application = await Application.findOne({ 
        referenceNumber, 
        applicantEmail: email 
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
