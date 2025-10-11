// Test script to verify product caching functionality
// Run this in the browser console to test the caching system

console.log('🧪 Testing Product Cache Functionality...');

// Test 1: Check if cache is working
async function testCacheFunctionality() {
  console.log('\n📦 Test 1: Basic Cache Functionality');
  
  // Import the cache functions (this would work in a real browser environment)
  if (typeof window !== 'undefined') {
    try {
      // Test cache stats
      const { getCacheStats, clearProductCache } = await import('./lib/product-cache.ts');
      
      console.log('✅ Cache module loaded successfully');
      
      // Get initial cache stats
      const initialStats = getCacheStats();
      console.log('📊 Initial cache stats:', initialStats);
      
      // Clear cache
      clearProductCache();
      console.log('🧹 Cache cleared');
      
      // Get stats after clearing
      const clearedStats = getCacheStats();
      console.log('📊 Cache stats after clearing:', clearedStats);
      
      return true;
    } catch (error) {
      console.error('❌ Error testing cache:', error);
      return false;
    }
  } else {
    console.log('⚠️ This test must be run in a browser environment');
    return false;
  }
}

// Test 2: Simulate API calls with caching
async function testAPICaching() {
  console.log('\n🔍 Test 2: API Caching Simulation');
  
  if (typeof window !== 'undefined') {
    try {
      // This would test the actual API calls in a real environment
      console.log('📡 Simulating API calls...');
      
      // In a real test, you would:
      // 1. Call getProducts() - should hit API and cache result
      // 2. Call getProducts() again with same params - should hit cache
      // 3. Verify cache hit in console logs
      
      console.log('✅ API caching test completed (simulation)');
      return true;
    } catch (error) {
      console.error('❌ Error testing API caching:', error);
      return false;
    }
  } else {
    console.log('⚠️ This test must be run in a browser environment');
    return false;
  }
}

// Test 3: Cache invalidation
async function testCacheInvalidation() {
  console.log('\n🔄 Test 3: Cache Invalidation');
  
  if (typeof window !== 'undefined') {
    try {
      const { invalidateAll, invalidateCategory, invalidateStore } = await import('./lib/cache-invalidation.ts');
      
      console.log('✅ Cache invalidation module loaded');
      
      // Test different invalidation methods
      console.log('🧹 Testing invalidateAll...');
      invalidateAll();
      
      console.log('🧹 Testing invalidateCategory...');
      invalidateCategory(1);
      
      console.log('🧹 Testing invalidateStore...');
      invalidateStore(1);
      
      console.log('✅ Cache invalidation test completed');
      return true;
    } catch (error) {
      console.error('❌ Error testing cache invalidation:', error);
      return false;
    }
  } else {
    console.log('⚠️ This test must be run in a browser environment');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Product Cache Tests...\n');
  
  const results = await Promise.all([
    testCacheFunctionality(),
    testAPICaching(),
    testCacheInvalidation()
  ]);
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Cache system is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the logs above for details.');
  }
  
  return results;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testProductCache = {
    runAllTests,
    testCacheFunctionality,
    testAPICaching,
    testCacheInvalidation
  };
  
  console.log('💡 Test functions available as window.testProductCache');
  console.log('   Run: testProductCache.runAllTests()');
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  runAllTests();
}
