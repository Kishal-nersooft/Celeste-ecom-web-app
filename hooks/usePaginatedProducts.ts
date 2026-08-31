'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getProductsWithPricing, getProductsBySubcategoryWithPricing, resolveSubcategories, getDiscountedProductsOptimized } from '@/lib/api';
import { Product } from '@/store';
import { Category } from '@/components/Categories';
import { HOME_PARENT_CATEGORY_LIMIT, getHomeProductsPerCategory } from '@/lib/home-catalogue-constants';

interface UsePaginatedProductsOptions {
  selectedCategory: number | null;
  isDeals: boolean;
  storeId?: number;
  categories: Category[];
  pageSize?: number;
  latitude?: number;
  longitude?: number;
  initialProducts?: Product[];
  initialParentCategoryNames?: { [key: number]: string };
  initialParentProducts?: { [key: number]: Product[] };
}

interface CategoryViewCache {
  subcategories: Category[];
  subcategoryProducts: { [key: number]: Product[] };
  loadedSubcategories: { [key: number]: boolean };
  loadingSubcategories: { [key: number]: boolean };
}

interface PaginatedData {
  products: Product[];
  subcategories: Category[];
  parentCategoryNames: { [key: number]: string };
  parentProducts: { [key: number]: Product[] };
  subcategoryProducts: { [key: number]: Product[] };
  loadedSubcategories: { [key: number]: boolean };
  loadingSubcategories: { [key: number]: boolean };
  loadingParentCategories: { [key: number]: boolean };
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
  longitude,
  initialProducts,
  initialParentCategoryNames,
  initialParentProducts
}: UsePaginatedProductsOptions) => {
  const hasServerRows =
    !!initialParentProducts && Object.keys(initialParentProducts).length > 0;

  const [data, setData] = useState<PaginatedData>({
    products: initialProducts ?? [],
    subcategories: [],
    parentCategoryNames: initialParentCategoryNames ?? {},
    parentProducts: initialParentProducts ?? {},
    subcategoryProducts: {},
    loadedSubcategories: {},
    loadingSubcategories: {},
    loadingParentCategories: {},
    loading: false,
    loadingMore: false,
    hasMore: true,
    currentPage: 1,
    totalProducts: initialProducts?.length ?? 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didConsumeInitialAllSkipRef = useRef(false);
  const hasAllRowsRef = useRef(hasServerRows);
  const selectedCategoryRef = useRef(selectedCategory);
  const isDealsRef = useRef(isDeals);
  selectedCategoryRef.current = selectedCategory;
  isDealsRef.current = isDeals;
  const allViewCacheRef = useRef<{
    products: Product[];
    parentCategoryNames: { [key: number]: string };
    parentProducts: { [key: number]: Product[] };
    totalProducts: number;
  } | null>(
    hasServerRows
      ? {
          products: initialProducts ?? [],
          parentCategoryNames: initialParentCategoryNames ?? {},
          parentProducts: initialParentProducts ?? {},
          totalProducts: initialProducts?.length ?? 0,
        }
      : null
  );
  const categoryViewCacheRef = useRef<Map<number, CategoryViewCache>>(new Map());
  const prevSelectedCategoryRef = useRef<number | null>(selectedCategory);
  const dataRef = useRef(data);
  dataRef.current = data;
  const parentCategoryKey = categories
    .filter((cat) => !cat.parent_category_id)
    .map((cat) => cat.id)
    .join(",");

  const debouncedFetch = useCallback((fetchFn: () => Promise<void>, delay: number = 300) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      fetchFn();
    }, delay);
  }, []);

  const loadingParentCategoriesRef = useRef<{ [key: number]: boolean }>({});

  // Load products for a single parent category row (homepage lazy rows)
  const loadParentCategoryProducts = useCallback(async (parentId: number) => {
    if (data.parentProducts[parentId]?.length > 0) return;
    if (loadingParentCategoriesRef.current[parentId]) return;

    loadingParentCategoriesRef.current[parentId] = true;
    setData(prev => ({
      ...prev,
      loadingParentCategories: { ...prev.loadingParentCategories, [parentId]: true },
    }));

    const parentCat = categories.find((cat) => cat.id === parentId);
    const perCategorySize = getHomeProductsPerCategory(HOME_PARENT_CATEGORY_LIMIT);

    try {
      const products = await executeWithLimit(() =>
        getProductsWithPricing(
          [parentId],
          1,
          perCategorySize,
          false,
          true,
          true,
          storeId ? [storeId] : undefined,
          latitude,
          longitude
        )
      );

      setData(prev => ({
        ...prev,
        parentProducts: {
          ...prev.parentProducts,
          [parentId]: Array.isArray(products) ? products : [],
        },
        parentCategoryNames: {
          ...prev.parentCategoryNames,
          [parentId]: parentCat?.name ?? prev.parentCategoryNames[parentId] ?? "Unknown Category",
        },
        loadingParentCategories: { ...prev.loadingParentCategories, [parentId]: false },
      }));
    } catch (error) {
      console.error(`Error loading products for parent category ${parentId}:`, error);
      setData(prev => ({
        ...prev,
        loadingParentCategories: { ...prev.loadingParentCategories, [parentId]: false },
      }));
    } finally {
      loadingParentCategoriesRef.current[parentId] = false;
    }
  }, [categories, storeId, latitude, longitude, data.parentProducts]);

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
        const subcats = await executeWithLimit(() =>
          resolveSubcategories(selectedCategory, categories)
        );
        if (selectedCategoryRef.current !== selectedCategory || isDealsRef.current) {
          return;
        }
        setData(prev => ({ ...prev, subcategories: subcats }));

        // Don't load products immediately - just set up subcategories for lazy loading
        const loadedSubcategories: { [key: number]: boolean } = {};
        const loadingSubcategories: { [key: number]: boolean } = {};
        
        // Initialize all subcategories as not loaded
        subcats.forEach((subcat: any) => {
          loadedSubcategories[subcat.id] = false;
          loadingSubcategories[subcat.id] = false;
        });

        categoryViewCacheRef.current.set(selectedCategory, {
          subcategories: subcats,
          subcategoryProducts: {},
          loadedSubcategories,
          loadingSubcategories,
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
        if (selectedCategoryRef.current !== selectedCategory || isDealsRef.current) {
          return;
        }

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
  }, [selectedCategory, isDeals, categories, storeId, pageSize, latitude, longitude]);

  // Fetch all products with pagination
  const fetchAllProducts = useCallback(async (
    page: number = 1,
    append: boolean = false,
    preserveExisting: boolean = false
  ) => {
    if (selectedCategory !== null || isDeals) {
      return;
    }


    if (page === 1 && !preserveExisting) {
      setData(prev => ({ ...prev, loading: true, products: [] }));
    } else if (page !== 1) {
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
      
      // Fetch products for first few parent categories only (lazy loading)
      const limitedParentCategories = parentCategories.slice(0, HOME_PARENT_CATEGORY_LIMIT);
      
      const productPromises = limitedParentCategories.map(parentCat =>
        executeWithLimit(() =>
          getProductsWithPricing([parentCat.id], page, getHomeProductsPerCategory(limitedParentCategories.length), false, true, true, storeId ? [storeId] : undefined, latitude, longitude)
        ).then((prods) => {
          return {
            parentId: parentCat.id,
            parentName: parentCat.name,
            products: prods // Products already limited by API call
          };
        })
      );

      const parentProductData = await Promise.all(productPromises);
      if (selectedCategoryRef.current !== null || isDealsRef.current) {
        return;
      }
      const allProducts: Product[] = [];
      const parentNames: { [key: number]: string } = {};
      const parentProducts: { [key: number]: Product[] } = {};
      
      parentProductData.forEach(({ parentId, parentName, products }) => {
        allProducts.push(...products);
        parentNames[parentId] = parentName;
        parentProducts[parentId] = products;
      });


      if (!append) {
        allViewCacheRef.current = {
          products: allProducts,
          parentCategoryNames: parentNames,
          parentProducts,
          totalProducts: allProducts.length,
        };
        hasAllRowsRef.current = Object.keys(parentProducts).length > 0;
      }

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
  }, [selectedCategory, isDeals, categories, storeId, pageSize, latitude, longitude]);

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

  // Main effect to handle data fetching with debouncing.
  // Do not wait for auth — catalogue fetch starts as soon as categories/location are known.
  useEffect(() => {
    if (!isDeals && selectedCategory === null && !parentCategoryKey) {
      return;
    }

    const prevCategory = prevSelectedCategoryRef.current;
    if (
      prevCategory !== null &&
      prevCategory !== selectedCategory &&
      !isDeals
    ) {
      const prevIsParent = categories.some((cat) => cat.id === prevCategory);
      const snapshot = dataRef.current;
      if (prevIsParent && snapshot.subcategories.length > 0) {
        categoryViewCacheRef.current.set(prevCategory, {
          subcategories: snapshot.subcategories,
          subcategoryProducts: snapshot.subcategoryProducts,
          loadedSubcategories: snapshot.loadedSubcategories,
          loadingSubcategories: snapshot.loadingSubcategories,
        });
      }
    }
    prevSelectedCategoryRef.current = selectedCategory;

    const isAllView = selectedCategory === null && !isDeals;
    const isParentCategoryView =
      selectedCategory !== null &&
      !isDeals &&
      categories.some((cat) => cat.id === selectedCategory);
    const cachedCategoryView = isParentCategoryView
      ? categoryViewCacheRef.current.get(selectedCategory)
      : undefined;

    // Skip only the first All fetch when the server already provided rows.
    // Do not restore this skip when leaving All — that left the homepage blank.
    if (isAllView && hasServerRows && !didConsumeInitialAllSkipRef.current) {
      didConsumeInitialAllSkipRef.current = true;
      return;
    }

    if (isAllView && allViewCacheRef.current) {
      const cached = allViewCacheRef.current;
      hasAllRowsRef.current = Object.keys(cached.parentProducts).length > 0;
      setData((prev) => ({
        ...prev,
        products: cached.products,
        parentCategoryNames: cached.parentCategoryNames,
        parentProducts: cached.parentProducts,
        subcategories: [],
        subcategoryProducts: {},
        loadedSubcategories: {},
        loadingSubcategories: {},
        loading: false,
        loadingMore: false,
        currentPage: 1,
        totalProducts: cached.totalProducts,
      }));
    }

    if (cachedCategoryView) {
      setData((prev) => ({
        ...prev,
        products: [],
        subcategories: cachedCategoryView.subcategories,
        subcategoryProducts: cachedCategoryView.subcategoryProducts,
        loadedSubcategories: cachedCategoryView.loadedSubcategories,
        loadingSubcategories: cachedCategoryView.loadingSubcategories,
        loading: false,
        loadingMore: false,
        hasMore: false,
        currentPage: 1,
        totalProducts: 0,
      }));
    }

    const preserveExisting =
      isAllView &&
      (hasAllRowsRef.current || !!allViewCacheRef.current);
    const preserveCategoryView = !!cachedCategoryView;

    if (!preserveExisting && !preserveCategoryView) {
      hasAllRowsRef.current = false;
      // Show product skeletons immediately on category switch — never a full-page loader
      setData(prev => ({
        ...prev,
        products: [],
        subcategories: [],
        parentCategoryNames: {},
        parentProducts: {},
        subcategoryProducts: {},
        loadedSubcategories: {},
        loadingSubcategories: {},
        loading: true,
        currentPage: 1,
        totalProducts: 0
      }));
    }

    if (preserveCategoryView) {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }

    const fetchData = async () => {
      if (isDeals) {
        await fetchDealsProducts(1, false);
      } else if (selectedCategory === null) {
        await fetchAllProducts(1, false, preserveExisting);
      } else {
        await fetchSubcategoryProducts(1, false);
      }
    };

    debouncedFetch(fetchData, preserveExisting ? 0 : 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedCategory, isDeals, parentCategoryKey, latitude, longitude, storeId, categories]);

  return {
    ...data,
    loadMore,
    loadSubcategoryProducts,
    loadParentCategoryProducts,
    preloadNextSubcategories
  };
};
