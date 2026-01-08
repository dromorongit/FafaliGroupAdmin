# Fafali Group Visa Admin System - Website Integration Guide

## Overview

This guide explains how to connect your main website to the Fafali Group Visa Admin System. When users apply for visas on your website, their applications will automatically appear in the admin dashboard for processing.

## Integration Methods

### 1. Direct API Integration (Recommended)

Connect your website forms directly to the admin system API endpoints.

#### Visa Application Form Integration

**Endpoint**: `POST /api/public/applications`

**Request Example**:
```javascript
// JavaScript example for your website form
const form = document.getElementById('visa-application-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    applicantName: form.applicantName.value,
    email: form.email.value,
    phone: form.phone.value,
    passportNumber: form.passportNumber.value,
    visaType: form.visaType.value,
    travelPurpose: form.travelPurpose.value,
    travelDate: form.travelDate.value,
    returnDate: form.returnDate.value,
    additionalInfo: form.additionalInfo.value
  };
  
  try {
    const response = await fetch('https://your-admin-system.com/api/public/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // Show success message
      alert(`Application submitted successfully!\nReference: ${result.application.referenceNumber}`);
      form.reset();
    } else {
      // Show error message
      alert(`Error: ${result.message}`);
    }
  } catch (error) {
    console.error('Submission error:', error);
    alert('Failed to submit application. Please try again.');
  }
});
```

**Response Example**:
```json
{
  "message": "Application submitted successfully",
  "application": {
    "id": "61a7b2c3d4e5f6a7b8c9d0e1",
    "referenceNumber": "FAF-123456",
    "status": "Submitted",
    "createdAt": "2023-11-25T10:30:00.000Z"
  }
}
```

### 2. Application Status Check

**Endpoint**: `GET /api/public/applications/status`

**Request Example**:
```javascript
// Check application status
const referenceNumber = 'FAF-123456';
const email = 'applicant@example.com';

fetch(`https://your-admin-system.com/api/public/applications/status?referenceNumber=${referenceNumber}&email=${email}`)
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Application Status:', data.application.status);
      console.log('Status Message:', data.application.statusMessage);
    } else {
      console.log('Error:', data.message);
    }
  });
```

**Response Example**:
```json
{
  "success": true,
  "application": {
    "referenceNumber": "FAF-123456",
    "applicantName": "John Doe",
    "visaType": "Tourist Visa",
    "status": "Under Review",
    "createdAt": "2023-11-25T10:30:00.000Z",
    "updatedAt": "2023-11-25T11:15:00.000Z",
    "statusMessage": "Your application is currently being reviewed by our visa officers."
  }
}
```

### 3. Document Upload

**Endpoint**: `POST /api/public/documents/upload`

**Request Example**:
```javascript
// Upload document
const formData = new FormData();
formData.append('referenceNumber', 'FAF-123456');
formData.append('email', 'applicant@example.com');
formData.append('documentType', 'Passport Copy');
formData.append('document', fileInput.files[0]); // File from input

fetch('https://your-admin-system.com/api/public/documents/upload', {
  method: 'POST',
  body: formData
  // Headers are set automatically for FormData
})
.then(response => response.json())
.then(data => {
  console.log('Upload result:', data);
});
```

## Integration Flow

### How Applications Flow from Website to Admin System

```
1. User fills out visa application form on your website
   ↓
2. Website sends data to /api/public/applications
   ↓
3. Admin system creates application with "Submitted" status
   ↓
4. System sends confirmation email to applicant
   ↓
5. System sends notification email to admin
   ↓
6. Application appears in admin dashboard
   ↓
7. Admin processes application (reviews, approves, rejects)
   ↓
8. Status updates are visible in admin dashboard
   ↓
