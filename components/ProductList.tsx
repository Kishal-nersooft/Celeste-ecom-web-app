"use client";
import React, { useState, useEffect } from "react";
import ProductGrid from "./ProductGrid";
import ProductRow from "./ProductRow";
import ProductCardSkeleton from "./ProductCardSkeleton";
import Categories, { Category } from "./Categories";
import { Product } from "../store";
import DiscountBanner from "./DiscountBanner";
import {
  getProducts,
  getProductsWithPricing,
  getSubcategories,
  getProductsBySubcategoryWithPricing,
} from "../lib/api";
import { usePaginatedProducts } from "../hooks/usePaginatedProducts";
import { useCategory } from "../contexts/CategoryContext";
import { useLocation } from "../contexts/LocationContext";
import Loader from "./Loader";

interface Props {
  products: Product[];
  categories: Category[];
  title?: boolean;
  storeId?: number; // Optional store ID for filtering
  selectedCategoryId?: number | null; // Selected category ID from parent
  isDealsSelected?: boolean; // Whether deals is selected from parent
}

const ProductList = ({
  products,
  categories,
  title,
  storeId,
  selectedCategoryId,
  isDealsSelected,
}: Props) => {
  // Use category context for global state management
  const {
    selectedCategoryId: contextCategoryId,
    isDealsSelected: contextIsDeals,
    setSelectedCategory,
    setLastVisitedCategory,
  } = useCategory();

  // Use location context for inventory data
  const { defaultAddress, isLocationLoading, isLocationReady, deliveryType } = useLocation();

  // Filter out invalid products to prevent errors
  const validProducts = products.filter(
    (product) =>
      product &&
      product.id &&
      product.name &&
      typeof product.id === "number" &&
      typeof product.name === "string"
  );

  // Use context values if available, otherwise fall back to props (for store pages)
  const selectedCategory = storeId
    ? (selectedCategoryId ?? null)
    : contextCategoryId;
  const isDeals = storeId ? (isDealsSelected ?? false) : contextIsDeals;

  // Category selection handler
  const handleCategorySelect = (
    categoryId: number | null,
    isDealsSelected: boolean = false
  ) => {
    if (storeId) {
      // For store pages, we don't use context
      console.log("📦 ProductList - Store page category selection:", {
        categoryId,
        isDealsSelected,
      });
    } else {
      // For homepage, use context
      setSelectedCategory(categoryId, isDealsSelected);
      setLastVisitedCategory(categoryId, isDealsSelected);
    }
  };

  // Use paginated products hook for efficient lazy loading
  // Only pass location (lat/lng) when in delivery mode, not for pickup
  const shouldUseLocation = deliveryType === 'delivery' && !storeId;
  
  const {
    products: paginatedProducts,
    subcategories,
    parentCategoryNames,
    parentProducts,
    subcategoryProducts,
    loadedSubcategories,
    loadingSubcategories,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    loadSubcategoryProducts,
    preloadNextSubcategories,
    currentPage,
    totalProducts,
  } = usePaginatedProducts({
    selectedCategory,
    isDeals,
    storeId,
    categories,
    pageSize: 60, // Increased page size to show more products per category
    latitude: shouldUseLocation ? defaultAddress?.latitude : undefined,
    longitude: shouldUseLocation ? defaultAddress?.longitude : undefined,
  });

  // Clean console logs - only show once when data changes
  React.useEffect(() => {
    if (
      validProducts.length > 0 &&
      typeof window !== 'undefined' &&
      validProducts.length !== (window as any).lastProductCount
    ) {
      console.log(
        "📦 ProductList - Products:",
        validProducts.length,
        "Categories:",
        categories.length
      );
      (window as any).lastProductCount = validProducts.length;
    }
  }, [validProducts.length, categories.length]);

  // Debug logging for All and Deals categories
  console.log("📦 ProductList - Current state:", {
    selectedCategory,
    isDeals,
    validProductsCount: validProducts.length,
    parentCategoryNamesCount: Object.keys(parentCategoryNames).length,
    parentProductsCount: Object.keys(parentProducts).length,
    loading,
    parentCategoryNames,
    parentProductsKeys: Object.keys(parentProducts)
  });

  return (
    <div>
      {/* Add Categories component - only show on homepage (when storeId is not provided) */}
      {!storeId && <Categories onSelectCategory={handleCategorySelect} />}

      {title && selectedCategory === null && !isDeals && (
        <div className="pb-5">
          <h2 className="text-2xl font-semibold text-gray-600">All Products</h2>
        </div>
      )}

      {isDeals ? (
        <div>
          <ProductRow
            products={paginatedProducts}
            categoryName="Deals & Discounts"
            categoryId="deals"
            loading={loading}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoaded={!loading && paginatedProducts.length > 0}
          />
        </div>
      ) : selectedCategory ? (
        // Show subcategories and their products when a specific category is selected
        <div>
          {subcategories.length > 0 ? (
            subcategories.map((subcategory, index) => {
              // Set parent category ID for back navigation
              if (typeof window !== 'undefined') {
                (window as any).currentParentCategoryId = selectedCategory;
              }
              const subcategoryProductsList = subcategoryProducts[subcategory.id] || [];
              const isLoaded = loadedSubcategories[subcategory.id] || false;
              const isLoading = loadingSubcategories[subcategory.id] || false;

              return (
                <ProductRow
                  key={subcategory.id}
                  products={subcategoryProductsList}
                  categoryName={subcategory.name}
                  categoryId={subcategory.id.toString()}
                  loading={isLoading}
                  loadingMore={false}
                  onLoadMore={() => {
                    loadSubcategoryProducts(subcategory.id);
                    preloadNextSubcategories(index, subcategories);
                  }}
                  hasMore={false}
                  isLoaded={isLoaded && subcategoryProductsList.length > 0}
                  onScrollIntoView={() => {
                    if (!isLoaded && !isLoading) {
                      loadSubcategoryProducts(subcategory.id);
                      preloadNextSubcategories(index, subcategories);
                    }
                  }}
                />
              );
            })
          ) : loading ? (
            <Loader />
          ) : null}
        </div>
      ) : (
        // Show all products grouped by parent categories when "All" is selected
        <div>
          {loading && Object.keys(parentCategoryNames).length === 0 ? (
            // Show skeleton cards for parent categories during initial loading
            categories
              .filter(cat => !cat.parent_category_id)
              .slice(0, 5) // Show skeleton for first 5 parent categories
              .map((parentCategory) => (
                <div key={`skeleton-${parentCategory.id}`} className="mb-8">
                  {/* Category title */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {parentCategory.name}
                    </h3>
                  </div>
                  
                  {/* Skeleton cards row */}
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={`skeleton-${parentCategory.id}-${index}`}
                        className="flex-shrink-0 w-[180px] sm:w-[200px]"
                      >
                        <ProductCardSkeleton />
                      </div>
                    ))}
                  </div>
                </div>
              ))
          ) : Object.keys(parentCategoryNames).length > 0 ? (
            Object.keys(parentCategoryNames).map((parentId) => {
              const parentCategoryName =
                parentCategoryNames[parseInt(parentId)] || "Unknown Category";
              const categoryProducts = parentProducts[parseInt(parentId)] || [];

              console.log(`📦 ProductList - Rendering category ${parentCategoryName}:`, {
                parentId,
                categoryProductsCount: categoryProducts.length,
                loading
              });

              // Set flag to indicate this is a parent category from "All" view
              if (typeof window !== 'undefined') {
                (window as any).isParentCategoryFromAll = true;
              }

              return (
                <ProductRow
                  key={parentId}
                  products={categoryProducts}
                  categoryName={parentCategoryName}
                  categoryId={parentId}
                  loading={loading}
                  loadingMore={loadingMore}
                  onLoadMore={loadMore}
                  hasMore={hasMore}
                  isLoaded={!loading && categoryProducts.length > 0}
                />
              );
            })
          ) : null}
        </div>
      )}
      
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ProductList;
