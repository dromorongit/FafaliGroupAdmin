# Fafali Group Visa Admin System - Website Connection Instructions

## For Kilo Code Assistant: Website Integration

This document provides all the endpoints and instructions needed to connect the main Fafali Group website to the Visa Admin System.

## API Endpoints Summary

### 1. Submit Visa Application
**Endpoint**: `POST /api/public/applications`
**Access**: Public (no authentication required)
**Purpose**: Create new visa application from website

**Request Body**:
```json
{
  "applicantName": "string (required)",
  "email": "string (required)",
  "phone": "string (optional)",
  "passportNumber": "string (optional)",
  "visaType": "string (required)",
  "travelPurpose": "string (required)",
  "travelDate": "date (optional)",
  "returnDate": "date (optional)",
  "additionalInfo": "string (optional)"
}
```

**Successful Response**:
```json
{
  "message": "Application submitted successfully",
  "application": {
    "id": "string",
    "referenceNumber": "FAF-XXXXXX",
    "status": "Submitted",
    "createdAt": "ISODate"
  }
}
```

**Error Responses**:
- 400: Missing required fields
- 500: Server error

### 2. Check Application Status
**Endpoint**: `GET /api/public/applications/status`
**Access**: Public
**Purpose**: Allow applicants to check their application status

**Query Parameters**:
- `referenceNumber` (required): Application reference number
- `email` (required): Applicant's email address

**Successful Response**:
```json
{
  "success": true,
  "application": {
    "referenceNumber": "FAF-XXXXXX",
    "applicantName": "string",
    "visaType": "string",
    "status": "string",
    "createdAt": "ISODate",
    "updatedAt": "ISODate",
    "statusMessage": "string"
  }
}
```

**Error Responses**:
- 400: Missing parameters
- 404: Application not found
- 500: Server error

### 3. Upload Document
**Endpoint**: `POST /api/public/documents/upload`
**Access**: Public
**Purpose**: Allow applicants to upload required documents

**Form Data**:
- `referenceNumber` (required): Application reference number
- `email` (required): Applicant's email address
- `documentType` (required): Type of document (e.g., "Passport Copy")
- `document` (required): File upload

**Successful Response**:
```json
{
  "message": "Document uploaded successfully",
  "document": {
    "id": "string",
    "fileName": "string",
    "documentType": "string",
    "status": "Uploaded"
  }
}
```

**Error Responses**:
- 400: Missing fields or file
- 404: Application not found
- 500: Server error

## Website Implementation Requirements

### 1. Visa Application Form
**File**: `visa-application.html` (or your form page)

**Required Fields**:
- Applicant Name (text input)
- Email (email input)
- Visa Type (dropdown/select)
- Travel Purpose (textarea)

**Optional Fields**:
- Phone Number
- Passport Number
- Travel Date
- Return Date
- Additional Information

**JavaScript Integration**:
```javascript
// Add this to your form submission handler
document.getElementById('visa-application-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    applicantName: document.getElementById('applicantName').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone')?.value,
    passportNumber: document.getElementById('passportNumber')?.value,
    visaType: document.getElementById('visaType').value,
    travelPurpose: document.getElementById('travelPurpose').value,
    travelDate: document.getElementById('travelDate')?.value,
    returnDate: document.getElementById('returnDate')?.value,
    additionalInfo: document.getElementById('additionalInfo')?.value
  };
  
  try {
    const response = await fetch('https://YOUR_ADMIN_DOMAIN.com/api/public/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // Show success message with reference number
      alert(`Success! Your reference number is: ${result.application.referenceNumber}`);
      // Reset form
      e.target.reset();
    } else {
      // Show error message
      alert(`Error: ${result.message || 'Failed to submit application'}`);
    }
  } catch (error) {
    console.error('Submission error:', error);
    alert('Network error. Please try again.');
  }
});
```

### 2. Application Status Page
**File**: `application-status.html`

**Required Elements**:
- Reference Number input field
- Email input field
- Check Status button
- Status result display area

