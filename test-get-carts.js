// Test script for GET /users/me/carts endpoint
// Run with: node test-get-carts.js

const API_BASE_URL = 'http://localhost:3000';

async function testGetCarts() {
  console.log('🧪 Testing GET /users/me/carts endpoint...\n');

  // Test 1: Valid request with authorization
  console.log('Test 1: Valid request with authorization');
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/me/carts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Replace with real token for actual testing
      }
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    // Validate response structure
    if (data.owned_carts && Array.isArray(data.owned_carts) && 
        data.shared_carts && Array.isArray(data.shared_carts)) {
      console.log('✅ Response structure is correct');
    } else {
      console.log('❌ Response structure is incorrect');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Missing authorization
  console.log('Test 2: Missing authorization');
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/me/carts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Invalid authorization token
  console.log('Test 3: Invalid authorization token');
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/me/carts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      }
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Test with query parameters (should be ignored)
  console.log('Test 4: Request with query parameters');
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/me/carts?test=value`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Test the client-side function
async function testClientFunction() {
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('🧪 Testing client-side getUserCarts function...\n');

  // This would require the actual client-side environment
  // For now, we'll just show how it would be used
  console.log('Usage example:');
  console.log(`
import { getUserCarts } from '@/lib/api';

try {
  const carts = await getUserCarts();
  console.log('Owned carts:', carts.owned_carts);
  console.log('Shared carts:', carts.shared_carts);
} catch (error) {
  console.error('Error fetching carts:', error.message);
}
  `);
}

// Run the tests
testGetCarts()
  .then(() => testClientFunction())
  .catch(console.error);
