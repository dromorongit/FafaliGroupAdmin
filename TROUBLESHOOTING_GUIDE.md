# Fafali Group Visa Admin System - Troubleshooting Guide

## Persistent Connection Issue Resolution

If you're still experiencing the "Application submitted to main system but admin system connection failed" error, follow this comprehensive troubleshooting guide.

## Step 1: Verify the Correct API Endpoint

**The most common issue**: Using the wrong API endpoint URL.

### Correct Endpoints:
- **Application Submission**: `POST https://your-admin-domain.com/api/public/applications`
- **Status Check**: `GET https://your-admin-domain.com/api/public/applications/status`
- **Document Upload**: `POST https://your-admin-domain.com/api/public/documents/upload`

### Common Mistakes:
- ❌ Using `/api/applications` (authenticated route) instead of `/api/public/applications` (public route)
- ❌ Missing `/public` in the URL path
- ❌ Using wrong domain (localhost vs production domain)

## Step 2: Check Server Logs

With the enhanced debugging middleware, check your server logs for:

```bash
# Look for incoming request logs
[2026-01-09T05:43:00.000Z] POST /api/public/applications
Headers: {
  'Origin': 'https://www.fafaligroup.org',
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0...'
}
Request body preview: [ 'applicantName', 'email', 'visaType', 'travelPurpose' ]
```

**If you don't see these logs**: The request is not reaching the server at all.

**If you see logs but no response**: There might be a middleware issue.

## Step 3: Test with cURL

Test the API directly from your main website server:

```bash
# Test application submission
curl -X POST https://your-admin-domain.com/api/public/applications \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.fafaligroup.org" \
  -d '{
    "applicantName": "Test Applicant",
    "email": "test@example.com", 
    "visaType": "Tourist Visa",
    "travelPurpose": "Testing connection"
  }'
```

**Expected successful response**:
```json
{
  "message": "Application submitted successfully",
  "application": {
    "id": "123456789",
    "referenceNumber": "FAF-123456",
    "status": "Submitted",
    "createdAt": "2026-01-09T05:43:00.000Z"
  }
}
```

**If you get CORS errors**: The domain is not properly configured.

**If you get 404 errors**: The endpoint URL is incorrect.

**If you get 500 errors**: Check the enhanced error response for details.

## Step 4: Verify CORS Configuration

Check that your main website domain is in the CORS origin list in [`backend/server.js`](backend/server.js:12):

```javascript
origin: ['https://www.fafaligroup.org', 'https://fafaligroup.org', 
         'https://dromorongit.github.io/Fafali-Group/', 
         'http://localhost:3000', 'http://localhost:5000']
```

**Add your domain if missing**:
```javascript
origin: [...existingDomains, 'https://your-website-domain.com']
```

## Step 5: Check Main Website Integration Code

Verify your main website's JavaScript code is using the correct endpoint:

### Correct JavaScript Example:
```javascript
// ✅ CORRECT
const response = await fetch('https://your-admin-domain.com/api/public/applications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(formData)
});
```

### Common Mistakes:
```javascript
// ❌ WRONG - Missing /public
const response = await fetch('https://your-admin-domain.com/api/applications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(formData)
});
```

## Step 6: Network Connectivity Check

Ensure your main website server can reach the admin system:

```bash
# Test basic connectivity
ping your-admin-domain.com

# Test HTTPS connectivity
curl -I https://your-admin-domain.com/api/public/applications

# Test from main website server
nc -zv your-admin-domain.com 443
```

## Step 7: Enhanced Error Analysis

With the improved error handling, you'll get detailed error information:

```json
{
  "message": "Failed to submit application",
  "error": "Specific error message",
  "details": "Admin system connection failed",
  "timestamp": "2026-01-09T05:43:00.000Z",
  "validationErrors": {...},  // If validation failed
  "duplicateError": true,     // If duplicate application
  "networkError": true        // If network connection failed
}
```

## Step 8: Common Solutions

### Issue: "Admin system connection failed"
**Solutions**:
1. Verify the admin system is running
2. Check server logs for errors
3. Test connectivity between servers
4. Verify firewall settings

### Issue: CORS errors
**Solutions**:
1. Add your domain to CORS origin list
2. Ensure no typos in domain names
3. Check for HTTPS/HTTP mismatches
4. Verify no trailing slashes in domain names

### Issue: 404 Not Found
**Solutions**:
1. Verify the exact endpoint URL
2. Check for typos in the path
3. Ensure you're using `/api/public/applications` not `/api/applications`

### Issue: 500 Server Error
**Solutions**:
1. Check server logs for detailed error
2. Verify database connection
3. Check for validation errors
4. Test with minimal request data

## Step 9: Final Verification Checklist

- [ ] Main website uses `https://your-admin-domain.com/api/public/applications`
- [ ] CORS configuration includes your exact domain
- [ ] Server logs show incoming requests from your website
- [ ] cURL tests from main website server succeed
- [ ] No firewall blocking requests between servers
- [ ] Both systems use HTTPS (no mixed content)
- [ ] No trailing slashes or typos in domain names

## Support Information

If the issue persists after following this guide:

1. **Collect logs**: Server logs, browser console logs, network request details
2. **Test endpoints**: Use cURL or Postman to test each endpoint individually
3. **Check connectivity**: Verify network connectivity between servers
4. **Review integration**: Double-check main website integration code

The enhanced debugging and error handling should now provide detailed information about exactly what's failing in the connection process.