// Test script for API connectivity with fallback
import ApiServiceWithFallback from './services/ApiServiceWithFallback';

async function testApiConnectivity() {
  console.log('🔍 Testing API connectivity with fallback...\n');
  
  try {
    // Test API health
    console.log('1. Testing API health...');
    const health = await ApiServiceWithFallback.testHealth();
    console.log('   Health result:', JSON.stringify(health, null, 2));
    
    // Get API status
    console.log('\n2. Getting API status...');
    const status = await ApiServiceWithFallback.getApiStatus();
    console.log('   API Status:', JSON.stringify(status, null, 2));
    
    // Test data retrieval with fallbacks
    console.log('\n3. Testing data retrieval...');
    
    console.log('\n   📱 Getting companies...');
    const companies = await ApiServiceWithFallback.getCompanies() as any[];
    console.log('   Companies:', Array.isArray(companies) ? companies.length : 'Not an array', 'items');
    
    console.log('\n   🎉 Getting events...');
    const events = await ApiServiceWithFallback.getEvents() as any[];
    console.log('   Events:', Array.isArray(events) ? events.length : 'Not an array', 'items');
    
    console.log('\n   📍 Getting locations...');
    const locations = await ApiServiceWithFallback.getLocations() as any[];
    console.log('   Locations:', Array.isArray(locations) ? locations.length : 'Not an array', 'items');
    
    console.log('\n   📅 Getting reservations...');
    const reservations = await ApiServiceWithFallback.getReservations() as any[];
    console.log('   Reservations:', Array.isArray(reservations) ? reservations.length : 'Not an array', 'items');
    
    console.log('\n✅ All tests completed successfully!');
    
    return {
      success: true,
      health,
      status,
      dataAvailable: {
        companies: Array.isArray(companies) ? companies.length : 0,
        events: Array.isArray(events) ? events.length : 0,
        locations: Array.isArray(locations) ? locations.length : 0,
        reservations: Array.isArray(reservations) ? reservations.length : 0
      }
    };
    
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in your app
export { testApiConnectivity };

// If running directly
if (require.main === module) {
  testApiConnectivity().then(result => {
    console.log('\n📊 Final Result:', JSON.stringify(result, null, 2));
  });
}
