'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getProductsWithPricing, getProductsBySubcategoryWithPricing, getSubcategories, getDiscountedProductsOptimized } from '@/lib/api';
import { Product } from '@/store';
import { Category } from '@/components/Categories';

interface UsePaginatedProductsOptions {
  selectedCategory: number | null;
  isDeals: boolean;
  storeId?: number;
  categories: Category[];
  pageSize?: number;
  latitude?: number;
  longitude?: number;
}

interface PaginatedData {
  products: Product[];
  subcategories: Category[];
  parentCategoryNames: { [key: number]: string };
  parentProducts: { [key: number]: Product[] };
  subcategoryProducts: { [key: number]: Product[] };
  loadedSubcategories: { [key: number]: boolean };
  loadingSubcategories: { [key: number]: boolean };
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  totalProducts: number;
}

interface RequestLimiter {
  activeRequests: number;
  maxConcurrent: number;
  queue: Array<() => Promise<any>>;
}

// Global request limiter
const requestLimiter: RequestLimiter = {
  activeRequests: 0,
  maxConcurrent: 3, // Limit to 3 concurrent requests
  queue: []
};

const executeWithLimit = async <T>(requestFn: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    const executeRequest = async () => {
      if (requestLimiter.activeRequests >= requestLimiter.maxConcurrent) {
        requestLimiter.queue.push(executeRequest);
        return;
      }

      requestLimiter.activeRequests++;
      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        requestLimiter.activeRequests--;
        const nextRequest = requestLimiter.queue.shift();
        if (nextRequest) {
          setTimeout(nextRequest, 100); // Small delay between requests
        }
      }
    };

    executeRequest();
  });
};

