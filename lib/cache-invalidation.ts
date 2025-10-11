// Smart cache invalidation system
// This prevents unnecessary reloads while keeping data fresh

import { invalidateCategoryCache, invalidateStoreCache, invalidateAllCache } from './product-cache';

interface CacheInvalidationConfig {
  enableSmartInvalidation: boolean;
  maxCacheAge: number; // in milliseconds
  enableCategoryInvalidation: boolean;
  enableStoreInvalidation: boolean;
}

class CacheInvalidationManager {
  private config: CacheInvalidationConfig = {
    enableSmartInvalidation: true,
    maxCacheAge: 5 * 60 * 1000, // 5 minutes
    enableCategoryInvalidation: true,
    enableStoreInvalidation: true
  };

  private lastInvalidationTime: number = 0;
  private invalidationQueue: Array<() => void> = [];
  private isProcessing: boolean = false;

  constructor(config?: Partial<CacheInvalidationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // Smart invalidation - only invalidate if enough time has passed
  private shouldInvalidate(): boolean {
    if (!this.config.enableSmartInvalidation) {
      return true;
    }

    const now = Date.now();
    const timeSinceLastInvalidation = now - this.lastInvalidationTime;
    
    // Don't invalidate too frequently
    if (timeSinceLastInvalidation < 30000) { // 30 seconds minimum
      console.log('📦 Cache invalidation skipped - too recent');
      return false;
    }

    return true;
  }

  // Queue invalidation to prevent rapid successive calls
  private queueInvalidation(invalidationFn: () => void): void {
    this.invalidationQueue.push(invalidationFn);
    this.processQueue();
  }

  // Process invalidation queue
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.invalidationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Wait a bit to batch multiple invalidations
    await new Promise(resolve => setTimeout(resolve, 100));

    if (this.shouldInvalidate()) {
      console.log('📦 Processing cache invalidation queue:', this.invalidationQueue.length, 'items');
      
      // Execute all queued invalidations
      this.invalidationQueue.forEach(fn => fn());
      this.invalidationQueue = [];
      
      this.lastInvalidationTime = Date.now();
    } else {
      // Clear queue if we're not invalidating
      this.invalidationQueue = [];
    }

    this.isProcessing = false;
  }

  // Invalidate category cache
  invalidateCategory(categoryId: number): void {
    if (!this.config.enableCategoryInvalidation) {
      return;
    }

    this.queueInvalidation(() => {
      console.log('📦 Invalidating cache for category:', categoryId);
      invalidateCategoryCache(categoryId);
    });
  }

  // Invalidate store cache
  invalidateStore(storeId: number): void {
    if (!this.config.enableStoreInvalidation) {
      return;
    }

    this.queueInvalidation(() => {
      console.log('📦 Invalidating cache for store:', storeId);
      invalidateStoreCache(storeId);
    });
  }

  // Invalidate all cache
  invalidateAll(): void {
    this.queueInvalidation(() => {
      console.log('📦 Invalidating all cache');
      invalidateAllCache();
    });
  }

  // Invalidate cache for product update
  invalidateProduct(productId: number, categoryId?: number, storeId?: number): void {
    this.queueInvalidation(() => {
      console.log('📦 Invalidating cache for product:', productId);
      
      if (categoryId) {
        invalidateCategoryCache(categoryId);
      }
      
      if (storeId) {
        invalidateStoreCache(storeId);
      }
      
      // If no specific context, invalidate all
      if (!categoryId && !storeId) {
        invalidateAllCache();
      }
    });
  }

  // Update configuration
  updateConfig(newConfig: Partial<CacheInvalidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): CacheInvalidationConfig {
    return { ...this.config };
  }

  // Force immediate invalidation (bypasses smart invalidation)
  forceInvalidate(): void {
    console.log('📦 Force invalidating all cache');
    invalidateAllCache();
    this.lastInvalidationTime = Date.now();
  }

  // Clear invalidation queue
  clearQueue(): void {
    this.invalidationQueue = [];
    console.log('📦 Cache invalidation queue cleared');
  }

  // Get queue status
  getQueueStatus(): { queueLength: number; isProcessing: boolean; lastInvalidation: number } {
    return {
      queueLength: this.invalidationQueue.length,
      isProcessing: this.isProcessing,
      lastInvalidation: this.lastInvalidationTime
    };
  }
}

// Create singleton instance
export const cacheInvalidationManager = new CacheInvalidationManager();

// Helper functions for common operations
export const invalidateCategory = (categoryId: number): void => {
  cacheInvalidationManager.invalidateCategory(categoryId);
};

export const invalidateStore = (storeId: number): void => {
  cacheInvalidationManager.invalidateStore(storeId);
};

export const invalidateAll = (): void => {
  cacheInvalidationManager.invalidateAll();
};

export const invalidateProduct = (productId: number, categoryId?: number, storeId?: number): void => {
  cacheInvalidationManager.invalidateProduct(productId, categoryId, storeId);
};

export const forceInvalidateCache = (): void => {
  cacheInvalidationManager.forceInvalidate();
};

export const updateCacheConfig = (config: Partial<CacheInvalidationConfig>): void => {
  cacheInvalidationManager.updateConfig(config);
};

export const getCacheStatus = () => {
  return cacheInvalidationManager.getQueueStatus();
};

export default cacheInvalidationManager;