9. Applicant can check status on your website
```

## Website Implementation Examples

### HTML Form Example

```html
<form id="visa-application-form" class="visa-form">
  <h2>Visa Application Form</h2>
  
  <div class="form-group">
    <label for="applicantName">Full Name*</label>
    <input type="text" id="applicantName" name="applicantName" required>
  </div>
  
  <div class="form-group">
    <label for="email">Email*</label>
    <input type="email" id="email" name="email" required>
  </div>
  
  <div class="form-group">
    <label for="phone">Phone Number</label>
    <input type="tel" id="phone" name="phone">
  </div>
  
  <div class="form-group">
    <label for="passportNumber">Passport Number</label>
    <input type="text" id="passportNumber" name="passportNumber">
  </div>
  
  <div class="form-group">
    <label for="visaType">Visa Type*</label>
    <select id="visaType" name="visaType" required>
      <option value="">Select visa type</option>
      <option value="Tourist Visa">Tourist Visa</option>
      <option value="Business Visa">Business Visa</option>
      <option value="Student Visa">Student Visa</option>
      <option value="Work Visa">Work Visa</option>
    </select>
  </div>
  
  <div class="form-group">
    <label for="travelPurpose">Purpose of Travel*</label>
    <textarea id="travelPurpose" name="travelPurpose" required></textarea>
  </div>
  
  <div class="form-group">
    <label for="travelDate">Travel Date</label>
    <input type="date" id="travelDate" name="travelDate">
  </div>
  
  <div class="form-group">
    <label for="returnDate">Return Date</label>
    <input type="date" id="returnDate" name="returnDate">
  </div>
  
  <div class="form-group">
    <label for="additionalInfo">Additional Information</label>
    <textarea id="additionalInfo" name="additionalInfo"></textarea>
  </div>
  
  <button type="submit" class="submit-btn">Submit Application</button>
</form>
```

### Status Check Page Example

```html
<div class="status-check">
  <h2>Check Your Application Status</h2>
  
  <form id="status-check-form">
    <div class="form-group">
      <label for="refNumber">Reference Number*</label>
      <input type="text" id="refNumber" name="refNumber" required>
    </div>
    
    <div class="form-group">
      <label for="statusEmail">Email*</label>
      <input type="email" id="statusEmail" name="statusEmail" required>
    </div>
    
    <button type="submit" class="check-btn">Check Status</button>
  </form>
  
  <div id="status-result" class="status-result hidden">
    <h3>Application Status</h3>
    <div id="status-info"></div>
  </div>
</div>
```

## Security Considerations

### CORS Configuration

Ensure your admin system has proper CORS settings to allow requests from your website:

```javascript
// In your backend server.js
const corsOptions = {
  origin: ['https://your-website.com', 'https://www.your-website.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

### Rate Limiting

Protect your API from abuse:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/public/', limiter);
```

### Input Validation

Always validate input on both client and server sides.

## Testing the Integration

### Test Endpoints

You can test the API endpoints using tools like Postman or cURL:

```bash
# Test application submission
curl -X POST https://your-admin-system.com/api/public/applications \
  -H "Content-Type: application/json" \
  -d '{
    "applicantName": "Test Applicant",
    "email": "test@example.com",
    "visaType": "Tourist Visa",
    "travelPurpose": "Testing integration"
  }'

# Test status check
curl -X GET "https://your-admin-system.com/api/public/applications/status?referenceNumber=FAF-123456&email=test@example.com"
```

## Deployment Checklist

1. ✅ **Set up CORS**: Configure CORS to allow requests from your website domain
2. ✅ **API Documentation**: Document endpoints for your development team
3. ✅ **Error Handling**: Implement proper error handling on your website
4. ✅ **Loading States**: Show loading indicators during API calls
5. ✅ **Success Messages**: Display clear success messages to users
6. ✅ **Testing**: Test all integration points thoroughly
7. ✅ **Monitoring**: Set up monitoring for API usage and errors
8. ✅ **Backup**: Ensure database backups are in place

## Support

If you need help with the integration, you can:

1. Check the API responses for error details
2. Review the server logs for issues
3. Test endpoints individually using Postman
4. Contact your development team for assistance

## What Happens in the Admin System

When applications come from your website:

1. **Automatic Creation**: Applications are created with "Submitted" status
2. **Reference Numbers**: Each application gets a unique reference number (FAF-XXXXXX)
3. **Email Notifications**: Both applicant and admin receive confirmation emails
4. **Dashboard Visibility**: Applications appear immediately in the admin dashboard
5. **Audit Trail**: All actions are logged for tracking and security
6. **Status Updates**: As admins process applications, status changes are recorded
7. **Document Management**: Applicants can upload required documents

Your Fafali Group Visa Admin System is now fully prepared to receive applications from your main website!