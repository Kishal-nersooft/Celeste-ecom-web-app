"use client";
import React, { useState, useEffect } from "react";
import ProductGrid from "./ProductGrid";
import ProductRow from "./ProductRow";
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
  });

  // Clean console logs - only show once when data changes
  if (
    validProducts.length > 0 &&
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
          />
        </div>
      ) : selectedCategory ? (
        // Show subcategories and their products when a specific category is selected
        <div>
          {subcategories.length > 0 ? (
            subcategories.map((subcategory, index) => {
              // Set parent category ID for back navigation
              (window as any).currentParentCategoryId = selectedCategory;
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
                  isLoaded={isLoaded}
                  onScrollIntoView={() => {
                    if (!isLoaded && !isLoading) {
                      loadSubcategoryProducts(subcategory.id);
                      preloadNextSubcategories(index, subcategories);
                    }
                  }}
                />
              );
            })
          ) : (
            <div className="text-center py-10 text-gray-500">
              {loading
                ? "Loading subcategories..."
                : "No subcategories found for this category."}
            </div>
          )}
        </div>
      ) : (
        // Show all products grouped by parent categories when "All" is selected
        <div>
          {Object.keys(parentCategoryNames).length > 0 ? (
            Object.keys(parentCategoryNames).map((parentId) => {
              const parentCategoryName =
                parentCategoryNames[parseInt(parentId)] || "Unknown Category";
              const categoryProducts = parentProducts[parseInt(parentId)] || [];

              // Set flag to indicate this is a parent category from "All" view
              (window as any).isParentCategoryFromAll = true;

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
                />
              );
            })
          ) : (
            <div className="text-center py-10 text-gray-500">
              {loading
                ? "Loading all products..."
                : "No products available at the moment."}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductList;
