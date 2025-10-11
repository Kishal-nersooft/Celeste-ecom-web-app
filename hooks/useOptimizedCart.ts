'use client';

import { useCallback, useRef } from 'react';
import { useCartStore } from '@/store';
import { Product } from '@/store';
import { invalidateProduct } from '@/lib/cache-invalidation';

// Hook to optimize cart operations and prevent unnecessary re-renders
export const useOptimizedCart = () => {
  const { addItem, removeItem, getItemCount, items } = useCartStore();
  const lastUpdateRef = useRef<number>(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced cart update to prevent rapid re-renders
  const debouncedAddItem = useCallback(async (product: Product) => {
    const now = Date.now();
    lastUpdateRef.current = now;

    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Add item immediately for responsive UI
    await addItem(product);

    // Invalidate cache for this product (smart invalidation)
    invalidateProduct(product.id, product.ecommerce_category_id, product.store_id);

    // Debounce any subsequent updates
    updateTimeoutRef.current = setTimeout(() => {
      if (lastUpdateRef.current === now) {
        // This was the last update, no more pending
        console.log('📦 Cart update completed');
      }
    }, 100);
  }, [addItem]);

  const debouncedRemoveItem = useCallback(async (productId: number) => {
    const now = Date.now();
    lastUpdateRef.current = now;

    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Remove item immediately for responsive UI
    await removeItem(productId);

    // Debounce any subsequent updates
    updateTimeoutRef.current = setTimeout(() => {
      if (lastUpdateRef.current === now) {
        // This was the last update, no more pending
        console.log('📦 Cart update completed');
      }
    }, 100);
  }, [removeItem]);

  // Get item count with memoization
  const getOptimizedItemCount = useCallback((productId: number) => {
    return getItemCount(productId);
  }, [getItemCount]);

  // Check if cart is being updated
  const isUpdating = useCallback(() => {
    return updateTimeoutRef.current !== null;
  }, []);

  return {
    addItem: debouncedAddItem,
    removeItem: debouncedRemoveItem,
    getItemCount: getOptimizedItemCount,
    items,
    isUpdating
  };
};
