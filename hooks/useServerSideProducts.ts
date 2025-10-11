'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getProductsWithPricing, getSubcategories, getProductsBySubcategoryWithPricing, getDiscountedProductsOptimized } from '@/lib/api';
import { getCachedProducts, setCachedProducts, hasCachedProducts } from '@/lib/product-cache';
import { Product } from '@/store';
import { Category } from '@/components/Categories';

interface UseServerSideProductsOptions {
  selectedCategory: number | null;
  isDeals: boolean;
  storeId?: number;
  categories: Category[];
  pageSize?: number;
}

interface ServerSideData {
  products: Product[];
  subcategories: Category[];
  parentCategoryNames: { [key: number]: string };
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  totalProducts: number;
}

export const useServerSideProducts = ({
  selectedCategory,
  isDeals,
  storeId,
  categories,
  pageSize = 20
}: UseServerSideProductsOptions) => {
  const [data, setData] = useState<ServerSideData>({
    products: [],
    subcategories: [],
    parentCategoryNames: {},
    loading: false,
    loadingMore: false,
    hasMore: true,
    currentPage: 1,
    totalProducts: 0
  });

  // Generate cache key for current parameters
  const cacheKey = useMemo(() => ({
    selectedCategory,
    isDeals,
    storeId,
    pageSize,
    timestamp: Math.floor(Date.now() / (5 * 60 * 1000)) // 5-minute cache buckets
  }), [selectedCategory, isDeals, storeId, pageSize]);

  // Check if we have cached data
  const hasCachedData = useMemo(() => {
    return hasCachedProducts(cacheKey);
  }, [cacheKey]);

  // Load cached data
  const loadCachedData = useCallback(() => {
    const cachedProducts = getCachedProducts(cacheKey);
    if (cachedProducts && cachedProducts.length > 0) {
      console.log('📦 useServerSideProducts: Loading cached data:', cachedProducts.length, 'products');
      setData(prev => ({
        ...prev,
        products: cachedProducts,
        loading: false,
        loadingMore: false,
        hasMore: cachedProducts.length >= pageSize
      }));
      return true;
    }
    return false;
  }, [cacheKey, pageSize]);

  // Fetch deals products
  const fetchDealsProducts = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!isDeals) return;

    if (page === 1 && !append) {
      setData(prev => ({ ...prev, loading: true, products: [] }));
    } else {
      setData(prev => ({ ...prev, loadingMore: true }));
    }

    try {
      const discountedProducts = await getDiscountedProductsOptimized(
        pageSize,
        storeId ? [storeId] : undefined
      );

      const newProducts = append ? [...data.products, ...discountedProducts] : discountedProducts;
      
      setData(prev => ({
        ...prev,
        products: newProducts,
        loading: false,
        loadingMore: false,
        hasMore: discountedProducts.length === pageSize,
        currentPage: page,
        totalProducts: newProducts.length
      }));

      // Cache the results
      setCachedProducts(cacheKey, newProducts);
      console.log('📦 useServerSideProducts: Cached deals products:', newProducts.length);
    } catch (error) {
      console.error("❌ Error fetching deals products:", error);
      setData(prev => ({ 
        ...prev, 
        loading: false,
        loadingMore: false,
        hasMore: false
      }));
    }
  }, [isDeals, storeId, pageSize, cacheKey, data.products]);

  // Fetch subcategory products
  const fetchSubcategoryProducts = useCallback(async (page: number = 1, append: boolean = false) => {
    if (selectedCategory === null || isDeals) return;

    if (page === 1 && !append) {
      setData(prev => ({ ...prev, loading: true, products: [] }));
    } else {
      setData(prev => ({ ...prev, loadingMore: true }));
    }

    try {
      const isParentCategory = categories.some(cat => cat.id === selectedCategory);

      if (isParentCategory) {
        // Parent category selected - fetch its subcategories
        const subcats = await getSubcategories(selectedCategory);
        setData(prev => ({ ...prev, subcategories: subcats }));

        // Fetch products for first few subcategories
        const productPromises = subcats.slice(0, 3).map((subcat: Category) =>
          getProductsBySubcategoryWithPricing(subcat.id, pageSize, storeId ? [storeId] : undefined)
        );

        const subcategoryProductData = await Promise.all(productPromises);
        const allProducts: Product[] = [];
        
        subcategoryProductData.forEach((products) => {
          allProducts.push(...products);
        });

        const newProducts = append ? [...data.products, ...allProducts] : allProducts;
        
        setData(prev => ({
          ...prev,
          products: newProducts,
          loading: false,
          loadingMore: false,
          hasMore: allProducts.length === pageSize,
          currentPage: page,
          totalProducts: newProducts.length
        }));

        // Cache the results
        setCachedProducts(cacheKey, newProducts);
        console.log('📦 useServerSideProducts: Cached subcategory products:', newProducts.length);
      } else {
        // Subcategory selected - fetch products for this specific subcategory
        const prods = await getProductsBySubcategoryWithPricing(
          selectedCategory, 
          pageSize, 
          storeId ? [storeId] : undefined
        );

        const subcategory = categories.find(cat => cat.id === selectedCategory) || {
          id: selectedCategory,
          name: 'Selected Category',
          sort_order: 0,
          parent_category_id: undefined
        };

        const newProducts = append ? [...data.products, ...prods] : prods;
        
        setData(prev => ({
          ...prev,
          products: newProducts,
          subcategories: [subcategory],
          loading: false,
          loadingMore: false,
          hasMore: prods.length === pageSize,
          currentPage: page,
          totalProducts: newProducts.length
        }));

        // Cache the results
        setCachedProducts(cacheKey, newProducts);
        console.log('📦 useServerSideProducts: Cached subcategory products:', newProducts.length);
      }
    } catch (error) {
      console.error("❌ Error fetching subcategory products:", error);
      setData(prev => ({ 
        ...prev, 
        loading: false,
        loadingMore: false,
        hasMore: false
      }));
    }
  }, [selectedCategory, isDeals, categories, storeId, pageSize, cacheKey, data.products]);

  // Fetch all products
  const fetchAllProducts = useCallback(async (page: number = 1, append: boolean = false) => {
    if (selectedCategory !== null || isDeals) return;

    if (page === 1 && !append) {
      setData(prev => ({ ...prev, loading: true, products: [] }));
    } else {
      setData(prev => ({ ...prev, loadingMore: true }));
    }

    try {
      // Get all parent categories first
      const parentCategories = categories.filter(cat => !cat.parent_category_id);
      
      // Fetch products for first few parent categories only
      const limitedParentCategories = parentCategories.slice(0, 3);
      
      const productPromises = limitedParentCategories.map(parentCat =>
        getProductsWithPricing([parentCat.id], page, pageSize, false, true, true, storeId ? [storeId] : undefined)
      );

      const parentProductData = await Promise.all(productPromises);
      const allProducts: Product[] = [];
      const parentNames: { [key: number]: string } = {};
      
      parentProductData.forEach((prods, index) => {
        allProducts.push(...prods);
        parentNames[limitedParentCategories[index].id] = limitedParentCategories[index].name;
      });

      const newProducts = append ? [...data.products, ...allProducts] : allProducts;
      
      setData(prev => ({
        ...prev,
        products: newProducts,
        parentCategoryNames: parentNames,
        loading: false,
        loadingMore: false,
        hasMore: allProducts.length === pageSize,
        currentPage: page,
        totalProducts: newProducts.length
      }));

      // Cache the results
      setCachedProducts(cacheKey, newProducts);
      console.log('📦 useServerSideProducts: Cached all products:', newProducts.length);
    } catch (error) {
      console.error("❌ Error fetching all products:", error);
      setData(prev => ({ 
        ...prev, 
        loading: false,
        loadingMore: false,
        hasMore: false
      }));
    }
  }, [selectedCategory, isDeals, categories, storeId, pageSize, cacheKey, data.products]);

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

  // Main effect to handle data fetching
  useEffect(() => {
    // First try to load from cache
    if (hasCachedData) {
      const loadedFromCache = loadCachedData();
      if (loadedFromCache) {
        return; // Use cached data, no need to fetch
      }
    }

    // If no cached data, fetch from server
    if (isDeals) {
      fetchDealsProducts(1, false);
    } else if (selectedCategory === null) {
      fetchAllProducts(1, false);
    } else {
      fetchSubcategoryProducts(1, false);
    }
  }, [selectedCategory, isDeals, hasCachedData, loadCachedData, fetchDealsProducts, fetchAllProducts, fetchSubcategoryProducts]);

  return {
    ...data,
    loadMore,
    hasCachedData
  };
};
