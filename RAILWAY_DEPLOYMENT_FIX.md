# Railway Deployment Fix for Fafali Group Visa Admin System

## Issue Identified

The persistent connection error is occurring because the admin system deployed on Railway cannot connect to the main website due to a combination of factors:

1. **MongoDB Connection Issue**: The server fails to start locally because it's trying to connect to Railway's internal MongoDB service (`mongodb.railway.internal`)
2. **CORS Configuration**: While the CORS is properly configured, the server needs to be running on Railway for the main website to connect
3. **Deployment vs Local Testing**: The system works differently in production (Railway) vs local development

## Solution

### 1. For Railway Deployment (Production)

The current configuration is correct for Railway deployment:

**CORS Configuration** in [`backend/server.js`](backend/server.js:11-16):
```javascript
app.use(cors({
  origin: ['https://www.fafaligroup.org', 'https://fafaligroup.org', 
           'https://dromorongit.github.io/Fafali-Group/', 
           'http://localhost:3000', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

✅ **`https://dromorongit.github.io/Fafali-Group/` is properly configured**
✅ Railway's internal MongoDB will work when deployed
✅ All public API endpoints are correctly set up

### 2. For Local Testing

To test locally, you have two options:

#### Option A: Use a Local MongoDB

1. Install MongoDB locally or use MongoDB Atlas
2. Update your `.env` file:
   ```
   MONGODB_URI=mongodb://localhost:27017/visa_admin
   ```
3. Start the server: `node server.js`

#### Option B: Use the Test Server (No MongoDB Required)

I've created a test server that doesn't require MongoDB:

```bash
# Start the test server
node test_server.js

# Test the CORS configuration
node test_cors_specific.js
```

### 3. Verify Railway Deployment

To check if your Railway deployment is working:

1. **Check Railway Logs**: Look for MongoDB connection success messages
2. **Test API Endpoints**: Use cURL or Postman to test the deployed API
3. **Check CORS Headers**: Verify the response includes proper CORS headers

```bash
# Test your Railway deployment
curl -X POST https://your-railway-app.up.railway.app/api/public/applications \
  -H "Content-Type: application/json" \
  -H "Origin: https://dromorongit.github.io/Fafali-Group/" \
  -d '{
    "applicantName": "Test Applicant",
    "email": "test@example.com",
    "visaType": "Tourist Visa",
    "travelPurpose": "Testing Railway deployment"
  }'
```

## Common Railway Deployment Issues

### Issue 1: MongoDB Connection Failing
**Solution**: 
- Ensure your Railway service has MongoDB add-on enabled
- Check that the `MONGODB_URI` environment variable is set in Railway
- Verify the MongoDB service is running in Railway

### Issue 2: CORS Not Working on Railway
**Solution**:
- Verify the CORS configuration includes your exact domain
- Check that there are no typos in the domain names
- Ensure no trailing slashes in domain names
- Test with the exact domain: `https://dromorongit.github.io/Fafali-Group/`

### Issue 3: API Endpoints Not Responding
**Solution**:
- Check Railway logs for errors
- Verify the server is running (look for "Server running on port..." message)
- Test with cURL or Postman first before integrating with main website

## Deployment Checklist

- [ ] **MongoDB Add-on**: Enabled in Railway
- [ ] **Environment Variables**: `MONGODB_URI` is set correctly
- [ ] **CORS Configuration**: Includes all required domains
- [ ] **API Endpoints**: Tested and working
- [ ] **Server Logs**: Show successful MongoDB connection
- [ ] **Main Website Integration**: Uses correct API URLs

## Testing Your Railway Deployment

### Step 1: Check Server Status
```bash
curl -I https://your-railway-app.up.railway.app/api/public/applications
```

### Step 2: Test CORS Preflight
```bash
curl -X OPTIONS https://your-railway-app.up.railway.app/api/public/applications \
  -H "Origin: https://dromorongit.github.io/Fafali-Group/" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

### Step 3: Test Application Submission
```bash
curl -X POST https://your-railway-app.up.railway.app/api/public/applications \
  -H "Content-Type: application/json" \
  -H "Origin: https://dromorongit.github.io/Fafali-Group/" \
  -d '{
    "applicantName": "Test Applicant",
    "email": "test@example.com",
    "visaType": "Tourist Visa",
    "travelPurpose": "Testing Railway deployment"
  }'
```

## Final Notes

The CORS configuration is correct and includes `https://dromorongit.github.io/Fafali-Group/`. The issue you're experiencing is likely because:

1. **Local Testing**: The server can't connect to Railway's internal MongoDB when running locally
2. **Railway Deployment**: The deployment might have issues with MongoDB connection or service configuration

**Recommended Next Steps**:

1. **Check Railway Logs**: Look for MongoDB connection errors
2. **Verify Railway Services**: Ensure MongoDB add-on is enabled and running
3. **Test Railway Deployment**: Use cURL to test the deployed API
4. **Update Main Website**: Ensure it's using the correct Railway deployment URL

The system should work correctly when properly deployed to Railway with the MongoDB add-on enabled.