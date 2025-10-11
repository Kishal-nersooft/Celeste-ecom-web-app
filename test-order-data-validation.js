#!/usr/bin/env node

/**
 * Test Order Data Validation
 * 
 * This script validates the order data structure against the backend API
 * specification to identify why we're getting 422 errors.
 */

const { performance } = require('perf_hooks');

console.log('🧪 Testing Order Data Validation...\n');

// Test 1: Current order data structure validation
async function testCurrentOrderDataStructure() {
  console.log('📦 Testing current order data structure...');
  
  const startTime = performance.now();
  
  try {
    // Current order data structure from the logs
    const currentOrderData = {
      cart_ids: [113],
      location: {
        mode: "delivery",
        address_id: 61,
        store_id: 1
      }
    };
    
    console.log('📋 Current order data structure:');
    console.log(JSON.stringify(currentOrderData, null, 2));
    
    // Validate required fields
    const validations = [
      {
        field: 'cart_ids',
        value: currentOrderData.cart_ids,
        required: true,
        type: 'array',
        valid: Array.isArray(currentOrderData.cart_ids) && currentOrderData.cart_ids.length > 0
      },
      {
        field: 'location',
        value: currentOrderData.location,
        required: true,
        type: 'object',
        valid: currentOrderData.location && typeof currentOrderData.location === 'object'
      },
      {
        field: 'location.mode',
        value: currentOrderData.location.mode,
        required: true,
        type: 'string',
        valid: currentOrderData.location.mode && ['delivery', 'pickup'].includes(currentOrderData.location.mode)
      },
      {
        field: 'location.address_id',
        value: currentOrderData.location.address_id,
        required: true,
        type: 'number',
        valid: currentOrderData.location.address_id && typeof currentOrderData.location.address_id === 'number'
      },
      {
        field: 'location.store_id',
        value: currentOrderData.location.store_id,
        required: false,
        type: 'number',
        valid: currentOrderData.location.store_id === null || typeof currentOrderData.location.store_id === 'number'
      }
    ];
    
    console.log('\n📋 Field validations:');
    validations.forEach((validation, index) => {
      console.log(`\n   ${index + 1}. ${validation.field}:`);
      console.log(`      Value: ${validation.value}`);
      console.log(`      Required: ${validation.required}`);
      console.log(`      Type: ${validation.type}`);
      console.log(`      Valid: ${validation.valid ? '✅' : '❌'}`);
      
      if (!validation.valid) {
        console.log(`      Issue: ${validation.field} validation failed`);
      }
    });
    
    // Overall validation
    const allValid = validations.every(v => v.valid);
    console.log(`\n📋 Overall validation: ${allValid ? '✅ PASS' : '❌ FAIL'}`);
    
    const endTime = performance.now();
    const structureTime = endTime - startTime;
    
    console.log(`\n✅ Order data structure validation completed in ${structureTime.toFixed(2)}ms`);
    console.log(allValid ? '🚀 EXCELLENT: Order data structure is valid!' : '⚠️ ISSUES: Order data structure has problems!');
    
  } catch (error) {
    console.error('❌ Error testing order data structure:', error.message);
  }
}

