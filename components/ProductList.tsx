"use client";
import React, { useState, useEffect } from "react";
import ProductGrid from "./ProductGrid";
import ProductRow from "./ProductRow";
import ProductCardSkeleton from "./ProductCardSkeleton";
import Categories, { Category } from "./Categories";
import { Product } from "../store";
import DiscountBanner from "./DiscountBanner";
import OfferBannerSlider from "./OfferBannerSlider";
import CategoryRowAdSlot, { type CategoryRowAdSlotProps } from "./CategoryRowAdSlot";
import promotionBanner1 from "@/images/Celeste-Promotio-Banner---1---Website---716x400-px.png";
import promotionBanner2 from "@/images/Celeste-Promotio-Banner---2---Website---716x400-px.png";
import {
  getProducts,
  getProductsWithPricing,
  getSubcategories,
  getProductsBySubcategoryWithPricing,
} from "../lib/api";
import { usePaginatedProducts } from "../hooks/usePaginatedProducts";
import { useCategory } from "../contexts/CategoryContext";
import { useLocation } from "../contexts/LocationContext";
import { HOME_PAGE_SIZE } from "@/lib/home-catalogue-constants";
import { stripCategoryEmojis } from "@/lib/category-display-name";

const CategoryProductsSkeleton = ({ rows = 2 }: { rows?: number }) => (
  <div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`category-skeleton-row-${rowIndex}`} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-2 sm:gap-2.5 md:gap-3 overflow-hidden pb-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`category-skeleton-card-${rowIndex}-${index}`}
              className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px]"
            >
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

interface Props {
  products: Product[];
  categories: Category[];
  title?: boolean;
  storeId?: number; // Optional store ID for filtering
  selectedCategoryId?: number | null; // Selected category ID from parent
  isDealsSelected?: boolean; // Whether deals is selected from parent
  initialParentCategoryNames?: { [key: number]: string };
  initialParentProducts?: { [key: number]: Product[] };
}

