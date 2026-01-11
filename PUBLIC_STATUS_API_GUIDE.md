# Public Status API Guide for External Website Integration

## Overview

This guide explains how to implement public status checking endpoints that allow the external website (`dromorongit.github.io/Fafali-Group/`) to display application and booking statuses to users without requiring authentication.

## Current Status Checking Endpoints

The admin system already has these public endpoints for status checking:

### 1. Check Application Status
**GET** `/api/public/applications/status`

**Parameters:**
- `referenceNumber` (required) - Application reference number
- `email` (required) - Applicant's email address

**Example Request:**
```
GET /api/public/applications/status?referenceNumber=FAF-123456&email=user@example.com
```

**Example Response:**
```json
{
  "success": true,
  "application": {
    "referenceNumber": "FAF-123456",
    "applicantName": "John Doe",
    "visaType": "Tourist",
    "status": "Under Review",
    "createdAt": "2024-01-10T10:30:00.000Z",
    "updatedAt": "2024-01-11T14:25:00.000Z",
    "statusMessage": "Your application is currently being reviewed by our visa officers."
  }
}
```

### 2. Check Booking Status
**GET** `/api/public/bookings/status`

**Parameters:**
- `referenceNumber` (required) - Booking reference number
- `email` (required) - Customer's email address

**Example Request:**
```
GET /api/public/bookings/status?referenceNumber=BK-654321&email=user@example.com
```

**Example Response:**
```json
{
  "success": true,
  "booking": {
    "referenceNumber": "BK-654321",
    "customerName": "Jane Smith",
    "tourName": "Local Tour",
    "status": "Confirmed",
    "paymentStatus": "paid",
    "createdAt": "2024-01-10T15:45:00.000Z",
    "updatedAt": "2024-01-11T09:15:00.000Z",
    "statusMessage": "Your booking has been confirmed! We look forward to hosting you."
  }
}
```

## Integration Guide for External Website

### JavaScript Integration Example

```javascript
// Function to check application status
async function checkApplicationStatus(referenceNumber, email) {
  try {
    const response = await fetch(
      `https://fafali-group-admin.example.com/api/public/applications/status?referenceNumber=${referenceNumber}&email=${email}`
    );
    
    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        status: data.application.status,
        statusMessage: data.application.statusMessage,
        details: data.application
      };
    } else {
      return {
        success: false,
        message: 'Application not found or error occurred'
      };
    }
    
  } catch (error) {
    console.error('Error checking application status:', error);
    return {
      success: false,
      message: 'Failed to check application status',
      error: error.message
    };
  }
}

// Function to check booking status
async function checkBookingStatus(referenceNumber, email) {
  try {
    const response = await fetch(
      `https://fafali-group-admin.example.com/api/public/bookings/status?referenceNumber=${referenceNumber}&email=${email}`
    );
    
    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        status: data.booking.status,
        statusMessage: data.booking.statusMessage,
        details: data.booking
      };
    } else {
      return {
        success: false,
        message: 'Booking not found or error occurred'
      };
    }
    
  } catch (error) {
    console.error('Error checking booking status:', error);
    return {
      success: false,
      message: 'Failed to check booking status',
      error: error.message
    };
  }
}

// Usage example on the external website
async function updateUserDashboard() {
  // Get user's applications and bookings from local storage or API
  const userApplications = JSON.parse(localStorage.getItem('userApplications')) || [];
  const userBookings = JSON.parse(localStorage.getItem('userBookings')) || [];
  
  // Check status for each application
  for (const app of userApplications) {
    const statusResult = await checkApplicationStatus(app.referenceNumber, app.email);
    
    if (statusResult.success) {
      // Update UI with status
      document.getElementById(`app-${app.referenceNumber}-status`).textContent = statusResult.status;
      document.getElementById(`app-${app.referenceNumber}-message`).textContent = statusResult.statusMessage;
      
      // Add status-specific styling
      const statusElement = document.getElementById(`app-${app.referenceNumber}-status`);
      statusElement.className = `status-${statusResult.status.toLowerCase().replace(' ', '-')}`;
    }
  }
  
  // Check status for each booking
  for (const booking of userBookings) {
    const statusResult = await checkBookingStatus(booking.referenceNumber, booking.email);
    
    if (statusResult.success) {
      // Update UI with status
      document.getElementById(`booking-${booking.referenceNumber}-status`).textContent = statusResult.status;
      document.getElementById(`booking-${booking.referenceNumber}-message`).textContent = statusResult.statusMessage;
      
      // Add status-specific styling
      const statusElement = document.getElementById(`booking-${booking.referenceNumber}-status`);
      statusElement.className = `status-${statusResult.status.toLowerCase().replace(' ', '-')}`;
    }
  }
}