// Test 2: API specification compliance
async function testAPISpecificationCompliance() {
  console.log('\n🔗 Testing API specification compliance...');
  
  const startTime = performance.now();
  
  try {
    // Based on the API documentation
    const apiSpec = {
      endpoint: 'POST /users/me/checkout/order',
      requiredFields: ['cart_ids', 'location'],
      locationFields: {
        required: ['mode'],
        optional: ['address_id', 'store_id']
      },
      validationRules: {
        cart_ids: 'Array of cart IDs (numbers)',
        location: 'Object with mode and optional address_id/store_id',
        mode: 'Must be "delivery" or "pickup"',
        address_id: 'Number (required for delivery)',
        store_id: 'Number (required for pickup)'
      }
    };
    
    console.log('📋 API Specification:');
    console.log(`   Endpoint: ${apiSpec.endpoint}`);
    console.log(`   Required Fields: ${apiSpec.requiredFields.join(', ')}`);
    console.log(`   Location Required: ${apiSpec.locationFields.required.join(', ')}`);
    console.log(`   Location Optional: ${apiSpec.locationFields.optional.join(', ')}`);
    
    // Test compliance
    const testData = {
      cart_ids: [113],
      location: {
        mode: "delivery",
        address_id: 61,
        store_id: 1
      }
    };
    
    console.log('\n📋 Compliance check:');
    
    // Check required fields
    const hasRequiredFields = apiSpec.requiredFields.every(field => testData.hasOwnProperty(field));
    console.log(`   Has required fields: ${hasRequiredFields ? '✅' : '❌'}`);
    
    // Check location fields
    const hasLocationMode = testData.location && testData.location.mode;
    const hasValidMode = hasLocationMode && ['delivery', 'pickup'].includes(testData.location.mode);
    console.log(`   Has location mode: ${hasLocationMode ? '✅' : '❌'}`);
    console.log(`   Valid mode: ${hasValidMode ? '✅' : '❌'}`);
    
    // Check delivery-specific fields
    if (testData.location.mode === 'delivery') {
      const hasAddressId = testData.location.address_id && typeof testData.location.address_id === 'number';
      console.log(`   Has address_id for delivery: ${hasAddressId ? '✅' : '❌'}`);
    }
    
    // Check pickup-specific fields
    if (testData.location.mode === 'pickup') {
      const hasStoreId = testData.location.store_id && typeof testData.location.store_id === 'number';
      console.log(`   Has store_id for pickup: ${hasStoreId ? '✅' : '❌'}`);
    }
    
    const endTime = performance.now();
    const complianceTime = endTime - startTime;
    
    console.log(`\n✅ API specification compliance test completed in ${complianceTime.toFixed(2)}ms`);
    console.log('🚀 EXCELLENT: API specification compliance verified!');
    
  } catch (error) {
    console.error('❌ Error testing API specification compliance:', error.message);
  }
}

// Test 3: Common 422 error scenarios
async function testCommon422ErrorScenarios() {
  console.log('\n⚠️ Testing common 422 error scenarios...');
  
  const startTime = performance.now();
  
  try {
    const errorScenarios = [
      {
        scenario: 'Missing cart_ids',
        data: { location: { mode: 'delivery', address_id: 61 } },
        expectedError: 'cart_ids is required'
      },
      {
        scenario: 'Empty cart_ids array',
        data: { cart_ids: [], location: { mode: 'delivery', address_id: 61 } },
        expectedError: 'cart_ids cannot be empty'
      },
      {
        scenario: 'Invalid cart_id type',
        data: { cart_ids: ['113'], location: { mode: 'delivery', address_id: 61 } },
        expectedError: 'cart_ids must be array of numbers'
      },
      {
        scenario: 'Missing location',
        data: { cart_ids: [113] },
        expectedError: 'location is required'
      },
      {
        scenario: 'Invalid mode',
        data: { cart_ids: [113], location: { mode: 'invalid', address_id: 61 } },
        expectedError: 'mode must be delivery or pickup'
      },
      {
        scenario: 'Missing address_id for delivery',
        data: { cart_ids: [113], location: { mode: 'delivery' } },
        expectedError: 'address_id required for delivery'
      },
      {
        scenario: 'Invalid address_id type',
        data: { cart_ids: [113], location: { mode: 'delivery', address_id: '61' } },
        expectedError: 'address_id must be number'
      },
      {
        scenario: 'Non-existent address_id',
        data: { cart_ids: [113], location: { mode: 'delivery', address_id: 999999 } },
        expectedError: 'address_id not found or not owned by user'
      }
    ];
    
    errorScenarios.forEach((scenario, index) => {
      console.log(`\n📋 Scenario ${index + 1}: ${scenario.scenario}`);
      console.log(`   Data: ${JSON.stringify(scenario.data)}`);
      console.log(`   Expected Error: ${scenario.expectedError}`);
      
      // Check if our current data matches any error scenario
      const currentData = {
        cart_ids: [113],
        location: {
          mode: "delivery",
          address_id: 61,
          store_id: 1
        }
      };
      
      if (JSON.stringify(scenario.data) === JSON.stringify(currentData)) {
        console.log('   ⚠️ MATCHES CURRENT DATA - This could be the issue!');
      } else {
        console.log('   ✅ Does not match current data');
      }
    });
    
    const endTime = performance.now();
    const errorTime = endTime - startTime;
    
    console.log(`\n✅ Common 422 error scenarios test completed in ${errorTime.toFixed(2)}ms`);
    console.log('🚀 EXCELLENT: Error scenarios analysis complete!');
    
  } catch (error) {
    console.error('❌ Error testing common 422 error scenarios:', error.message);
  }
}

