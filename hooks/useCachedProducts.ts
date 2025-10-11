'use client';

import { useState, useEffect, useCallback } from 'react';
import { getProductsWithPricing, getProductsBySubcategoryWithPricing, getSubcategories, getDiscountedProductsOptimized } from '@/lib/api';
import { hasCachedProducts } from '@/lib/product-cache';
import { Product } from '@/store';
import { Category } from '@/components/Categories';

interface UseCachedProductsOptions {
  selectedCategory: number | null;
  isDeals: boolean;
  storeId?: number;
  categories: Category[];
}

interface CachedData {
  dealsProducts: Product[];
  subcategories: Category[];
  subcategoryProducts: { [key: number]: Product[] };
  parentCategoryNames: { [key: number]: string };
  loading: boolean;
  loadingDeals: boolean;
  loadingSubcategories: boolean;
}

export const useCachedProducts = ({
  selectedCategory,
  isDeals,
  storeId,
  categories
}: UseCachedProductsOptions) => {
  const [data, setData] = useState<CachedData>({
    dealsProducts: [],
    subcategories: [],
    subcategoryProducts: {},
    parentCategoryNames: {},
    loading: false,
    loadingDeals: false,
    loadingSubcategories: false
  });

  // Check if we have cached data for the current parameters
  const hasCachedData = useCallback((params: any) => {
    return hasCachedProducts(params);
  }, []);

  // Fetch deals products with caching
  const fetchDealsProducts = useCallback(async () => {
    if (!isDeals) {
      setData(prev => ({ ...prev, dealsProducts: [], loadingDeals: false }));
      return;
    }

    setData(prev => ({ ...prev, loadingDeals: true }));

    try {
      const cacheParams = {
        categoryIds: null,
        page: 1,
        pageSize: 100,
        onlyDiscounted: false,
        includeCategories: true,
        includePricing: true,
        includeInventory: true,
        storeIds: storeId ? [storeId] : undefined
      };

      // Check if we have cached data
      if (hasCachedData(cacheParams)) {
        console.log("📦 useCachedProducts: Using cached deals data");
      } else {
        console.log("📦 useCachedProducts: Fetching fresh deals data");
      }

      const discountedProducts = await getDiscountedProductsOptimized(
        100, // pageSize
        storeId ? [storeId] : undefined
      );

      setData(prev => ({ 
        ...prev, 
        dealsProducts: discountedProducts,
        loadingDeals: false 
      }));
    } catch (error) {
      console.error("❌ Error fetching deals products:", error);
      setData(prev => ({ 
        ...prev, 
        dealsProducts: [],
        loadingDeals: false 
      }));
    }
  }, [isDeals, storeId, hasCachedData]);

  // Fetch subcategories and their products with caching
  const fetchSubcategoryProducts = useCallback(async () => {
    if (selectedCategory === null || isDeals) {
      setData(prev => ({ 
        ...prev, 
        subcategories: [],
        subcategoryProducts: {},
        parentCategoryNames: {},
        loadingSubcategories: false 
      }));
      return;
    }

    setData(prev => ({ ...prev, loadingSubcategories: true }));

    try {
      // Check if it's a parent category or subcategory
      const isParentCategory = categories.some(cat => cat.id === selectedCategory);

      if (isParentCategory) {
        // Parent category selected - fetch its subcategories
        console.log("📦 useCachedProducts: Fetching subcategories for parent category", selectedCategory);
        
        const subcats = await getSubcategories(selectedCategory);
        setData(prev => ({ ...prev, subcategories: subcats }));

        // Fetch products for each subcategory
        const productPromises = subcats.map((subcat: Category) =>
          getProductsBySubcategoryWithPricing(subcat.id, 100, storeId ? [storeId] : undefined).then((prods) => ({
            subcategoryId: subcat.id,
            products: prods
          }))
        );

        const subcategoryProductData = await Promise.all(productPromises);
        const productMap: { [key: number]: Product[] } = {};
        
        subcategoryProductData.forEach(({ subcategoryId, products }) => {
          productMap[subcategoryId] = products;
        });

        setData(prev => ({ 
          ...prev, 
          subcategoryProducts: productMap,
          loadingSubcategories: false 
        }));
      } else {
        // Subcategory selected - fetch products for this specific subcategory
        console.log("📦 useCachedProducts: Fetching products for subcategory", selectedCategory);
        
        const prods = await getProductsBySubcategoryWithPricing(
          selectedCategory, 100, storeId ? [storeId] : undefined
        );

        const subcategory = categories.find(cat => cat.id === selectedCategory) || {
          id: selectedCategory,
          name: 'Selected Category',
          sort_order: 0,
          parent_category_id: undefined
        };

        setData(prev => ({ 
          ...prev, 
          subcategories: [subcategory],
          subcategoryProducts: { [selectedCategory]: prods },
          loadingSubcategories: false 
        }));
      }
    } catch (error) {
      console.error("❌ Error fetching subcategory products:", error);
      setData(prev => ({ 
        ...prev, 
        subcategories: [],
        subcategoryProducts: {},
        loadingSubcategories: false 
      }));
    }
  }, [selectedCategory, isDeals, categories, storeId]);

  // Fetch all products grouped by parent categories
  const fetchAllProducts = useCallback(async () => {
    if (selectedCategory !== null || isDeals) {
      setData(prev => ({ 
        ...prev, 
        subcategories: [],
        subcategoryProducts: {},
        parentCategoryNames: {},
        loadingSubcategories: false 
      }));
      return;
    }

    setData(prev => ({ ...prev, loadingSubcategories: true }));

    try {
      console.log("📦 useCachedProducts: Fetching all products grouped by parent categories");
      
      // Get all parent categories first
      const parentCategories = categories.filter(cat => !cat.parent_category_id);
      
      // Fetch subcategories for each parent category
      const subcategoryPromises = parentCategories.map(parentCat =>
        getSubcategories(parentCat.id).then(subcats => ({
          parentId: parentCat.id,
          parentName: parentCat.name,
          subcategories: subcats
        }))
      );
      
      const allSubcategoryData = await Promise.all(subcategoryPromises);
      const allSubcategories: Category[] = [];
      const subcategoryProductPromises: Promise<{subcategoryId: number, parentId: number, parentName: string, products: Product[]}>[] = [];
      
      allSubcategoryData.forEach(({ parentId, parentName, subcategories: subcats }) => {
        allSubcategories.push(...subcats);
        // Fetch products for each subcategory
        subcats.forEach((subcat: Category) => {
          subcategoryProductPromises.push(
            getProductsBySubcategoryWithPricing(subcat.id, 100, storeId ? [storeId] : undefined).then(prods => ({
              subcategoryId: subcat.id,
              parentId: parentId,
              parentName: parentName,
              products: prods
            }))
          );
        });
      });
      
      setData(prev => ({ ...prev, subcategories: allSubcategories }));
      
      // Fetch products for all subcategories
      const subcategoryProductData = await Promise.all(subcategoryProductPromises);
      
      // Group products by parent category
      const parentProductMap: {[key: number]: {name: string, products: Product[]}} = {};
      
      subcategoryProductData.forEach(({ subcategoryId, parentId, parentName, products }) => {
        if (!parentProductMap[parentId]) {
          parentProductMap[parentId] = {
            name: parentName,
            products: []
          };
        }
        // Add products to parent category (limit to 15 per parent)
        parentProductMap[parentId].products.push(...products);
      });
      
      // Limit each parent category to 15 products
      Object.keys(parentProductMap).forEach(parentId => {
        parentProductMap[parseInt(parentId)].products = parentProductMap[parseInt(parentId)].products.slice(0, 15);
      });
      
      // Convert to the format expected by the component
      const productMap: {[key: number]: Product[]} = {};
      const parentNames: {[key: number]: string} = {};
      
      Object.keys(parentProductMap).forEach(parentId => {
        const id = parseInt(parentId);
        productMap[id] = parentProductMap[id].products;
        parentNames[id] = parentProductMap[id].name;
      });
      
      setData(prev => ({ 
        ...prev, 
        subcategoryProducts: productMap,
        parentCategoryNames: parentNames,
        loadingSubcategories: false 
      }));
    } catch (error) {
      console.error("❌ Error fetching all products:", error);
      setData(prev => ({ 
        ...prev, 
        subcategories: [],
        subcategoryProducts: {},
        parentCategoryNames: {},
        loadingSubcategories: false 
      }));
    }
  }, [selectedCategory, isDeals, categories, storeId]);

  // Main effect to handle data fetching
  useEffect(() => {
    if (isDeals) {
      fetchDealsProducts();
    } else if (selectedCategory === null) {
      fetchAllProducts();
    } else {
      fetchSubcategoryProducts();
    }
  }, [selectedCategory, isDeals]); // Removed function dependencies to prevent unnecessary re-runs

  return data;
};