**JavaScript Integration**:
```javascript
document.getElementById('status-check-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const referenceNumber = document.getElementById('refNumber').value;
  const email = document.getElementById('statusEmail').value;
  
  try {
    const response = await fetch(`https://YOUR_ADMIN_DOMAIN.com/api/public/applications/status?referenceNumber=${encodeURIComponent(referenceNumber)}&email=${encodeURIComponent(email)}`);
    
    const result = await response.json();
    
    const statusResult = document.getElementById('status-result');
    const statusInfo = document.getElementById('status-info');
    
    if (result.success) {
      const app = result.application;
      statusInfo.innerHTML = `
        <p><strong>Reference:</strong> ${app.referenceNumber}</p>
        <p><strong>Applicant:</strong> ${app.applicantName}</p>
        <p><strong>Visa Type:</strong> ${app.visaType}</p>
        <p><strong>Status:</strong> ${app.status}</p>
        <p><strong>Date:</strong> ${new Date(app.createdAt).toLocaleDateString()}</p>
        <p><em>${app.statusMessage}</em></p>
      `;
      statusResult.classList.remove('hidden');
    } else {
      statusInfo.innerHTML = `<p class="error">${result.message || 'Application not found'}</p>`;
      statusResult.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Status check error:', error);
    document.getElementById('status-info').innerHTML = '<p class="error">Network error. Please try again.</p>';
  }
});
```

### 3. Document Upload Form
**File**: `document-upload.html` (or section in application page)

**Required Elements**:
- Reference Number input
- Email input
- Document Type dropdown
- File upload input
- Upload button

**JavaScript Integration**:
```javascript
document.getElementById('document-upload-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData();
  formData.append('referenceNumber', document.getElementById('uploadRefNumber').value);
  formData.append('email', document.getElementById('uploadEmail').value);
  formData.append('documentType', document.getElementById('documentType').value);
  formData.append('document', document.getElementById('documentFile').files[0]);
  
  try {
    const response = await fetch('https://YOUR_ADMIN_DOMAIN.com/api/public/documents/upload', {
      method: 'POST',
      body: formData
      // Headers are set automatically for FormData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert(`Document uploaded successfully: ${result.document.fileName}`);
      // Reset file input
      document.getElementById('document-upload-form').reset();
    } else {
      alert(`Error: ${result.message || 'Failed to upload document'}`);
    }
  } catch (error) {
    console.error('Upload error:', error);
    alert('Network error. Please try again.');
  }
});
```

## CORS Configuration

**Important**: Your admin system must be configured to accept requests from your website domain.

**Required CORS Settings**:
```javascript
// In backend/server.js
const corsOptions = {
  origin: ['https://your-website.com', 'https://www.your-website.com'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
```

## Testing Instructions

### Test the API Endpoints

1. **Test Application Submission**:
```bash
curl -X POST https://YOUR_ADMIN_DOMAIN.com/api/public/applications \
  -H "Content-Type: application/json" \
  -d '{"applicantName":"Test User","email":"test@example.com","visaType":"Tourist Visa","travelPurpose":"Testing"}'
```

2. **Test Status Check**:
```bash
curl -X GET "https://YOUR_ADMIN_DOMAIN.com/api/public/applications/status?referenceNumber=FAF-123456&email=test@example.com"
```

3. **Test Document Upload**:
```bash
curl -X POST https://YOUR_ADMIN_DOMAIN.com/api/public/documents/upload \
  -F "referenceNumber=FAF-123456" \
  -F "email=test@example.com" \
  -F "documentType=Passport Copy" \
  -F "document=@/path/to/test-file.pdf"
```

## Deployment Checklist

1. ✅ **Update CORS**: Configure CORS with your website domain
2. ✅ **Test Endpoints**: Verify all API endpoints work
3. ✅ **Add JavaScript**: Integrate the provided JavaScript code
4. ✅ **Create Forms**: Set up the required HTML forms
5. ✅ **Test Integration**: Submit test applications from website
6. ✅ **Verify Dashboard**: Check applications appear in admin dashboard
7. ✅ **Test Status Check**: Verify status checking works
8. ✅ **Test Document Upload**: Verify file uploads work
9. ✅ **Go Live**: Deploy the integrated system

## Expected Behavior

### When Integration is Complete:

1. **Website Form Submission** → Application appears in admin dashboard with "Submitted" status
2. **Admin Processes Application** → Status updates are visible when applicant checks status
3. **Applicant Uploads Documents** → Documents appear in admin document management
4. **Email Notifications** → Both applicant and admin receive confirmation emails
5. **Audit Trail** → All actions are logged in the system

## Support Information

**API Base URL**: `https://YOUR_ADMIN_DOMAIN.com/api/public/`

**Required Headers**:
- `Content-Type: application/json` (for JSON requests)
- No authentication required for public endpoints

**Response Formats**:
- Success: `200/201` with JSON response
- Validation Error: `400` with error message
- Not Found: `404` with error message
- Server Error: `500` with error message

This document provides everything needed to connect your main website to the Fafali Group Visa Admin System. The Kilo Code assistant can use these instructions to implement the integration.