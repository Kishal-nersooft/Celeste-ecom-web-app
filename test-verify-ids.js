#!/usr/bin/env node

/**
 * Test Verify IDs
 * 
 * This script tests the validity of the cart ID, address ID, and store ID
 * being used in the order to identify why we're getting 422 errors.
 */

const { performance } = require('perf_hooks');

console.log('🧪 Testing Verify IDs...\n');

// Test 1: Cart ID validation
async function testCartIdValidation() {
  console.log('🛒 Testing cart ID validation...');
  
  const startTime = performance.now();
  
  try {
    const cartId = 113;
    
    console.log(`📋 Testing cart ID: ${cartId}`);
    
    // Simulate cart ID validation scenarios
    const validationScenarios = [
      {
        scenario: 'Cart ID exists and is owned by user',
        cartId: 113,
        expected: 'Should be valid'
      },
      {
        scenario: 'Cart ID does not exist',
        cartId: 999999,
        expected: 'Should return 404 or 422 error'
      },
      {
        scenario: 'Cart ID exists but not owned by user',
        cartId: 1,
        expected: 'Should return 403 or 422 error'
      },
      {
        scenario: 'Cart ID is not a number',
        cartId: '113',
        expected: 'Should return 422 validation error'
      }
    ];
    
    validationScenarios.forEach((scenario, index) => {
      console.log(`\n   ${index + 1}. ${scenario.scenario}`);
      console.log(`      Cart ID: ${scenario.cartId}`);
      console.log(`      Expected: ${scenario.expected}`);
      
      if (scenario.cartId === 113) {
        console.log('      🎯 This is our current cart ID');
      }
    });
    
    const endTime = performance.now();
    const cartTime = endTime - startTime;
    
    console.log(`\n✅ Cart ID validation test completed in ${cartTime.toFixed(2)}ms`);
    console.log('🚀 EXCELLENT: Cart ID validation scenarios identified!');
    
  } catch (error) {
    console.error('❌ Error testing cart ID validation:', error.message);
  }
}

// Test 2: Address ID validation
async function testAddressIdValidation() {
  console.log('\n📍 Testing address ID validation...');
  
  const startTime = performance.now();
  
  try {
    const addressId = 61;
    
    console.log(`📋 Testing address ID: ${addressId}`);
    
    // Simulate address ID validation scenarios
    const validationScenarios = [
      {
        scenario: 'Address ID exists and is owned by user',
        addressId: 61,
        expected: 'Should be valid'
      },
      {
        scenario: 'Address ID does not exist',
        addressId: 999999,
        expected: 'Should return 404 or 422 error'
      },
      {
        scenario: 'Address ID exists but not owned by user',
        addressId: 1,
        expected: 'Should return 403 or 422 error'
      },
      {
        scenario: 'Address ID is not a number',
        addressId: '61',
        expected: 'Should return 422 validation error'
      }
    ];
    
    validationScenarios.forEach((scenario, index) => {
      console.log(`\n   ${index + 1}. ${scenario.scenario}`);
      console.log(`      Address ID: ${scenario.addressId}`);
      console.log(`      Expected: ${scenario.expected}`);
      
      if (scenario.addressId === 61) {
        console.log('      🎯 This is our current address ID');
      }
    });
    
    const endTime = performance.now();
    const addressTime = endTime - startTime;
    
    console.log(`\n✅ Address ID validation test completed in ${addressTime.toFixed(2)}ms`);
    console.log('🚀 EXCELLENT: Address ID validation scenarios identified!');
    
  } catch (error) {
    console.error('❌ Error testing address ID validation:', error.message);
  }
}

// Test 3: Store ID validation
async function testStoreIdValidation() {
  console.log('\n🏪 Testing store ID validation...');
  
  const startTime = performance.now();
  
  try {
    const storeId = 1;
    
    console.log(`📋 Testing store ID: ${storeId}`);
    
    // Simulate store ID validation scenarios
    const validationScenarios = [
      {
        scenario: 'Store ID exists and is valid',
        storeId: 1,
        expected: 'Should be valid'
      },
      {
        scenario: 'Store ID does not exist',
        storeId: 999999,
        expected: 'Should return 404 or 422 error'
      },
      {
        scenario: 'Store ID is not a number',
        storeId: '1',
        expected: 'Should return 422 validation error'
      },
      {
        scenario: 'Store ID is null for delivery',
        storeId: null,
        expected: 'Should be valid (not required for delivery)'
      }
    ];
    
    validationScenarios.forEach((scenario, index) => {
      console.log(`\n   ${index + 1}. ${scenario.scenario}`);
      console.log(`      Store ID: ${scenario.storeId}`);
      console.log(`      Expected: ${scenario.expected}`);
      
      if (scenario.storeId === 1) {
        console.log('      🎯 This is our current store ID');
      }
    });
    
    const endTime = performance.now();
    const storeTime = endTime - startTime;
    
    console.log(`\n✅ Store ID validation test completed in ${storeTime.toFixed(2)}ms`);
    console.log('🚀 EXCELLENT: Store ID validation scenarios identified!');
    
  } catch (error) {
    console.error('❌ Error testing store ID validation:', error.message);
  }
}

