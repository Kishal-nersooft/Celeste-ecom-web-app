// Test script for POST /users/me/carts endpoint
// Run with: node test-cart-creation.js

const API_BASE_URL = 'http://localhost:3000';

async function testCartCreation() {
  console.log('🧪 Testing POST /users/me/carts endpoint...\n');

  // Test 1: Valid cart creation
  console.log('Test 1: Valid cart creation');
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/me/carts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Replace with real token for actual testing
      },
      body: JSON.stringify({
        name: 'Test Cart',
        description: 'This is a test cart'
      })
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Missing name validation
  console.log('Test 2: Missing name validation');
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/me/carts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        description: 'Cart without name'
      })
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Invalid description type
  console.log('Test 3: Invalid description type');
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/me/carts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        name: 'Test Cart',
        description: 123 // Invalid type
      })
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Missing authorization
  console.log('Test 4: Missing authorization');
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/me/carts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Cart',
        description: 'Test description'
      })
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: Invalid JSON
  console.log('Test 5: Invalid JSON');
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/me/carts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: 'invalid json'
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the tests
testCartCreation().catch(console.error);
