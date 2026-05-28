// Individual product pricing API functions
import { API_BASE_URL } from './api';

// Function to get individual product pricing (DISABLED - causes too many requests)
// This function is now disabled to prevent excessive API calls
// Use only for specific use cases where individual pricing is absolutely necessary
export async function getProductPricing(productId: number, tierId: number = 1, quantity: number = 1) {
  
  // Return null to indicate pricing is not available
  // This prevents the excessive API calls
  return null;
}
