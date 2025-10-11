// Test script to verify that caching is working properly
// Run this in the browser console after the page loads

console.log('🧪 Testing Product Caching System...');

// Test function to check cache behavior
function testCacheBehavior() {
  console.log('\n📦 Cache Test Started');
  
  // Check if cache functions are available
  if (typeof window !== 'undefined' && window.localStorage) {
    const cacheData = localStorage.getItem('product-cache');
    if (cacheData) {
      try {
        const parsed = JSON.parse(cacheData);
        console.log('✅ Cache data found in localStorage:', parsed.length, 'entries');
        
        // Show cache entries
        parsed.forEach((entry, index) => {
          const [key, data] = entry;
          console.log(`📋 Cache Entry ${index + 1}:`, {
            key: key.substring(0, 100) + '...',
            timestamp: new Date(data.timestamp).toLocaleString(),
            productCount: data.data.length,
            age: Math.round((Date.now() - data.timestamp) / 1000) + 's ago'
          });
        });
      } catch (error) {
        console.error('❌ Error parsing cache data:', error);
      }
    } else {
      console.log('⚠️ No cache data found in localStorage');
    }
  } else {
    console.log('⚠️ localStorage not available');
  }
}

// Test function to monitor API calls
function monitorAPICalls() {
  console.log('\n🔍 Monitoring API Calls...');
  
  // Override console.log to catch API calls
  const originalLog = console.log;
  let apiCallCount = 0;
  let cacheHitCount = 0;
  
  console.log = function(...args) {
    const message = args.join(' ');
    
    if (message.includes('API - Fetching products from server:')) {
      apiCallCount++;
      console.warn(`🚨 API CALL #${apiCallCount}: ${message}`);
    } else if (message.includes('API - Using cached products:')) {
      cacheHitCount++;
      console.info(`✅ CACHE HIT #${cacheHitCount}: ${message}`);
    } else if (message.includes('useCachedProducts: Using cached')) {
      cacheHitCount++;
      console.info(`✅ HOOK CACHE HIT #${cacheHitCount}: ${message}`);
    } else if (message.includes('useCachedProducts: Fetching fresh')) {
      apiCallCount++;
      console.warn(`🚨 HOOK API CALL #${apiCallCount}: ${message}`);
    }
    
    originalLog.apply(console, args);
  };
  
  // Restore console.log after 30 seconds
  setTimeout(() => {
    console.log = originalLog;
    console.log(`\n📊 Test Results:`);
    console.log(`   API Calls: ${apiCallCount}`);
    console.log(`   Cache Hits: ${cacheHitCount}`);
    console.log(`   Cache Hit Rate: ${cacheHitCount > 0 ? Math.round((cacheHitCount / (apiCallCount + cacheHitCount)) * 100) : 0}%`);
  }, 30000);
  
  console.log('👀 Monitoring started for 30 seconds. Navigate between categories to test caching.');
}

// Test function to clear cache and test fresh loading
function testFreshLoading() {
  console.log('\n🧹 Testing Fresh Loading...');
  
  if (typeof window !== 'undefined' && window.localStorage) {
    // Clear cache
    localStorage.removeItem('product-cache');
    console.log('✅ Cache cleared');
    
    // Reload page to test fresh loading
    console.log('🔄 Reloading page to test fresh loading...');
    window.location.reload();
  }
}

// Export test functions
if (typeof window !== 'undefined') {
  window.cacheTest = {
    testCacheBehavior,
    monitorAPICalls,
    testFreshLoading
  };
  
  console.log('💡 Test functions available:');
  console.log('   cacheTest.testCacheBehavior() - Check current cache state');
  console.log('   cacheTest.monitorAPICalls() - Monitor API calls vs cache hits');
  console.log('   cacheTest.testFreshLoading() - Clear cache and reload');
  
  // Auto-run cache behavior test
  testCacheBehavior();
} else {
  console.log('⚠️ This test must be run in a browser environment');
}