export const usePaginatedProducts = ({
  selectedCategory,
  isDeals,
  storeId,
  categories,
  pageSize = 20,
  latitude,
  longitude
}: UsePaginatedProductsOptions) => {
  const [data, setData] = useState<PaginatedData>({
    products: [],
    subcategories: [],
    parentCategoryNames: {},
    parentProducts: {},
    subcategoryProducts: {},
    loadedSubcategories: {},
    loadingSubcategories: {},
    loading: false,
    loadingMore: false,
    hasMore: true,
    currentPage: 1,
    totalProducts: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Debounced fetch function
  const debouncedFetch = useCallback((fetchFn: () => Promise<void>, delay: number = 300) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      fetchFn();
    }, delay);

    setDebounceTimer(timer);
  }, [debounceTimer]);

  // Load products for a specific subcategory
  const loadSubcategoryProducts = useCallback(async (subcategoryId: number) => {
    if (data.loadedSubcategories[subcategoryId] || data.loadingSubcategories[subcategoryId]) {
      return; // Already loaded or loading
    }

    setData(prev => ({
      ...prev,
      loadingSubcategories: { ...prev.loadingSubcategories, [subcategoryId]: true }
    }));

    try {
      const products = await executeWithLimit(() =>
        getProductsBySubcategoryWithPricing(subcategoryId, 10, storeId ? [storeId] : undefined, latitude, longitude)
      );

      setData(prev => ({
        ...prev,
        subcategoryProducts: { ...prev.subcategoryProducts, [subcategoryId]: products },
        loadedSubcategories: { ...prev.loadedSubcategories, [subcategoryId]: true },
        loadingSubcategories: { ...prev.loadingSubcategories, [subcategoryId]: false }
      }));
    } catch (error) {
      console.error(`Error loading products for subcategory ${subcategoryId}:`, error);
      setData(prev => ({
        ...prev,
        loadingSubcategories: { ...prev.loadingSubcategories, [subcategoryId]: false }
      }));
    }
  }, [data.loadedSubcategories, data.loadingSubcategories, storeId]);

  // Preload next 1-2 subcategories
  const preloadNextSubcategories = useCallback((currentIndex: number, subcategories: Category[]) => {
    const nextSubcategories = subcategories.slice(currentIndex + 1, currentIndex + 3); // Next 1-2 subcategories
    nextSubcategories.forEach(subcategory => {
      if (!data.loadedSubcategories[subcategory.id] && !data.loadingSubcategories[subcategory.id]) {
        loadSubcategoryProducts(subcategory.id);
      }
    });
  }, [data.loadedSubcategories, data.loadingSubcategories, loadSubcategoryProducts]);

  // Fetch deals products with pagination
  const fetchDealsProducts = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!isDeals) {
      setData(prev => ({ 
        ...prev, 
        products: append ? prev.products : [], 
        loading: false,
        loadingMore: false,
        hasMore: false
      }));
      return;
    }

    console.log("🎯 fetchDealsProducts - Starting fetch for 'Deals' category", { page, append });

    if (page === 1) {
      setData(prev => ({ ...prev, loading: true, products: [] }));
    } else {
      setData(prev => ({ ...prev, loadingMore: true }));
    }

    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Use backend pagination with cursor-based approach
      const discountedProducts = await executeWithLimit(() =>
        getDiscountedProductsOptimized(
          pageSize,
          storeId ? [storeId] : undefined
        )
      );

      console.log("🎯 fetchDealsProducts - Received products:", {
        count: discountedProducts.length,
        sample: discountedProducts.slice(0, 3).map((p: any) => ({ id: p.id, name: p.name, discount: p.discount_percentage }))
      });

      setData(prev => ({
        ...prev,
        products: append ? [...prev.products, ...discountedProducts] : discountedProducts,
        loading: false,
        loadingMore: false,
        hasMore: discountedProducts.length === pageSize,
        currentPage: page,
        totalProducts: append ? prev.totalProducts + discountedProducts.length : discountedProducts.length
      }));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled
      }
      console.error("❌ Error fetching deals products:", error);
      setData(prev => ({ 
        ...prev, 
        loading: false,
        loadingMore: false,
        hasMore: false
      }));
    }
  }, [isDeals, storeId, pageSize]);

  // Fetch subcategory products with pagination
  const fetchSubcategoryProducts = useCallback(async (page: number = 1, append: boolean = false) => {
    if (selectedCategory === null || isDeals) {
      setData(prev => ({ 
        ...prev, 
        products: append ? prev.products : [],
        subcategories: [],
        parentCategoryNames: {},
        loading: false,
        loadingMore: false,
        hasMore: false
      }));
      return;
    }

    if (page === 1) {
      setData(prev => ({ ...prev, loading: true, products: [] }));
    } else {
      setData(prev => ({ ...prev, loadingMore: true }));
    }

    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const isParentCategory = categories.some(cat => cat.id === selectedCategory);

      if (isParentCategory) {
        // Parent category selected - fetch its subcategories first
        const subcats = await executeWithLimit(() => getSubcategories(selectedCategory));
        setData(prev => ({ ...prev, subcategories: subcats }));

        // Don't load products immediately - just set up subcategories for lazy loading
        const loadedSubcategories: { [key: number]: boolean } = {};
        const loadingSubcategories: { [key: number]: boolean } = {};
        
        // Initialize all subcategories as not loaded
        subcats.forEach((subcat: any) => {
          loadedSubcategories[subcat.id] = false;
          loadingSubcategories[subcat.id] = false;
        });

        setData(prev => ({
          ...prev,
          products: [], // No products initially
          subcategoryProducts: {}, // No products initially
          loadedSubcategories: loadedSubcategories,
          loadingSubcategories: loadingSubcategories,
          loading: false,
          loadingMore: false,
          hasMore: false, // No pagination for subcategories
          currentPage: page,
          totalProducts: 0
        }));
      } else {
        // Subcategory selected - fetch products for this specific subcategory
        const prods = await executeWithLimit(() =>
          getProductsBySubcategoryWithPricing(
            selectedCategory, 
            pageSize, 
            storeId ? [storeId] : undefined,
            latitude,
            longitude
          )
        );

        const subcategory = categories.find(cat => cat.id === selectedCategory) || {
          id: selectedCategory,
          name: 'Selected Category',
          sort_order: 0,
          parent_category_id: undefined
        };

        setData(prev => ({
          ...prev,
          products: append ? [...prev.products, ...prods] : prods,
          subcategories: [subcategory],
          loading: false,
          loadingMore: false,
          hasMore: prods.length === pageSize,
          currentPage: page,
          totalProducts: prev.totalProducts + prods.length
        }));
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled
      }
      console.error("❌ Error fetching subcategory products:", error);
      setData(prev => ({ 
        ...prev, 
        loading: false,
        loadingMore: false,
        hasMore: false
      }));
    }
  }, [selectedCategory, isDeals, categories, storeId, pageSize]);

  // Fetch all products with pagination
  const fetchAllProducts = useCallback(async (page: number = 1, append: boolean = false) => {
    if (selectedCategory !== null || isDeals) {
      setData(prev => ({ 
        ...prev, 
        products: append ? prev.products : [],
        subcategories: [],
        parentCategoryNames: {},
        parentProducts: {},
        loading: false,
        loadingMore: false,
        hasMore: false
      }));
      return;
    }

    console.log("🔄 fetchAllProducts - Starting fetch for 'All' category", { page, append, categoriesCount: categories.length });

    if (page === 1) {
      setData(prev => ({ ...prev, loading: true, products: [] }));
    } else {
      setData(prev => ({ ...prev, loadingMore: true }));
    }

    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Get all parent categories first
      const parentCategories = categories.filter(cat => !cat.parent_category_id);
      console.log("🔄 fetchAllProducts - Parent categories found:", parentCategories.length);
      
      // Fetch products for first few parent categories only (lazy loading)
      const limitedParentCategories = parentCategories.slice(0, 5); // Only first 5 parent categories
      console.log("🔄 fetchAllProducts - Limited to first 5 categories:", limitedParentCategories.map(c => c.name));
      
      const productPromises = limitedParentCategories.map(parentCat =>
        executeWithLimit(() =>
          getProductsWithPricing([parentCat.id], page, Math.ceil(pageSize / limitedParentCategories.length), false, true, true, storeId ? [storeId] : undefined, latitude, longitude)
        ).then((prods) => {
          console.log(`🔄 fetchAllProducts - Category ${parentCat.name} (${parentCat.id}): ${prods.length} products`);
          return {
            parentId: parentCat.id,
            parentName: parentCat.name,
            products: prods // Products already limited by API call
          };
        })
      );

      const parentProductData = await Promise.all(productPromises);
      const allProducts: Product[] = [];
      const parentNames: { [key: number]: string } = {};
      const parentProducts: { [key: number]: Product[] } = {};
      
      parentProductData.forEach(({ parentId, parentName, products }) => {
        allProducts.push(...products);
        parentNames[parentId] = parentName;
        parentProducts[parentId] = products;
      });

      console.log("🔄 fetchAllProducts - Final data:", {
        allProductsCount: allProducts.length,
        parentNamesCount: Object.keys(parentNames).length,
        parentProductsCount: Object.keys(parentProducts).length,
        parentNames: parentNames,
        parentProductsKeys: Object.keys(parentProducts)
      });

      setData(prev => ({
        ...prev,
        products: append ? [...prev.products, ...allProducts] : allProducts,
        parentCategoryNames: parentNames,
        parentProducts: parentProducts,
        loading: false,
        loadingMore: false,
        hasMore: allProducts.length === pageSize,
        currentPage: page,
        totalProducts: append ? prev.totalProducts + allProducts.length : allProducts.length
      }));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled
      }
      console.error("❌ Error fetching all products:", error);
      setData(prev => ({ 
        ...prev, 
        loading: false,
        loadingMore: false,
        hasMore: false
      }));
    }
  }, [selectedCategory, isDeals, categories, storeId, pageSize]);

  // Load more products
  const loadMore = useCallback(() => {
    if (data.loadingMore || !data.hasMore) return;

    const nextPage = data.currentPage + 1;
    
    if (isDeals) {
      fetchDealsProducts(nextPage, true);
    } else if (selectedCategory === null) {
      fetchAllProducts(nextPage, true);
    } else {
      fetchSubcategoryProducts(nextPage, true);
    }
  }, [data.loadingMore, data.hasMore, data.currentPage, isDeals, selectedCategory, fetchDealsProducts, fetchAllProducts, fetchSubcategoryProducts]);

  // Main effect to handle data fetching with debouncing
  useEffect(() => {
    const fetchData = async () => {
      // Reset data when category changes
      setData(prev => ({
        ...prev,
        products: [],
        subcategories: [],
        parentCategoryNames: {},
        parentProducts: {},
        subcategoryProducts: {},
        loadedSubcategories: {},
        loadingSubcategories: {},
        currentPage: 1,
        totalProducts: 0
      }));

      if (isDeals) {
        await fetchDealsProducts(1, false);
      } else if (selectedCategory === null) {
        await fetchAllProducts(1, false);
      } else {
        await fetchSubcategoryProducts(1, false);
      }
    };

    debouncedFetch(fetchData, 300);

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedCategory, isDeals]); // Removed function dependencies to prevent unnecessary re-runs

  return {
    ...data,
    loadMore,
    loadSubcategoryProducts,
    preloadNextSubcategories
  };
};