const ProductList = ({
  products,
  categories,
  title,
  storeId,
  selectedCategoryId,
  isDealsSelected,
  initialParentCategoryNames,
  initialParentProducts,
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
    isDealsSelected: boolean = false,
    categoryName?: string
  ) => {
    if (storeId) {
    } else {
      const name =
        categoryName ??
        (categoryId != null
          ? categories.find((c) => c.id === categoryId)?.name
          : undefined);
      setSelectedCategory(categoryId, isDealsSelected, name);
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
    pageSize: HOME_PAGE_SIZE,
    latitude: shouldUseLocation ? defaultAddress?.latitude : undefined,
    longitude: shouldUseLocation ? defaultAddress?.longitude : undefined,
    initialProducts: products,
    initialParentCategoryNames,
    initialParentProducts,
  });

  // Clean console logs - only show once when data changes
  React.useEffect(() => {
    if (
      validProducts.length > 0 &&
      typeof window !== 'undefined' &&
      validProducts.length !== (window as any).lastProductCount
    ) {
      (window as any).lastProductCount = validProducts.length;
    }
  }, [validProducts.length, categories.length]);

  // Debug logging for All and Deals categories

  return (
    <div>
      {/* Add Categories component - only show on homepage (when storeId is not provided) */}
      {!storeId && (
        <Categories
          onSelectCategory={handleCategorySelect}
          categories={categories}
        />
      )}

      {/* Discount Banner - only show on homepage when "All" category is selected */}
      {!storeId && selectedCategory === null && !isDeals && (
        <div className="mt-6 mb-10">
          <DiscountBanner />
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
            <CategoryProductsSkeleton rows={2} />
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
                      {stripCategoryEmojis(parentCategory.name) || parentCategory.name}
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
            (() => {
              const parentIds = Object.keys(parentCategoryNames);
              const isHomepageAll = !storeId;

              // Homepage "All": first 2 category rows with ad on the right (Option A)
              if (isHomepageAll && parentIds.length >= 2) {
                const [firstId, secondId, ...restIds] = parentIds;
                const firstName = parentCategoryNames[parseInt(firstId)] || "Unknown Category";
                const secondName = parentCategoryNames[parseInt(secondId)] || "Unknown Category";
                const firstProducts = parentProducts[parseInt(firstId)] || [];
                const secondProducts = parentProducts[parseInt(secondId)] || [];

                if (typeof window !== "undefined") {
                  (window as any).isParentCategoryFromAll = true;
                }

                return (
                  <>
                    <div className="flex flex-col md:flex-row md:gap-6 md:items-stretch">
                      <div className="flex-1 min-w-0">
                        <ProductRow
                          products={firstProducts}
                          categoryName={firstName}
                          categoryId={firstId}
                          loading={loading}
                          loadingMore={loadingMore}
                          onLoadMore={loadMore}
                          hasMore={hasMore}
                          isLoaded={!loading && firstProducts.length > 0}
                        />
                        <ProductRow
                          products={secondProducts}
                          categoryName={secondName}
                          categoryId={secondId}
                          loading={loading}
                          loadingMore={loadingMore}
                          onLoadMore={loadMore}
                          hasMore={hasMore}
                          isLoaded={!loading && secondProducts.length > 0}
                        />
                      </div>
                      <div className="hidden md:flex md:flex-col md:w-[20%] flex-shrink-0 self-stretch min-h-0">
                        <CategoryRowAdSlot imageUrl={promotionBanner1} alt="Promotion Banner 1" />
                      </div>
                    </div>
                    <OfferBannerSlider />
                    {/* 3rd category: single full-width row */}
                    {restIds.length > 0 && (() => {
                      const thirdId = restIds[0];
                      const thirdName = parentCategoryNames[parseInt(thirdId)] || "Unknown Category";
                      const thirdProducts = parentProducts[parseInt(thirdId)] || [];
                      return (
                        <ProductRow
                          key={thirdId}
                          products={thirdProducts}
                          categoryName={thirdName}
                          categoryId={thirdId}
                          loading={loading}
                          loadingMore={loadingMore}
                          onLoadMore={loadMore}
                          hasMore={hasMore}
                          isLoaded={!loading && thirdProducts.length > 0}
                        />
                      );
                    })()}
                    {/* 4th and 5th category rows with ad on the right (same layout as 1st & 2nd) */}
                    {restIds.length >= 3 && (() => {
                      const fourthId = restIds[1];
                      const fifthId = restIds[2];
                      const fourthName = parentCategoryNames[parseInt(fourthId)] || "Unknown Category";
                      const fifthName = parentCategoryNames[parseInt(fifthId)] || "Unknown Category";
                      const fourthProducts = parentProducts[parseInt(fourthId)] || [];
                      const fifthProducts = parentProducts[parseInt(fifthId)] || [];
                      return (
                        <div key={`ad-block-${fourthId}-${fifthId}`} className="flex flex-col md:flex-row md:gap-6 md:items-stretch">
                          <div className="flex-1 min-w-0">
                            <ProductRow
                              products={fourthProducts}
                              categoryName={fourthName}
                              categoryId={fourthId}
                              loading={loading}
                              loadingMore={loadingMore}
                              onLoadMore={loadMore}
                              hasMore={hasMore}
                              isLoaded={!loading && fourthProducts.length > 0}
                            />
                            <ProductRow
                              products={fifthProducts}
                              categoryName={fifthName}
                              categoryId={fifthId}
                              loading={loading}
                              loadingMore={loadingMore}
                              onLoadMore={loadMore}
                              hasMore={hasMore}
                              isLoaded={!loading && fifthProducts.length > 0}
                            />
                          </div>
                          <div className="hidden md:flex md:flex-col md:w-[20%] flex-shrink-0 self-stretch min-h-0">
                            <CategoryRowAdSlot imageUrl={promotionBanner2} alt="Promotion Banner 2" />
                          </div>
                        </div>
                      );
                    })()}
                    {/* 6th category onward: full-width rows */}
                    {restIds.slice(3).map((parentId) => {
                      const parentCategoryName =
                        parentCategoryNames[parseInt(parentId)] || "Unknown Category";
                      const categoryProducts = parentProducts[parseInt(parentId)] || [];
                      if (typeof window !== "undefined") {
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
                    })}
                  </>
                );
              }

              // Store page or fewer than 2 categories: original layout
              return parentIds.map((parentId, index) => {
                const parentCategoryName =
                  parentCategoryNames[parseInt(parentId)] || "Unknown Category";
                const categoryProducts = parentProducts[parseInt(parentId)] || [];

                if (typeof window !== "undefined") {
                  (window as any).isParentCategoryFromAll = true;
                }

                return (
                  <React.Fragment key={parentId}>
                    <ProductRow
                      products={categoryProducts}
                      categoryName={parentCategoryName}
                      categoryId={parentId}
                      loading={loading}
                      loadingMore={loadingMore}
                      onLoadMore={loadMore}
                      hasMore={hasMore}
                      isLoaded={!loading && categoryProducts.length > 0}
                    />
                    {index === 1 && <OfferBannerSlider />}
                  </React.Fragment>
                );
              });
            })()
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
