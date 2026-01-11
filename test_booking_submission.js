const axios = require('axios');

// Test script to simulate the exact booking submission from the frontend
async function testBookingSubmission() {
  console.log('🧪 Testing booking submission with exact frontend data...');
  
  try {
    // Test 1: Submit booking in the format the frontend sends (WRONG FORMAT)
    console.log('\n🔴 Test 1: Frontend format (should fail)');
    const frontendData = {
      serviceType: 'localTour',
      fullName: 'Henry Padi Nartey',
      email: 'hpdnarh@gmail.com',
      phone: '0500301282',
      tourDate: '2026-01-31',
      numberOfTravelers: 1,
      specialRequests: 'None'
    };
    
    console.log('Frontend data:', JSON.stringify(frontendData, null, 2));
    
    try {
      const response = await axios.post('http://localhost:5000/api/public/bookings', frontendData, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('❌ Unexpected success with frontend format:', response.data);
    } catch (error) {
      console.log('✅ Expected failure with frontend format:');
      console.log('  Status:', error.response?.status || 'No response');
      console.log('  Error:', error.response?.data || error.message);
    }
    
    // Test 2: Submit booking in the correct admin format (SHOULD WORK)
    console.log('\n🟢 Test 2: Admin format (should work)');
    const adminData = {
      customerName: 'Henry Padi Nartey',
      customerEmail: 'hpdnarh@gmail.com',
      customerPhone: '0500301282',
      tourName: 'Local Tour',
      departureDate: '2026-01-31T00:00:00.000Z',
      numberOfTravelers: 1,
      specialRequests: 'None'
    };
    
    console.log('Admin data:', JSON.stringify(adminData, null, 2));
    
    try {
      const response = await axios.post('http://localhost:5000/api/public/bookings', adminData, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('✅ Success with admin format:');
      console.log('  Status:', response.status);
      console.log('  Response:', response.data);
    } catch (error) {
      console.log('❌ Unexpected failure with admin format:');
      console.log('  Status:', error.response?.status || 'No response');
      console.log('  Error:', error.response?.data || error.message);
    }
    
    // Test 3: Test field mapping transformation
    console.log('\n🔧 Test 3: Field mapping transformation');
    
    function mapFrontendToAdmin(frontendData) {
      // Service type mapping
      const serviceTypeMapping = {
        'localTour': 'Local Tour',
        'internationalTour': 'International Tour',
        'airportTransfer': 'Airport Transfer',
        'hotelBooking': 'Hotel Booking',
        'customPackage': 'Custom Package'
      };
      
      // Date conversion
      const convertToISODate = (dateString) => {
        if (!dateString) return undefined;
        const date = new Date(dateString);
        return date.toISOString();
      };
      
      return {
        customerName: frontendData.fullName,
        customerEmail: frontendData.email,
        customerPhone: frontendData.phone,
        tourName: serviceTypeMapping[frontendData.serviceType] || frontendData.serviceType,
        departureDate: convertToISODate(frontendData.tourDate),
        numberOfTravelers: frontendData.numberOfTravelers || 1,
        specialRequests: frontendData.specialRequests || '',
        totalAmount: frontendData.totalAmount || 0
      };
    }
    
    const transformedData = mapFrontendToAdmin(frontendData);
    console.log('Transformed data:', JSON.stringify(transformedData, null, 2));
    
    try {
      const response = await axios.post('http://localhost:5000/api/public/bookings', transformedData, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('✅ Success with transformed data:');
      console.log('  Status:', response.status);
      console.log('  Response:', response.data);
    } catch (error) {
      console.log('❌ Failure with transformed data:');
      console.log('  Status:', error.response?.status || 'No response');
      console.log('  Error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Test script failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testBookingSubmission();
}

module.exports = testBookingSubmission;