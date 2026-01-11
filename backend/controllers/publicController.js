const Application = require('../models/Application');
const Booking = require('../models/Booking');
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
      // Enhanced logging for debugging
      console.log('📤 Document upload request received');
      console.log('Request body:', req.body);
      console.log('Request file:', req.file);
      console.log('Request headers:', req.headers);
       
      const { referenceNumber, email, documentType } = req.body;
       
      // Detailed validation logging
      console.log('Validation check:');
      console.log('  referenceNumber:', referenceNumber, '->', !!referenceNumber);
      console.log('  email:', email, '->', !!email);
      console.log('  documentType:', documentType, '->', !!documentType);
      console.log('  file:', req.file, '->', !!req.file);
       
      if (!referenceNumber || !email || !documentType || !req.file) {
        const errorDetails = {
          message: 'Reference number, email, document type, and file are required',
          missingFields: [],
          receivedFields: {
            referenceNumber,
            email,
            documentType,
            file: !!req.file
          }
        };
        
        if (!referenceNumber) errorDetails.missingFields.push('referenceNumber');
        if (!email) errorDetails.missingFields.push('email');
        if (!documentType) errorDetails.missingFields.push('documentType');
        if (!req.file) errorDetails.missingFields.push('file');
        
        console.error('❌ Validation failed:', errorDetails);
        
        return res.status(400).json(errorDetails);
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
        originalFileName: req.file.originalname,
        filePath: req.file.path,
        documentType,
        uploadedBy: null, // No user ID for public uploads
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
  },

  // Public endpoint for URL-based document submission (for external systems)
  submitDocumentUrl: async (req, res) => {
    try {
      // Enhanced logging for debugging
      console.log('📤 URL-based document submission received');
      console.log('Request body:', req.body);
      console.log('Request headers:', req.headers);
      
      const { referenceNumber, email, documentType, cloudinaryUrl, cloudinaryPublicId } = req.body;
      
      // Detailed validation logging
      console.log('Validation check:');
      console.log('  referenceNumber:', referenceNumber, '->', !!referenceNumber);
      console.log('  email:', email, '->', !!email);
      console.log('  documentType:', documentType, '->', !!documentType);
      console.log('  cloudinaryUrl:', cloudinaryUrl, '->', !!cloudinaryUrl);
      
      if (!referenceNumber || !email || !documentType || !cloudinaryUrl) {
        const errorDetails = {
          message: 'Reference number, email, document type, and cloudinaryUrl are required',
          missingFields: [],
          receivedFields: {
            referenceNumber,
            email,
            documentType,
            cloudinaryUrl,
            cloudinaryPublicId
          }
        };
        
        if (!referenceNumber) errorDetails.missingFields.push('referenceNumber');
        if (!email) errorDetails.missingFields.push('email');
        if (!documentType) errorDetails.missingFields.push('documentType');
        if (!cloudinaryUrl) errorDetails.missingFields.push('cloudinaryUrl');
        
        console.error('❌ Validation failed:', errorDetails);
        
        return res.status(400).json(errorDetails);
      }
      
      // Find the application using applicantEmail field
      const application = await Application.findOne({
        referenceNumber,
        applicantEmail: email
      });
      
      if (!application) {
        console.error('❌ Application not found for reference:', referenceNumber, 'email:', email);
        return res.status(404).json({
          message: 'Application not found',
          referenceNumber,
          email
        });
      }
      
      console.log('✅ Application found:', application._id);
      
      // Create document record with Cloudinary URL
      const newDocument = new Document({
        applicationId: application._id,
        documentType,
        cloudinaryUrl,
        cloudinaryPublicId: cloudinaryPublicId || '',
        originalFileName: documentType + '_' + Date.now() + '.pdf', // Generate a filename
        uploadedBy: null, // No user ID for external uploads
        status: 'Uploaded',
        source: 'cloudinary'
      });
      
      await newDocument.save();
      
      // Update application documents array
      application.documents.push(newDocument._id);
      await application.save();
      
      console.log('✅ Document saved:', newDocument._id);
      
      // Log the upload
      await AuditLog.create({
        action: 'Document Uploaded via URL',
        entityType: 'Document',
        entityId: newDocument._id,
        performedBy: `External System: ${application.applicantName}`,
        details: `Document uploaded via Cloudinary URL: ${documentType} for application ${referenceNumber}`
      });
      
      res.json({
        success: true,
        message: 'Document URL submitted successfully',
        document: {
          id: newDocument._id,
          documentType: newDocument.documentType,
          cloudinaryUrl: newDocument.cloudinaryUrl,
          cloudinaryPublicId: newDocument.cloudinaryPublicId,
          status: newDocument.status,
          applicationId: newDocument.applicationId
        }
      });
      
    } catch (err) {
      console.error('❌ Error in URL document submission:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        code: err.code
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to submit document URL',
        error: err.message,
        details: 'Document URL submission failed'
      });
    }
  },
  
  // Public endpoint to check booking status
  checkBookingStatus: async (req, res) => {
    try {
      const { referenceNumber, email } = req.query;
      
      if (!referenceNumber || !email) {
        return res.status(400).json({ 
          message: 'Reference number and email are required'
        });
      }
      
      // Find booking by reference number and email
      const booking = await Booking.findOne({ 
        referenceNumber, 
        customerEmail: email 
      }).select('-comments -internalNotes');
      
      if (!booking) {
        return res.status(404).json({ 
          message: 'Booking not found. Please check your reference number and email.'
        });
      }
      
      res.json({
        success: true,
        booking: {
          referenceNumber: booking.referenceNumber,
          customerName: booking.customerName,
          tourName: booking.tourName,
          tourPackage: booking.tourPackage,
          departureDate: booking.departureDate,
          numberOfTravelers: booking.numberOfTravelers,
          totalAmount: booking.totalAmount,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt,
          // Include status-specific messages
          statusMessage: getBookingStatusMessage(booking.status)
        }
      });
      
    } catch (err) {
      res.status(500).json({ message: 'Failed to check booking status' });
    }
  },
  
  // Public endpoint for website tour bookings
  createPublicBooking: async (req, res) => {
    try {
      // Handle case where body might be stringified incorrectly
      let bodyData = req.body;
      
      // Enhanced logging for booking submission
      console.log('📅 Booking submission received');
      console.log('Raw request body:', bodyData);
      console.log('Request headers:', req.headers);
      
      if (typeof bodyData === 'string') {
        try {
          let fixedJson = bodyData.replace(/'/g, '"');
          bodyData = JSON.parse(fixedJson);
        } catch (parseErr) {
          try {
            const keyRegex = /([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
            let fixedJson2 = bodyData.replace(keyRegex, '$1"$2":');
            bodyData = JSON.parse(fixedJson2);
          } catch (finalErr) {
            return res.status(400).json({
              message: 'Invalid JSON format. Please ensure your request uses valid JSON with double quotes around all keys and string values.',
              example: '{"customerName":"John Doe","customerEmail":"john@example.com","tourName":"Safari Tour","numberOfTravelers":2}'
            });
          }
        }
      }
      
      const {
        customerName,
        customerEmail,
        customerPhone,
        tourName,
        tourPackage,
        departureDate,
        returnDate,
        numberOfTravelers,
        totalAmount,
        specialRequests,
        serviceType,      // Capture service type from frontend
        tourDate,        // Capture tour date from frontend
        ...otherFields   // Capture any additional fields
      } = bodyData;
      
      // Log extracted fields for debugging
      console.log('Extracted booking fields:');
      console.log('  customerName:', customerName);
      console.log('  customerEmail:', customerEmail);
      console.log('  customerPhone:', customerPhone);
      console.log('  tourName:', tourName);
      console.log('  serviceType:', serviceType);
      console.log('  tourDate:', tourDate);
      console.log('  departureDate:', departureDate);
      console.log('  returnDate:', returnDate);
      console.log('  numberOfTravelers:', numberOfTravelers);
      console.log('  totalAmount:', totalAmount);
      console.log('  specialRequests:', specialRequests);
      console.log('  otherFields:', otherFields);
      
      // Validate required fields
      if (!customerName || !customerEmail || !tourName) {
        return res.status(400).json({
          message: 'Missing required fields: customerName, customerEmail, and tourName are required',
          received: { customerName, customerEmail, tourName }
        });
      }
      
      // Create new booking
      const newBooking = new Booking({
        customerName,
        customerEmail,
        customerPhone: customerPhone || '',
        tourName,
        tourPackage: tourPackage || '',
        departureDate,
        returnDate,
        numberOfTravelers: numberOfTravelers || 1,
        totalAmount: totalAmount || 0,
        specialRequests: specialRequests || '',
        status: 'Pending',
        paymentStatus: 'pending',
        source: 'website',
        referenceNumber: `BK-${Date.now().toString().slice(-6)}`
      });
      
      const savedBooking = await newBooking.save();
      
      // Log the creation
      await AuditLog.create({
        action: 'Booking Created',
        entityType: 'Booking',
        entityId: savedBooking._id,
        performedBy: 'Public Website',
        details: `New booking created from website: ${customerName} - ${tourName}`
      });
      
      // Send confirmation email (non-blocking - don't let email failure prevent booking creation)
      try {
        sendEmail(
          customerEmail,
          `Tour Booking Received - ${savedBooking.referenceNumber}`,
          `Dear ${customerName},<br><br>` +
          `Thank you for booking with Fafali Group. Your tour booking has been received.<br><br>` +
          `Reference Number: ${savedBooking.referenceNumber}<br>` +
          `Tour: ${tourName}<br>` +
          `Status: Pending<br><br>` +
          `Our team will contact you shortly to confirm your booking and payment details.<br><br>` +
          `Best regards,<br>` +
          `Fafali Group Tours`
        ).catch(emailError => {
          console.error('Failed to send booking confirmation email:', emailError.message);
        });
      } catch (emailError) {
        console.error('Failed to send booking confirmation email:', emailError.message);
      }
      
      res.status(201).json({
        success: true,
        message: 'Booking submitted successfully',
        booking: {
          id: savedBooking._id,
          referenceNumber: savedBooking.referenceNumber,
          status: savedBooking.status,
          createdAt: savedBooking.createdAt
        }
      });
      
    } catch (err) {
      console.error('Error creating public booking:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        code: err.code,
        requestBody: req.body
      });
      
      // Enhanced error response
      const errorResponse = {
        message: 'Failed to submit booking',
        error: err.message,
        details: 'Booking submission failed',
        timestamp: new Date().toISOString()
      };
      
      // Add specific error information
      if (err.name === 'ValidationError') {
        errorResponse.validationErrors = err.errors;
        errorResponse.message = 'Validation failed for booking submission';
      } else if (err.code === 11000) {
        errorResponse.duplicateError = true;
        errorResponse.message = 'Duplicate booking detected';
      } else if (err.message.includes('ECONNREFUSED')) {
        errorResponse.networkError = true;
        errorResponse.message = 'Database connection failed';
      } else if (err.message.includes('Cast to date failed')) {
        errorResponse.dateFormatError = true;
        errorResponse.message = 'Invalid date format. Please use ISO format (YYYY-MM-DD)';
      }
      
      res.status(500).json(errorResponse);
    }
  }
};

// Helper function for application status messages
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

// Helper function for booking status messages
function getBookingStatusMessage(status) {
  const messages = {
    'Pending': 'Your booking is awaiting confirmation from our team.',
    'Confirmed': 'Your booking has been confirmed! We look forward to hosting you.',
    'In Progress': 'Your tour is currently in progress. Enjoy your trip!',
    'Completed': 'Your tour has been completed. Thank you for traveling with us!',
    'Cancelled': 'Your booking has been cancelled. Contact us for any refunds or rebooking.'
  };
  
  return messages[status] || 'Your booking is being processed.';
}

module.exports = publicController;
