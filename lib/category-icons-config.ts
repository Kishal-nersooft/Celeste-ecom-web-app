/**
 * Category Icons Configuration
 * 
 * Maps category names to their corresponding icon paths.
 * Icons are stored in /public/category-icons/
 * 
 * When adding new categories from the backend, add the mapping here.
 * The matching is case-insensitive and handles common variations.
 */

// Map of category names to icon paths
// Keys are lowercase for case-insensitive matching
export const CATEGORY_ICON_MAP: Record<string, string> = {
  // All category (special)
  "all": "/all_category_icon.png",
  
  // Deals category (special)
  "deals": "/category-icons/deals.png",
  "quick deals": "/category-icons/quick-deals.png", // 🔥💥 Quick Deals ⚡🛒
  "special offers": "/category-icons/special-offers.png",
  
  // Standard categories
  "baby products": "/category-icons/baby-products.png",
  "baby": "/category-icons/baby-products.png",
  
  "beverage": "/category-icons/beverage.png",
  "beverages": "/category-icons/beverage.png",
  
  "breads": "/category-icons/breads.png",
  "bread": "/category-icons/breads.png",
  "bakery": "/category-icons/breads.png",
  
  "cake & desserts": "/category-icons/cake-desserts.png",
  "cake and desserts": "/category-icons/cake-desserts.png",
  "cakes & desserts": "/category-icons/cake-desserts.png",
  "cakes and desserts": "/category-icons/cake-desserts.png",
  "desserts": "/category-icons/cake-desserts.png",
  "cakes": "/category-icons/cake-desserts.png",
  
  "celeste products": "/category-icons/celeste-products.png",
  "celeste-products": "/category-icons/celeste-products.png",
  
  "dairy, eggs and cheese": "/category-icons/dairy-eggs-cheese.png",
  "dairy eggs and cheese": "/category-icons/dairy-eggs-cheese.png",
  "dairy, eggs & cheese": "/category-icons/dairy-eggs-cheese.png",
  "dairy eggs cheese": "/category-icons/dairy-eggs-cheese.png",
  "dairy": "/category-icons/dairy-eggs-cheese.png",
  
  "electronics": "/category-icons/electronics.png",
  "electronic": "/category-icons/electronics.png",
  
  "energy boosters": "/category-icons/energy-boosters.png",
  "energy booster": "/category-icons/energy-boosters.png",
  "energy": "/category-icons/energy-boosters.png",
  
  "fresh flowers": "/category-icons/fresh-flowers.png",
  "flowers": "/category-icons/fresh-flowers.png",
  
  "fresh produce": "/category-icons/fresh-produce.png",
  "produce": "/category-icons/fresh-produce.png",
  "fruits & vegetables": "/category-icons/fresh-produce.png",
  "fruits and vegetables": "/category-icons/fresh-produce.png",
  
  "frozen products": "/category-icons/frozen-products.png",
  "frozen": "/category-icons/frozen-products.png",
  "frozen foods": "/category-icons/frozen-products.png",
  
  "household goods": "/category-icons/household-goods.png",
  "household good": "/category-icons/household-goods.png",
  "household": "/category-icons/household-goods.png",
  
  "ice creams": "/category-icons/ice-creams.png",
  "ice cream": "/category-icons/ice-creams.png",
  "ice creams & desserts": "/category-icons/ice-creams.png",
  "ice creams and desserts": "/category-icons/ice-creams.png",
  
  "magazines": "/category-icons/magazines.png",
  "magazine": "/category-icons/magazines.png",
  
  "pantry staples": "/category-icons/pantry-staples.png",
  "pantry staple": "/category-icons/pantry-staples.png",
  "pantry": "/category-icons/pantry-staples.png",
  
  "personal care": "/category-icons/personal-care.png",
  "personalcare": "/category-icons/personal-care.png",
  
  "pet products": "/category-icons/pet-products.png",
  "pet": "/category-icons/pet-products.png",
  "pets": "/category-icons/pet-products.png",
  
  "seafood, meat & cold cuts": "/category-icons/seafood-meat-cold-cuts.png",
  "seafood meat cold cuts": "/category-icons/seafood-meat-cold-cuts.png",
  "seafood, meat and cold cuts": "/category-icons/seafood-meat-cold-cuts.png",
  "seafood meat & cold cuts": "/category-icons/seafood-meat-cold-cuts.png",
  "meat": "/category-icons/seafood-meat-cold-cuts.png",
  "seafood": "/category-icons/seafood-meat-cold-cuts.png",
  
  "snacks & confectioneries": "/category-icons/snacks-confectioneries.png",
  "snacks and confectioneries": "/category-icons/snacks-confectioneries.png",
  "snacks": "/category-icons/snacks-confectioneries.png",
  "confectioneries": "/category-icons/snacks-confectioneries.png",
  
  "specialty products": "/category-icons/specialty-products.png",
  "specialty": "/category-icons/specialty-products.png",
  "speciality products": "/category-icons/specialty-products.png", // British spelling
  "speciality": "/category-icons/specialty-products.png", // British spelling
  
  "stationery": "/category-icons/stationery.png",
  "stationary": "/category-icons/stationery.png", // Common misspelling
  
  "tea, coffee, drinking chocolate": "/category-icons/tea-coffee-drinking-chocolate.png",
  "tea coffee drinking chocolate": "/category-icons/tea-coffee-drinking-chocolate.png",
  "tea, coffee & drinking chocolate": "/category-icons/tea-coffee-drinking-chocolate.png",
  "tea & coffee": "/category-icons/tea-coffee-drinking-chocolate.png",
  "tea and coffee": "/category-icons/tea-coffee-drinking-chocolate.png",
  "coffee": "/category-icons/tea-coffee-drinking-chocolate.png",
  "tea": "/category-icons/tea-coffee-drinking-chocolate.png",
};

/**
 * Get the icon path for a category name
 * @param categoryName - The name of the category
 * @returns The icon path or null if not found
 */
export function getCategoryIconPath(categoryName: string): string | null {
  if (!categoryName) return null;
  
  // Normalize the category name for matching
  // Remove emojis and extra whitespace for better matching
  const normalizedName = categoryName
    .toLowerCase()
    .trim()
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Direct match
  if (CATEGORY_ICON_MAP[normalizedName]) {
    return CATEGORY_ICON_MAP[normalizedName];
  }
  
  // Try to find a partial match - prefer LONGER key matches (more specific)
  // This ensures "ice creams & desserts" matches before just "desserts"
  let bestMatch: { key: string; path: string } | null = null;
  
  for (const [key, path] of Object.entries(CATEGORY_ICON_MAP)) {
    if (normalizedName.includes(key)) {
      // Prefer longer key matches (more specific)
      if (!bestMatch || key.length > bestMatch.key.length) {
        bestMatch = { key, path };
      }
    }
  }
  
  if (bestMatch) {
    return bestMatch.path;
  }
  
  // Fallback: check if any key contains the normalized name
  for (const [key, path] of Object.entries(CATEGORY_ICON_MAP)) {
    if (key.includes(normalizedName)) {
      return path;
    }
  }
  
  return null;
}

/**
 * Check if a category has a custom icon
 * @param categoryName - The name of the category
 * @returns true if the category has a custom icon
 */
export function hasCategoryIcon(categoryName: string): boolean {
  return getCategoryIconPath(categoryName) !== null;
}
