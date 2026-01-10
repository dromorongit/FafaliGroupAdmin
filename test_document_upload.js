const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test script to verify document upload functionality
async function testDocumentUpload() {
  console.log('🧪 Starting document upload test...');
  
  try {
    // Create a test file
    const testFilePath = path.join(__dirname, 'test-document.txt');
    fs.writeFileSync(testFilePath, 'This is a test document for visa application');
    
    // Create form data
    const formData = new FormData();
    formData.append('document', fs.createReadStream(testFilePath));
    formData.append('referenceNumber', 'FAF-096472'); // Use the reference from the error
    formData.append('email', 'dromornarh@gmail.com'); // Use the email from the error
    formData.append('documentType', 'Passport Bio Page');
    
    console.log('📋 Test data:');
    console.log('  Reference Number:', 'FAF-096472');
    console.log('  Email:', 'dromornarh@gmail.com');
    console.log('  Document Type:', 'Passport Bio Page');
    console.log('  File:', 'test-document.txt');
    
    // Test the correct endpoint
    console.log('\n🌐 Testing correct endpoint: /api/public/documents/upload');
    const response1 = await axios.post('http://localhost:5000/api/public/documents/upload', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log('✅ Success with correct endpoint:');
    console.log('  Status:', response1.status);
    console.log('  Response:', response1.data);
    
    // Test the legacy endpoint
    console.log('\n🌐 Testing legacy endpoint: /api/upload/visa-document');
    const response2 = await axios.post('http://localhost:5000/api/upload/visa-document', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log('✅ Success with legacy endpoint:');
    console.log('  Status:', response2.status);
    console.log('  Response:', response2.data);
    
    // Clean up
    fs.unlinkSync(testFilePath);
    
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
  testDocumentUpload();
}

module.exports = testDocumentUpload;