/**
 * Configuration for Popular Products
 * 
 * Change the mode here to switch between different popularity ranking modes:
 * - 'trending': Time-decayed recent activity (default)
 * - 'most_viewed': Most viewed products
 * - 'most_carted': Most added to cart
 * - 'most_ordered': Best sellers
 * - 'most_searched': Most searched products
 * - 'overall': Overall popularity score
 */
export const POPULAR_PRODUCTS_MODE: 'trending' | 'most_viewed' | 'most_carted' | 'most_ordered' | 'most_searched' | 'overall' = 'most_viewed';

