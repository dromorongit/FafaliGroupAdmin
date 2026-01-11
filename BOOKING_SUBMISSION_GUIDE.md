# Booking Submission Guide for External Systems

## Error Analysis

The booking submission from `dromorongit.github.io/Fafali-Group/bookings.html` is failing with a **500 Internal Server Error** when the external backend tries to forward the booking to the admin system. The admin system returns a **400 status** with "Booking submission to admin system failed".

## Root Cause

Based on the console logs, the issue appears to be:

1. **Field Mismatch**: The frontend is sending fields like `serviceType` and `tourDate`, but the admin system expects different field names
2. **Validation Failure**: Required fields may be missing or in wrong format
3. **Date Format Issues**: Date fields may not be in ISO format

## Expected Booking Format

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `customerName` | String | Customer's full name | `"Henry Padi Nartey"` |
| `customerEmail` | String | Customer's email | `"hpdnarh@gmail.com"` |
| `tourName` | String | Tour name/service | `"Local Tour"` |

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `customerPhone` | String | Customer's phone | `"0500301282"` |
| `tourPackage` | String | Tour package type | `"Standard"` |
| `departureDate` | Date | Tour start date (ISO) | `"2026-01-31T00:00:00.000Z"` |
| `returnDate` | Date | Tour end date (ISO) | `"2026-02-05T00:00:00.000Z"` |
| `numberOfTravelers` | Number | Number of people | `2` |
| `totalAmount` | Number | Total booking amount | `500.00` |
| `specialRequests` | String | Special requirements | `"Vegetarian meals"` |

### Field Mapping

**Frontend Fields → Admin System Fields:**

| Frontend Field | Admin Field | Notes |
|---------------|-------------|-------|
| `fullName` | `customerName` | Rename required |
| `email` | `customerEmail` | Rename required |
| `phone` | `customerPhone` | Rename required |
| `serviceType` | `tourName` | Map service type to tour name |
| `tourDate` | `departureDate` | Convert to ISO date format |

### Service Type Mapping

```javascript
// Map frontend serviceType to admin tourName
const serviceTypeMapping = {
  'localTour': 'Local Tour',
  'internationalTour': 'International Tour',
  'airportTransfer': 'Airport Transfer',
  'hotelBooking': 'Hotel Booking',
  'customPackage': 'Custom Package'
};
```

## Correct Request Format

### Before (Frontend Format)
```json
{
  "serviceType": "localTour",
  "fullName": "Henry Padi Nartey",
  "email": "hpdnarh@gmail.com",
  "phone": "0500301282",
  "tourDate": "2026-01-31",
  "numberOfTravelers": 1,
  "specialRequests": "None"
}
```

### After (Admin System Format)
```json
{
  "customerName": "Henry Padi Nartey",
  "customerEmail": "hpdnarh@gmail.com",
  "customerPhone": "0500301282",
  "tourName": "Local Tour",
  "departureDate": "2026-01-31T00:00:00.000Z",
  "numberOfTravelers": 1,
  "specialRequests": "None",
  "source": "website"
}
```

## API Endpoint

**POST** `/api/public/bookings`

## Integration Code Example

```javascript
// In the external backend system
async function submitBookingToAdmin(bookingData) {
  try {
    // Transform frontend data to admin format
    const adminBookingData = {
      customerName: bookingData.fullName,
      customerEmail: bookingData.email,
      customerPhone: bookingData.phone,
      tourName: mapServiceTypeToTourName(bookingData.serviceType),
      departureDate: convertToISODate(bookingData.tourDate),
      numberOfTravelers: bookingData.numberOfTravelers || 1,
      specialRequests: bookingData.specialRequests || '',
      totalAmount: bookingData.totalAmount || 0
    };

    console.log('📅 Submitting booking to admin system:', adminBookingData);

    const response = await axios.post(
      'https://fafali-group-admin.example.com/api/public/bookings',
      adminBookingData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Booking submitted successfully:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Booking submission failed:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // Implement fallback/local storage if admin system is down
    if (error.response?.status === 500) {
      localStorage.setItem('pendingBooking', JSON.stringify(bookingData));
      return {
        success: false,
        message: 'Booking submission to admin system failed',
        error: error.response?.data,
        statusCode: error.response?.status,
        localBackup: true
      };
    }
    
    throw error;
  }
}

// Helper functions
function mapServiceTypeToTourName(serviceType) {
  const mapping = {
    'localTour': 'Local Tour',
    'internationalTour': 'International Tour',
    'airportTransfer': 'Airport Transfer',
    'hotelBooking': 'Hotel Booking',
    'customPackage': 'Custom Package'
  };
  return mapping[serviceType] || serviceType;
}

function convertToISODate(dateString) {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  return date.toISOString();
}
```

