// Utility functions for address management

/**
 * Clear all stale address data from localStorage
 * This should be called when the database is cleaned or when address validation fails
 */
export function clearStaleAddressData(): void {
  if (typeof window === 'undefined') return;
  
  console.log('🧹 Clearing stale address data from localStorage...');
  
  // Clear all address-related localStorage keys
  const keysToRemove = [
    'cart-store',
    'location-context',
    'address-context',
    'selected-address',
    'default-address',
    'user-addresses',
    'location-data'
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear any other keys that might contain address data
  Object.keys(localStorage).forEach(key => {
    if (key.includes('address') || key.includes('location') || key.includes('cart')) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('✅ Stale address data cleared');
}

/**
 * Validate if an address ID exists and belongs to the current user
 */
export async function validateAddressOwnership(addressId: number): Promise<boolean> {
  try {
    const { getUserAddresses } = await import('./api');
    const addresses = await getUserAddresses();
    
    if (!addresses || !Array.isArray(addresses)) {
      console.log('❌ No addresses found or invalid response');
      return false;
    }
    
    const addressExists = addresses.some(addr => addr.id === addressId);
    console.log(`🔍 Address ${addressId} exists:`, addressExists);
    
    return addressExists;
  } catch (error) {
    console.error('❌ Error validating address ownership:', error);
    return false;
  }
}

/**
 * Get a valid address ID for the current user
 * Returns the first available address ID or null if none exist
 */
export async function getValidAddressId(): Promise<number | null> {
  try {
    const { getUserAddresses } = await import('./api');
    const addresses = await getUserAddresses();
    
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      console.log('❌ No addresses found for user');
      return null;
    }
    
    // Find default address first, then any address
    const defaultAddress = addresses.find(addr => addr.is_default);
    const validAddress = defaultAddress || addresses[0];
    
    console.log(`✅ Found valid address ID: ${validAddress.id}`);
    return validAddress.id;
  } catch (error) {
    console.error('❌ Error getting valid address ID:', error);
    return null;
  }
}

/**
 * Handle address validation errors
 * Clears stale data and forces address re-selection
 */
export function handleAddressValidationError(): void {
  console.log('🔄 Handling address validation error...');
  
  // Clear stale data
  clearStaleAddressData();
  
  // Dispatch event to notify components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('addressValidationError'));
  }
  
  // Show user notification
  if (typeof window !== 'undefined') {
    alert('Address data has been cleared. Please select your address again.');
  }
}

/**
 * Check if address data needs to be refreshed
 * Returns true if localStorage contains stale data
 */
export function needsAddressRefresh(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if we have any address-related data in localStorage
  const hasAddressData = Object.keys(localStorage).some(key => 
    key.includes('address') || key.includes('location')
  );
  
  return hasAddressData;
}
