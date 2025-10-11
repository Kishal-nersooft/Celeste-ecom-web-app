// Individual product pricing API functions
const API_BASE_URL = "https://celeste-api-846811285865.us-central1.run.app";

// Function to get individual product pricing (DISABLED - causes too many requests)
// This function is now disabled to prevent excessive API calls
// Use only for specific use cases where individual pricing is absolutely necessary
export async function getProductPricing(productId: number, tierId: number = 1, quantity: number = 1) {
  console.log(`⚠️ Individual product pricing disabled to prevent excessive API calls`);
  console.log(`📦 Product ID: ${productId}, Tier: ${tierId}, Quantity: ${quantity}`);
  
  // Return null to indicate pricing is not available
  // This prevents the excessive API calls
  return null;
}
