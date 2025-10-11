// Product caching system for local storage
// This prevents unnecessary API calls when navigating between pages

interface CachedProduct {
  id: number;
  name: string;
  description?: string;
  price?: number;
  image_url?: string;
  category_id?: number;
  store_id?: number;
  pricing?: any;
  inventory?: any;
  categories?: any[];
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface CacheEntry {
  data: CachedProduct[];
  timestamp: number;
  params: string; // Serialized parameters for cache key
}

interface CacheConfig {
  maxAge: number; // Cache validity in milliseconds (default: 5 minutes)
  maxSize: number; // Maximum number of cache entries
}

class ProductCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig = {
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxSize: 50 // Maximum 50 different cache entries
  };

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.loadFromStorage();
  }

  // Generate cache key from parameters
  private generateCacheKey(params: {
    categoryIds?: number[] | null;
    page?: number;
    pageSize?: number;
    onlyDiscounted?: boolean;
    includeCategories?: boolean;
    includePricing?: boolean;
    includeInventory?: boolean;
    storeIds?: number[];
    latitude?: number;
    longitude?: number;
  }): string {
    const key = {
      categoryIds: params.categoryIds?.sort() || null,
      page: params.page || 1,
      pageSize: params.pageSize || 100,
      onlyDiscounted: params.onlyDiscounted || false,
      includeCategories: params.includeCategories !== false,
      includePricing: params.includePricing !== false,
      includeInventory: params.includeInventory !== false,
      storeIds: params.storeIds?.sort() || null,
      latitude: params.latitude || null,
      longitude: params.longitude || null
    };
    return JSON.stringify(key);
  }

  // Check if cache entry is valid
  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < this.config.maxAge;
  }

  // Clean up expired entries
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) >= this.config.maxAge) {
        this.cache.delete(key);
      }
    }
  }

  // Enforce max size limit
  private enforceMaxSize(): void {
    if (this.cache.size > this.config.maxSize) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, entries.length - this.config.maxSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  // Load cache from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('product-cache');
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(data);
        this.cleanup(); // Remove expired entries on load
      }
    } catch (error) {
      console.warn('Failed to load product cache from localStorage:', error);
      this.cache = new Map();
    }
  }

  // Save cache to localStorage
  private saveToStorage(): void {
    try {
      const data = Array.from(this.cache.entries());
      localStorage.setItem('product-cache', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save product cache to localStorage:', error);
    }
  }

  // Get cached products
  get(params: any): CachedProduct[] | null {
    const key = this.generateCacheKey(params);
    const entry = this.cache.get(key);
    
    if (entry && this.isValid(entry)) {
      console.log('📦 ProductCache: Cache hit for key:', key.substring(0, 100) + '...');
      return entry.data;
    }
    
    if (entry) {
      console.log('📦 ProductCache: Cache expired for key:', key.substring(0, 100) + '...');
      this.cache.delete(key);
    }
    
    return null;
  }

  // Set cached products
  set(params: any, products: CachedProduct[]): void {
    const key = this.generateCacheKey(params);
    const entry: CacheEntry = {
      data: products,
      timestamp: Date.now(),
      params: key
    };
    
    this.cache.set(key, entry);
    this.enforceMaxSize();
    this.saveToStorage();
    
    console.log('📦 ProductCache: Cached', products.length, 'products for key:', key.substring(0, 100) + '...');
  }

  // Clear specific cache entry
  clear(params: any): void {
    const key = this.generateCacheKey(params);
    this.cache.delete(key);
    this.saveToStorage();
    console.log('📦 ProductCache: Cleared cache for key:', key.substring(0, 100) + '...');
  }

  // Clear all cache
  clearAll(): void {
    this.cache.clear();
    localStorage.removeItem('product-cache');
    console.log('📦 ProductCache: Cleared all cache');
  }

  // Get cache statistics
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()).map(key => key.substring(0, 50) + '...')
    };
  }

  // Check if we have cached data for specific parameters
  has(params: any): boolean {
    const key = this.generateCacheKey(params);
    const entry = this.cache.get(key);
    return entry ? this.isValid(entry) : false;
  }

  // Get all cached products (useful for debugging)
  getAllCachedProducts(): CachedProduct[] {
    const allProducts: CachedProduct[] = [];
    for (const entry of this.cache.values()) {
      if (this.isValid(entry)) {
        allProducts.push(...entry.data);
      }
    }
    return allProducts;
  }

  // Update cache configuration
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create singleton instance
export const productCache = new ProductCache();

// Helper functions for common operations
export const getCachedProducts = (params: any): CachedProduct[] | null => {
  return productCache.get(params);
};

export const setCachedProducts = (params: any, products: CachedProduct[]): void => {
  productCache.set(params, products);
};

export const clearProductCache = (params?: any): void => {
  if (params) {
    productCache.clear(params);
  } else {
    productCache.clearAll();
  }
};

export const hasCachedProducts = (params: any): boolean => {
  return productCache.has(params);
};

export const getCacheStats = () => {
  return productCache.getStats();
};

// Cache invalidation helpers
export const invalidateCategoryCache = (categoryId: number): void => {
  // Clear all cache entries that might contain this category
  const stats = productCache.getStats();
  for (const key of stats.entries) {
    try {
      const params = JSON.parse(key);
      if (params.categoryIds && params.categoryIds.includes(categoryId)) {
        productCache.clear(params);
      }
    } catch (error) {
      // Ignore invalid keys
    }
  }
};

export const invalidateStoreCache = (storeId: number): void => {
  // Clear all cache entries that might contain this store
  const stats = productCache.getStats();
  for (const key of stats.entries) {
    try {
      const params = JSON.parse(key);
      if (params.storeIds && params.storeIds.includes(storeId)) {
        productCache.clear(params);
      }
    } catch (error) {
      // Ignore invalid keys
    }
  }
};

export const invalidateAllCache = (): void => {
  productCache.clearAll();
};

export default productCache;