// Call this when the dashboard loads
updateUserDashboard();
// Optionally set up polling to refresh status periodically
setInterval(updateUserDashboard, 300000); // Refresh every 5 minutes
```

## Status Values and Messages

### Application Statuses

| Status | Description | User Message |
|--------|-------------|--------------|
| `Draft` | Application started but not submitted | "Your application is being prepared. Please complete all required information." |
| `Submitted` | Application received by admin | "Your application has been received and is awaiting review by our team." |
| `Under Review` | Application being processed | "Your application is currently being reviewed by our visa officers." |
| `Queried` | Additional info requested | "Additional information is required. Please check your email for details." |
| `Approved` | Application successful | "Congratulations! Your visa application has been approved." |
| `Rejected` | Application unsuccessful | "Unfortunately, your visa application has been rejected. Please contact us for more information." |

### Booking Statuses

| Status | Description | User Message |
|--------|-------------|--------------|
| `Pending` | Booking received, awaiting confirmation | "Your booking is awaiting confirmation from our team." |
| `Confirmed` | Booking confirmed | "Your booking has been confirmed! We look forward to hosting you." |
| `In Progress` | Tour is currently happening | "Your tour is currently in progress. Enjoy your trip!" |
| `Completed` | Tour finished | "Your tour has been completed. Thank you for traveling with us!" |
| `Cancelled` | Booking cancelled | "Your booking has been cancelled. Contact us for any refunds or rebooking." |

## Error Handling

### Common Error Responses

**Application Not Found (404)**
```json
{
  "message": "Application not found. Please check your reference number and email."
}
```

**Booking Not Found (404)**
```json
{
  "message": "Booking not found. Please check your reference number and email."
}
```

**Missing Parameters (400)**
```json
{
  "message": "Reference number and email are required"
}
```

**Server Error (500)**
```json
{
  "message": "Failed to check application status"
}
```

### Frontend Error Handling

```javascript
// Handle status check errors gracefully
async function safeStatusCheck(checkFunction, referenceNumber, email, entityType) {
  try {
    const result = await checkFunction(referenceNumber, email);
    
    if (!result.success) {
      console.warn(`${entityType} status check failed:`, result.message);
      
      // Show user-friendly message
      return {
        status: 'unknown',
        statusMessage: 'Status information temporarily unavailable. Please try again later.',
        error: result.message
      };
    }
    
    return result;
    
  } catch (error) {
    console.error(`${entityType} status check error:`, error);
    
    // Show user-friendly error message
    return {
      status: 'unknown',
      statusMessage: 'Unable to retrieve status. Please check your connection and try again.',
      error: error.message
    };
  }
}
```

## Security Considerations

### Data Protection
- Only return essential information to public endpoints
- Never expose internal notes, comments, or sensitive data
- Use `.select()` in Mongoose queries to exclude sensitive fields

### Rate Limiting
Consider adding rate limiting to prevent abuse:
```javascript
// In backend/routes/public.js
const rateLimit = require('express-rate-limit');

const statusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many status requests from this IP, please try again later'
});

router.get('/applications/status', statusLimiter, publicController.checkApplicationStatus);
router.get('/bookings/status', statusLimiter, publicController.checkBookingStatus);
```

## Performance Optimization

### Caching
Consider implementing caching for status checks:
```javascript
// Simple in-memory cache
const statusCache = {};

async function getCachedApplicationStatus(referenceNumber, email) {
  const cacheKey = `app-${referenceNumber}-${email}`;
  
  // Check cache first
  if (statusCache[cacheKey] && Date.now() - statusCache[cacheKey].timestamp < 300000) {
    return statusCache[cacheKey].data;
  }
  
  // Fetch from database
  const application = await Application.findOne({ 
    referenceNumber, 
    applicantEmail: email 
  }).select('-documents -internalNotes');
  
  if (!application) {
    return null;
  }
  
  // Cache the result
  const result = {
    success: true,
    application: {
      referenceNumber: application.referenceNumber,
      applicantName: application.applicantName,
      visaType: application.visaType,
      status: application.status,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      statusMessage: getStatusMessage(application.status)
    }
  };
  
  statusCache[cacheKey] = {
    data: result,
    timestamp: Date.now()
  };
  
  return result;
}
```

## Implementation Checklist

### For Admin System (Already Implemented ✅)
- ✅ Public status checking endpoints
- ✅ Proper field selection (excluding sensitive data)
- ✅ Status message generation
- ✅ Error handling
- ✅ Logging

### For External Website (Needs Implementation)
- [ ] Integrate status checking API calls
- [ ] Update user dashboard with real-time status
- [ ] Add status-specific styling and messages
- [ ] Implement error handling and retry logic
- [ ] Add loading states during status checks
- [ ] Consider polling for automatic updates

## Testing the Integration

### Test Cases

1. **Valid Application**
   - Reference: FAF-123456, Email: user@example.com
   - Expected: Return application status and details

2. **Invalid Application**
   - Reference: INVALID-REF, Email: user@example.com
   - Expected: 404 Not Found

3. **Missing Parameters**
   - No reference number or email
   - Expected: 400 Bad Request

4. **Valid Booking**
   - Reference: BK-654321, Email: user@example.com
   - Expected: Return booking status and details

5. **Invalid Booking**
   - Reference: INVALID-BK, Email: user@example.com
   - Expected: 404 Not Found

### Test Script

```javascript
// test_status_api.js
const axios = require('axios');

async function testStatusAPI() {
  const baseUrl = 'http://localhost:5000/api/public';
  
  // Test application status
  console.log('🧪 Testing application status...');
  try {
    const response = await axios.get(`${baseUrl}/applications/status`, {
      params: {
        referenceNumber: 'FAF-123456',
        email: 'test@example.com'
      }
    });
    console.log('✅ Application status:', response.data);
  } catch (error) {
    console.log('❌ Application status error:', error.response?.data || error.message);
  }
  
  // Test booking status
  console.log('🧪 Testing booking status...');
  try {
    const response = await axios.get(`${baseUrl}/bookings/status`, {
      params: {
        referenceNumber: 'BK-654321',
        email: 'test@example.com'
      }
    });
    console.log('✅ Booking status:', response.data);
  } catch (error) {
    console.log('❌ Booking status error:', error.response?.data || error.message);
  }
}

testStatusAPI();
```

## Deployment Instructions

### Admin System
The admin system already has the required endpoints deployed. No additional deployment needed.

### External Website
1. Add the status checking functions to your JavaScript
2. Integrate with user dashboard UI
3. Test with various status scenarios
4. Deploy to production

## Support

For issues with status API integration:
- Check network console for error details
- Verify reference numbers and email addresses
- Review server logs for backend errors
- Test with known valid references first
- Implement proper error handling in frontend code