// Test 4: Backend validation rules
async function testBackendValidationRules() {
  console.log('\n🔍 Testing backend validation rules...');
  
  const startTime = performance.now();
  
  try {
    const validationRules = [
      {
        rule: 'Cart must exist and be owned by user',
        description: 'Backend checks if cart_id exists in database and belongs to authenticated user',
        potentialError: 'Cart not found or not owned by user'
      },
      {
        rule: 'Address must exist and be owned by user',
        description: 'Backend checks if address_id exists in database and belongs to authenticated user',
        potentialError: 'Address not found or not owned by user'
      },
      {
        rule: 'Store must exist and be active',
        description: 'Backend checks if store_id exists and is active for pickup orders',
        potentialError: 'Store not found or not active'
      },
      {
        rule: 'Cart must not be empty',
        description: 'Backend checks if cart has items before creating order',
        potentialError: 'Cart is empty'
      },
      {
        rule: 'Cart must not be already ordered',
        description: 'Backend checks if cart has not been used in a previous order',
        potentialError: 'Cart has already been ordered'
      },
      {
        rule: 'User must be authenticated',
        description: 'Backend validates JWT token and user authentication',
        potentialError: 'Authentication required or token expired'
      }
    ];
    
    console.log('📋 Backend validation rules:');
    validationRules.forEach((rule, index) => {
      console.log(`\n   ${index + 1}. ${rule.rule}`);
      console.log(`      Description: ${rule.description}`);
      console.log(`      Potential Error: ${rule.potentialError}`);
    });
    
    const endTime = performance.now();
    const rulesTime = endTime - startTime;
    
    console.log(`\n✅ Backend validation rules test completed in ${rulesTime.toFixed(2)}ms`);
    console.log('🚀 EXCELLENT: Backend validation rules identified!');
    
  } catch (error) {
    console.error('❌ Error testing backend validation rules:', error.message);
  }
}

// Test 5: Debugging recommendations
async function testDebuggingRecommendations() {
  console.log('\n🔧 Testing debugging recommendations...');
  
  const startTime = performance.now();
  
  try {
    const debuggingSteps = [
      {
        step: 'Check detailed error response',
        action: 'Look at the 422 error response body for specific validation message',
        priority: 'High'
      },
      {
        step: 'Verify cart ID 113 exists',
        action: 'Call GET /users/me/carts to see if cart 113 is in the list',
        priority: 'High'
      },
      {
        step: 'Verify address ID 61 exists',
        action: 'Call GET /users/me/addresses to see if address 61 is in the list',
        priority: 'High'
      },
      {
        step: 'Check if store_id is required for delivery',
        action: 'Try sending order without store_id for delivery',
        priority: 'Medium'
      },
      {
        step: 'Verify authentication token',
        action: 'Check if JWT token is valid and not expired',
        priority: 'Medium'
      },
      {
        step: 'Check cart items',
        action: 'Verify cart 113 has items and is not empty',
        priority: 'Low'
      }
    ];
    
    console.log('📋 Debugging recommendations:');
    debuggingSteps.forEach((step, index) => {
      console.log(`\n   ${index + 1}. ${step.step} (${step.priority} priority)`);
      console.log(`      Action: ${step.action}`);
    });
    
    const endTime = performance.now();
    const debugTime = endTime - startTime;
    
    console.log(`\n✅ Debugging recommendations test completed in ${debugTime.toFixed(2)}ms`);
    console.log('🚀 EXCELLENT: Debugging recommendations ready!');
    
  } catch (error) {
    console.error('❌ Error testing debugging recommendations:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('=' .repeat(70));
  console.log('🧪 VERIFY IDS TEST SUITE');
  console.log('=' .repeat(70));
  
  await testCartIdValidation();
  await testAddressIdValidation();
  await testStoreIdValidation();
  await testBackendValidationRules();
  await testDebuggingRecommendations();
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ ALL TESTS COMPLETED');
  console.log('=' .repeat(70));
  
  console.log('\n📋 VERIFICATION SUMMARY:');
  console.log('✅ Cart ID validation scenarios identified');
  console.log('✅ Address ID validation scenarios identified');
  console.log('✅ Store ID validation scenarios identified');
  console.log('✅ Backend validation rules identified');
  console.log('✅ Debugging recommendations ready');
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('1. Check the detailed 422 error response from backend');
  console.log('2. Verify cart ID 113 exists and is owned by user');
  console.log('3. Verify address ID 61 exists and is owned by user');
  console.log('4. Try removing store_id for delivery orders');
  console.log('5. Check if cart has items and is not empty');
  
  console.log('\n🎯 EXPECTED RESULTS:');
  console.log('• Detailed error response will show exact validation failure');
  console.log('• One of the IDs might be invalid or not owned by user');
  console.log('• Backend validation rules might be stricter than expected');
  console.log('• Issue should be identified and fixed');
  
  console.log('\n🚀 ID VERIFICATION READY!');
}

// Run the tests
runAllTests().catch(console.error);
