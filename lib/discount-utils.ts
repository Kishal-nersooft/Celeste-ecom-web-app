// Utility functions for handling discount logic when backend pricing is not available

export interface ProductPricing {
  base_price: number;
  final_price: number;
  discount_applied: number;
  discount_percentage: number;
  applied_price_lists: string[];
}

export interface Product {
  id: number;
  name: string;
  base_price: number;
  pricing?: ProductPricing | null;
}

// No hardcoded data - all discount detection should come from backend API

/**
 * Check if a product is discounted based on pricing data
 */
export function isProductDiscounted(product: Product): boolean {
  if (!product.pricing) return false;
  return product.pricing.discount_applied > 0 || product.pricing.discount_percentage > 0;
}

/**
 * Get discount percentage for a product
 */
export function getDiscountPercentage(product: Product): number {
  if (product.pricing?.discount_percentage) {
    return Math.round(product.pricing.discount_percentage);
  }
  return 0;
}

/**
 * Check if a product should be considered discounted (based on backend pricing data only)
 * Note: This requires user authentication - anonymous users will see pricing: null
 */
export function shouldShowAsDiscounted(product: Product): boolean {
  // Only check if pricing data exists and shows discount
  // Anonymous users will have pricing: null, so no discounts will be shown
  return !!(product.pricing && isProductDiscounted(product));
}

/**
 * Get discount info for display (from backend pricing data only)
 */
export function getDiscountInfo(product: Product): {
  percentage: number;
  priceList: string;
  isKnown: boolean;
} {
  // Use real pricing data if available
  if (product.pricing && isProductDiscounted(product)) {
    return {
      percentage: Math.round(product.pricing.discount_percentage),
      priceList: product.pricing.applied_price_lists?.[0] || 'discount',
      isKnown: false
    };
  }
  
  // No fallback - return empty if no pricing data
  return {
    percentage: 0,
    priceList: '',
    isKnown: false
  };
}

/**
 * Filter products to show only discounted ones
 */
export function filterDiscountedProducts(products: Product[]): Product[] {
  return products.filter(shouldShowAsDiscounted);
}
