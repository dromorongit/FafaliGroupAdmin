# URL-Based Document Submission Guide

## Overview

This guide explains how to submit document URLs to the Fafali Group Admin system instead of uploading files directly. This is designed for external systems that handle their own file uploads (e.g., to Cloudinary) and want to submit the resulting URLs to the admin system.

## API Endpoint

**POST** `/api/public/documents/url-submit`

## Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `referenceNumber` | String | Application reference number | `"FAF-096472"` |
| `email` | String | Applicant's email address | `"dromornarh@gmail.com"` |
| `documentType` | String | Type of document | `"Passport Bio Page"` |
| `cloudinaryUrl` | String | Full URL to the document | `"https://res.cloudinary.com/.../image.jpg"` |
| `cloudinaryPublicId` | String (optional) | Cloudinary public ID | `"visa_documents/tme86tupfk7bmhh1paoo"` |

## Document Types

Supported document types:
- `passport` - General passport document
- `passport_bio_page` - Passport bio data page
- `passport_photograph` - Passport-sized photograph
- `bank_statement` - Bank statement
- `proof_of_funds` - Proof of funds document
- `travel_itinerary` - Travel itinerary
- `hotel_booking` - Hotel booking confirmation
- `employment_letter` - Employment verification letter
- `admission_letter` - School admission letter
- `invitation_letter` - Invitation letter
- `other` - Other document types

## Request Example

```json
{
  "referenceNumber": "FAF-096472",
  "email": "dromornarh@gmail.com",
  "documentType": "Passport Bio Page",
  "cloudinaryUrl": "https://res.cloudinary.com/dzngjsqpe/image/upload/v1768080339/visa_documents/tme86tupfk7bmhh1paoo.jpg",
  "cloudinaryPublicId": "visa_documents/tme86tupfk7bmhh1paoo"
}
```

## Response Example (Success)

```json
{
  "success": true,
  "message": "Document URL submitted successfully",
  "document": {
    "id": "65a5b4c3d2e1f0g1h2i3j4k5",
    "documentType": "Passport Bio Page",
    "cloudinaryUrl": "https://res.cloudinary.com/dzngjsqpe/image/upload/v1768080339/visa_documents/tme86tupfk7bmhh1paoo.jpg",
    "cloudinaryPublicId": "visa_documents/tme86tupfk7bmhh1paoo",
    "status": "Uploaded",
    "applicationId": "65a5b4c3d2e1f0g1h2i3j4k4"
  }
}
```

## Error Responses

### Missing Required Fields (400)

```json
{
  "message": "Reference number, email, document type, and cloudinaryUrl are required",
  "missingFields": ["referenceNumber", "email"],
  "receivedFields": {
    "referenceNumber": null,
    "email": null,
    "documentType": "Passport Bio Page",
    "cloudinaryUrl": "https://res.cloudinary.com/.../image.jpg",
    "cloudinaryPublicId": "visa_documents/tme86tupfk7bmhh1paoo"
  }
}
```

### Application Not Found (404)

```json
{
  "message": "Application not found",
  "referenceNumber": "INVALID-REF",
  "email": "nonexistent@example.com"
}
```

### Server Error (500)

```json
{
  "success": false,
  "message": "Failed to submit document URL",
  "error": "Error details",
  "details": "Document URL submission failed"
}
```

## Integration Guide

### For External Backend Systems

1. **Upload to Cloudinary**: First upload the document to Cloudinary and get the URL
2. **Submit URL to Admin System**: Call the `/api/public/documents/url-submit` endpoint with the Cloudinary URL
3. **Handle Response**: Process the success/failure response appropriately

### Example Integration Code

```javascript
const axios = require('axios');

async function submitDocumentUrl(applicationData) {
  try {
    const response = await axios.post(
      'https://fafali-group-admin.example.com/api/public/documents/url-submit',
      {
        referenceNumber: applicationData.referenceNumber,
        email: applicationData.email,
        documentType: applicationData.documentType,
        cloudinaryUrl: applicationData.cloudinaryUrl,
        cloudinaryPublicId: applicationData.cloudinaryPublicId
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Document URL submission failed:', error.response?.data || error.message);
    throw error;
  }
}
```

## Migration from File Uploads

If you were previously using the file upload endpoint (`/api/public/documents/upload`), you can migrate to URL-based submission:

### Before (File Upload)
```javascript
const formData = new FormData();
formData.append('document', fileStream);
formData.append('referenceNumber', 'FAF-096472');
formData.append('email', 'dromornarh@gmail.com');
formData.append('documentType', 'Passport Bio Page');

await axios.post('/api/public/documents/upload', formData);
```

### After (URL Submission)
```javascript
// 1. Upload to Cloudinary first
const cloudinaryResponse = await uploadToCloudinary(fileStream);

// 2. Submit URL to admin system
await axios.post('/api/public/documents/url-submit', {
  referenceNumber: 'FAF-096472',
  email: 'dromornarh@gmail.com',
  documentType: 'Passport Bio Page',
  cloudinaryUrl: cloudinaryResponse.url,
  cloudinaryPublicId: cloudinaryResponse.public_id
});
```

## Benefits of URL-Based Submission

1. **Reduced Bandwidth**: No need to upload files twice (once to Cloudinary, once to admin system)
2. **Faster Processing**: Direct URL submission is faster than file uploads
3. **Better Error Handling**: Clear validation and error messages
4. **Centralized Storage**: All documents stored in Cloudinary for consistency
5. **Improved Logging**: Detailed logs for debugging and auditing

## Troubleshooting

### Common Issues

1. **400 Bad Request**: Missing required fields - check all fields are included
2. **404 Not Found**: Application not found - verify reference number and email match
3. **500 Server Error**: Internal server error - check server logs for details

### Debugging Tips

- Enable debug logging in your client
- Check the admin system logs for detailed request information
- Validate all required fields are present before submission
- Ensure the Cloudinary URL is publicly accessible

## Security Considerations

- Use HTTPS for all API calls
- Validate Cloudinary URLs before submission
- Implement proper error handling in your client code
- Monitor for suspicious activity or invalid URLs

## Support

For issues with the URL-based document submission API, contact the Fafali Group technical support team with:
- The exact error message received
- The request payload you sent
- Any relevant logs or timestamps