## Common Issues and Solutions

### Issue 1: Field Name Mismatch
**Error**: Validation fails because field names don't match
**Solution**: Transform field names before sending to admin system

### Issue 2: Missing Required Fields
**Error**: `Missing required fields: customerName, customerEmail, and tourName are required`
**Solution**: Ensure all required fields are present and mapped correctly

### Issue 3: Date Format Issues
**Error**: `Invalid date format. Please use ISO format (YYYY-MM-DD)`
**Solution**: Convert dates to ISO format using `new Date().toISOString()`

### Issue 4: Service Type Not Mapped
**Error**: Unknown tour name
**Solution**: Map frontend service types to admin tour names

## Debugging Tips

### Enhanced Logging
The admin system now logs:
- Raw request body
- Extracted fields with values
- Validation results
- Error details with stack traces

### Check Server Logs
```bash
# Look for booking submission logs
journalctl -u fafali-group-admin -f | grep "📅 Booking"

# Check for validation errors
journalctl -u fafali-group-admin -f | grep "❌ Validation"
```

### Test with cURL
```bash
curl -X POST https://fafali-group-admin.example.com/api/public/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test User",
    "customerEmail": "test@example.com",
    "tourName": "Local Tour",
    "departureDate": "2026-01-31T00:00:00.000Z",
    "numberOfTravelers": 1
  }'
```

## Validation Rules

### Required Fields
- `customerName`: Must be non-empty string
- `customerEmail`: Must be valid email format
- `tourName`: Must be non-empty string

### Field Types
- `customerPhone`: String (max 20 chars)
- `departureDate`: ISO Date string
- `returnDate`: ISO Date string (optional)
- `numberOfTravelers`: Number (default: 1)
- `totalAmount`: Number (default: 0)
- `specialRequests`: String (max 500 chars)

### Enum Values
- `paymentStatus`: `['pending', 'partial', 'paid', 'refunded']`
- `status`: `['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled']`
- `source`: `['website', 'admin', 'phone', 'walk-in']`

## Response Formats

### Success Response (201)
```json
{
  "success": true,
  "message": "Booking submitted successfully",
  "booking": {
    "id": "65a5b4c3d2e1f0g1h2i3j4k5",
    "referenceNumber": "BK-123456",
    "status": "Pending",
    "createdAt": "2024-01-11T10:30:00.000Z"
  }
}
```

### Error Response (400)
```json
{
  "message": "Missing required fields: customerName, customerEmail, and tourName are required",
  "received": {
    "customerName": null,
    "customerEmail": "test@example.com",
    "tourName": null
  }
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Failed to submit booking",
  "error": "Validation failed for booking submission",
  "details": "Booking submission failed",
  "timestamp": "2024-01-11T10:30:00.000Z",
  "validationErrors": {
    "customerName": {
      "message": "Path `customerName` is required.",
      "name": "ValidatorError",
      "path": "customerName"
    }
  }
}
```

## Migration Guide

### Update External Backend
1. **Add field mapping** for serviceType → tourName
2. **Transform field names** (fullName → customerName, etc.)
3. **Convert date formats** to ISO strings
4. **Add error handling** with fallback storage
5. **Implement retry logic** for failed submissions

### Test Plan
1. Test with all service types
2. Test with missing fields
3. Test with invalid dates
4. Test network failure scenarios
5. Test fallback/local storage

## Support

For booking submission issues, provide:
- Raw request payload
- Error response received
- Server logs (if available)
- Browser console logs
- Timestamp of the error