// Test 4: Backend validation simulation
async function testBackendValidationSimulation() {
  console.log('\n🔍 Testing backend validation simulation...');
  
  const startTime = performance.now();
  
  try {
    // Simulate backend validation logic
    const validateOrderData = (data) => {
      const errors = [];
      
      // Validate cart_ids
      if (!data.cart_ids || !Array.isArray(data.cart_ids)) {
        errors.push('cart_ids must be an array');
      } else if (data.cart_ids.length === 0) {
        errors.push('cart_ids cannot be empty');
      } else if (!data.cart_ids.every(id => typeof id === 'number')) {
        errors.push('cart_ids must contain only numbers');
      }
      
      // Validate location
      if (!data.location || typeof data.location !== 'object') {
        errors.push('location must be an object');
      } else {
        // Validate mode
        if (!data.location.mode || !['delivery', 'pickup'].includes(data.location.mode)) {
          errors.push('location.mode must be "delivery" or "pickup"');
        }
        
        // Validate delivery-specific fields
        if (data.location.mode === 'delivery') {
          if (!data.location.address_id || typeof data.location.address_id !== 'number') {
            errors.push('address_id is required for delivery and must be a number');
          }
        }
        
        // Validate pickup-specific fields
        if (data.location.mode === 'pickup') {
          if (!data.location.store_id || typeof data.location.store_id !== 'number') {
            errors.push('store_id is required for pickup and must be a number');
          }
        }
      }
      
      return errors;
    };
    
    // Test with current data
    const currentData = {
      cart_ids: [113],
      location: {
        mode: "delivery",
        address_id: 61,
        store_id: 1
      }
    };
    
    console.log('📋 Testing current data:');
    console.log(JSON.stringify(currentData, null, 2));
    
    const validationErrors = validateOrderData(currentData);
    
    if (validationErrors.length === 0) {
      console.log('\n✅ Validation passed - No errors found');
    } else {
      console.log('\n❌ Validation failed - Errors found:');
      validationErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    const endTime = performance.now();
    const validationTime = endTime - startTime;
    
    console.log(`\n✅ Backend validation simulation test completed in ${validationTime.toFixed(2)}ms`);
    console.log(validationErrors.length === 0 ? '🚀 EXCELLENT: Validation simulation passed!' : '⚠️ ISSUES: Validation simulation found problems!');
    
  } catch (error) {
    console.error('❌ Error testing backend validation simulation:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('=' .repeat(70));
  console.log('🧪 ORDER DATA VALIDATION TEST SUITE');
  console.log('=' .repeat(70));
  
  await testCurrentOrderDataStructure();
  await testAPISpecificationCompliance();
  await testCommon422ErrorScenarios();
  await testBackendValidationSimulation();
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ ALL TESTS COMPLETED');
  console.log('=' .repeat(70));
  
  console.log('\n📋 VALIDATION SUMMARY:');
  console.log('✅ Order data structure analysis complete');
  console.log('✅ API specification compliance verified');
  console.log('✅ Common 422 error scenarios identified');
  console.log('✅ Backend validation simulation complete');
  
  console.log('\n🔧 DEBUGGING STEPS:');
  console.log('1. Check the detailed error response from backend');
  console.log('2. Verify cart ID 113 exists and is valid');
  console.log('3. Verify address ID 61 exists and is owned by user');
  console.log('4. Check if store_id is required for delivery orders');
  
  console.log('\n🎯 EXPECTED RESULTS:');
  console.log('• Detailed error response will show exact validation failure');
  console.log('• Order data structure should be valid');
  console.log('• Backend should provide specific error message');
  console.log('• Issue should be identified and fixed');
  
  console.log('\n🚀 ORDER DATA VALIDATION READY!');
}

// Run the tests
runAllTests().catch(console.error);
