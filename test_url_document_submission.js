const axios = require('axios');

// Test script for URL-based document submission
async function testUrlDocumentSubmission() {
  console.log('🧪 Starting URL-based document submission test...');
  
  try {
    // Test data matching the error scenario
    const testData = {
      referenceNumber: 'FAF-096472', // From the error logs
      email: 'dromornarh@gmail.com', // From the error logs
      documentType: 'passport_bio_page', // Updated to use new enum value
      cloudinaryUrl: 'https://res.cloudinary.com/dzngjsqpe/image/upload/v1768080339/visa_documents/tme86tupfk7bmhh1paoo.jpg', // From the error logs
      cloudinaryPublicId: 'visa_documents/tme86tupfk7bmhh1paoo'
    };
    
    console.log('📋 Test data:');
    console.log(JSON.stringify(testData, null, 2));
    
    // Test the URL submission endpoint
    console.log('\n🌐 Testing URL submission endpoint: /api/public/documents/url-submit');
    
    const response = await axios.post('http://localhost:5000/api/public/documents/url-submit', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success:');
    console.log('  Status:', response.status);
    console.log('  Response:', JSON.stringify(response.data, null, 2));
    
    // Test missing fields scenarios
    console.log('\n🔍 Testing validation scenarios...');
    
    // Test missing reference number
    const missingRef = {...testData};
    delete missingRef.referenceNumber;
    try {
      await axios.post('http://localhost:5000/api/public/documents/url-submit', missingRef);
    } catch (error) {
      console.log('✅ Missing reference number validation works:');
      console.log('  Status:', error.response.status);
      console.log('  Error:', error.response.data.message);
    }
    
    // Test missing cloudinaryUrl
    const missingUrl = {...testData};
    delete missingUrl.cloudinaryUrl;
    try {
      await axios.post('http://localhost:5000/api/public/documents/url-submit', missingUrl);
    } catch (error) {
      console.log('✅ Missing URL validation works:');
      console.log('  Status:', error.response.status);
      console.log('  Error:', error.response.data.message);
    }
    
    // Test invalid application
    const invalidApp = {
      ...testData,
      referenceNumber: 'INVALID-REF',
      email: 'nonexistent@example.com'
    };
    try {
      await axios.post('http://localhost:5000/api/public/documents/url-submit', invalidApp);
    } catch (error) {
      console.log('✅ Invalid application validation works:');
      console.log('  Status:', error.response.status);
      console.log('  Error:', error.response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    } else {
      console.error('  Error:', error.message);
    }
  }
}

// Run the test
if (require.main === module) {
  testUrlDocumentSubmission();
}

module.exports = testUrlDocumentSubmission;