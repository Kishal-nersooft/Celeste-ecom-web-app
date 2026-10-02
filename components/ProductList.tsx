"use client";
import React, { useState, useEffect, useRef } from "react";
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
import { HOME_PAGE_SIZE, INITIAL_VISIBLE_PARENT_CATEGORIES, INITIAL_VISIBLE_SUBCATEGORIES } from "@/lib/home-catalogue-constants";
import LazyMount from "./LazyMount";

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
              className="flex-shrink-0 w-[120px] sm:w-[140px] md:w-[160px] lg:w-[180px]"
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

  const [storeCategoryId, setStoreCategoryId] = useState<number | null>(
    selectedCategoryId ?? null
  );
  const [storeIsDeals, setStoreIsDeals] = useState(isDealsSelected ?? false);

  // Store pages keep their own category so the home catalogue selection stays put.
  const selectedCategory = storeId
    ? storeIsDeals
      ? null
      : storeCategoryId
    : contextCategoryId;
  const isDeals = storeId ? storeIsDeals : contextIsDeals;

  const handleCategorySelect = (
    categoryId: number | null,
    dealsSelected: boolean = false,
    categoryName?: string
  ) => {
    if (storeId) {
      setStoreIsDeals(dealsSelected);
      setStoreCategoryId(dealsSelected ? null : categoryId);
      return;
    }

    const name =
      categoryName ??
      (categoryId != null
        ? categories.find((c) => c.id === categoryId)?.name
        : undefined);
    setSelectedCategory(categoryId, dealsSelected, name);
    setLastVisitedCategory(categoryId, dealsSelected);
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
    loadParentCategoryProducts,
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

  const [visibleSubcategoryCount, setVisibleSubcategoryCount] = useState(
    INITIAL_VISIBLE_SUBCATEGORIES
  );
  const subcategorySentinelRef = useRef<HTMLDivElement>(null);
  const visibleSubcategoryCountRef = useRef(visibleSubcategoryCount);
  const subcategoriesRef = useRef(subcategories);
  const selectedCategoryRef = useRef(selectedCategory);
  const loadSubcategoryProductsRef = useRef(loadSubcategoryProducts);
  visibleSubcategoryCountRef.current = visibleSubcategoryCount;
  subcategoriesRef.current = subcategories;
  selectedCategoryRef.current = selectedCategory;
  loadSubcategoryProductsRef.current = loadSubcategoryProducts;

  useEffect(() => {
    setVisibleSubcategoryCount(INITIAL_VISIBLE_SUBCATEGORIES);
  }, [selectedCategory]);

  const visibleSubcategories = subcategories.slice(0, visibleSubcategoryCount);
  const visibleSubcategoryLoadKey = visibleSubcategories
    .map(
      (subcategory) =>
        `${subcategory.id}:${loadedSubcategories[subcategory.id] ? "1" : "0"}`
    )
    .join(",");

  useEffect(() => {
    if (!selectedCategory || !visibleSubcategoryLoadKey) return;
    const subs = subcategoriesRef.current.slice(
      0,
      visibleSubcategoryCountRef.current
    );
    const belongsToSelection = subs.every(
      (subcategory) =>
        subcategory.parent_category_id == null ||
        subcategory.parent_category_id === selectedCategory
    );
    if (!belongsToSelection) return;

    subs.forEach((subcategory) => {
      loadSubcategoryProductsRef.current(subcategory.id);
    });
  }, [selectedCategory, visibleSubcategoryLoadKey]);

  useEffect(() => {
    const sentinel = subcategorySentinelRef.current;
    if (!sentinel || visibleSubcategoryCount >= subcategories.length) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;

      const parentId = selectedCategoryRef.current;
      const subs = subcategoriesRef.current;
      const count = visibleSubcategoryCountRef.current;
      const next = subs[count];
      if (!next || count >= subs.length) return;
      if (
        next.parent_category_id != null &&
        next.parent_category_id !== parentId
      ) {
        return;
      }

      // Stop this observation before revealing the row. The effect
      // re-attaches after paint, so another row loads only if the
      // sentinel is still on screen.
      observer.disconnect();
      loadSubcategoryProductsRef.current(next.id);
      setVisibleSubcategoryCount(count + 1);
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [selectedCategory, subcategories.length, visibleSubcategoryCount]);

  const allParentCategories = categories.filter((cat) => !cat.parent_category_id);
  const [visibleParentCount, setVisibleParentCount] = useState(
    INITIAL_VISIBLE_PARENT_CATEGORIES
  );
  const parentSentinelRef = useRef<HTMLDivElement>(null);
  const visibleParentCountRef = useRef(visibleParentCount);
  const allParentCategoriesRef = useRef(allParentCategories);
  const parentLoadLockRef = useRef(false);
  const loadParentCategoryProductsRef = useRef(loadParentCategoryProducts);
  visibleParentCountRef.current = visibleParentCount;
  allParentCategoriesRef.current = allParentCategories;
  loadParentCategoryProductsRef.current = loadParentCategoryProducts;

  const catalogueLocationKey = shouldUseLocation
    ? `${defaultAddress?.latitude ?? ""}:${defaultAddress?.longitude ?? ""}`
    : "no-location";

  useEffect(() => {
    setVisibleParentCount(INITIAL_VISIBLE_PARENT_CATEGORIES);
  }, [catalogueLocationKey, storeId]);

  useEffect(() => {
    if (selectedCategory !== null || isDeals || loading) return;
    const sentinel = parentSentinelRef.current;
    const parents = allParentCategoriesRef.current;
    if (!sentinel || visibleParentCount >= parents.length) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || parentLoadLockRef.current) return;

      const nextIndex = visibleParentCountRef.current;
      const next = allParentCategoriesRef.current[nextIndex];
      if (!next) return;

      // One parent at a time. The effect re-attaches after that row settles,
      // and loads another only if the sentinel is still on screen.
      observer.disconnect();
      parentLoadLockRef.current = true;
      void loadParentCategoryProductsRef
        .current(next.id)
        .finally(() => {
          parentLoadLockRef.current = false;
          setVisibleParentCount(nextIndex + 1);
        });
    }, { rootMargin: "300px" });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    storeId,
    selectedCategory,
    isDeals,
    loading,
    visibleParentCount,
    allParentCategories.length,
  ]);

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
      <Categories
        onSelectCategory={handleCategorySelect}
        categories={categories}
        controlledCategoryId={
          storeId ? (storeIsDeals ? -1 : storeCategoryId) : undefined
        }
        controlledIsDeals={storeId ? storeIsDeals : undefined}
      />

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
            <>
              {subcategories.slice(0, visibleSubcategoryCount).map((subcategory) => {
                if (typeof window !== 'undefined') {
                  (window as any).currentParentCategoryId = selectedCategory;
                }
                const subcategoryProductsList = subcategoryProducts[subcategory.id] || [];
                const isLoaded = loadedSubcategories[subcategory.id] || false;
                const isLoading = loadingSubcategories[subcategory.id] || false;

                if (isLoaded && !isLoading && subcategoryProductsList.length === 0) {
                  return null;
                }

                return (
                  <ProductRow
                    key={subcategory.id}
                    products={subcategoryProductsList}
                    categoryName={subcategory.name}
                    categoryId={subcategory.id.toString()}
                    loading={isLoading}
                    loadingMore={false}
                    hasMore={false}
                    isLoaded={isLoaded}
                  />
                );
              })}
              {visibleSubcategoryCount < subcategories.length && (
                <div ref={subcategorySentinelRef} className="h-px w-full" aria-hidden />
              )}
            </>
          ) : loading ? (
            <CategoryProductsSkeleton rows={2} />
          ) : null}
        </div>
      ) : (
        <div>
          {(() => {
            const openedParents = allParentCategories.slice(0, visibleParentCount);
            const displayedParents = openedParents.filter((cat) => {
              const categoryProducts = parentProducts[cat.id];
              return Array.isArray(categoryProducts) && categoryProducts.length > 0;
            });
            const sentinel =
              visibleParentCount < allParentCategories.length && !loading ? (
                <div ref={parentSentinelRef} className="h-px w-full" aria-hidden />
              ) : null;

            const renderRow = (cat: Category) => {
              const categoryProducts = parentProducts[cat.id] || [];
              if (typeof window !== "undefined") {
                (window as any).isParentCategoryFromAll = true;
              }
              return (
                <ProductRow
                  key={cat.id}
                  products={categoryProducts}
                  categoryName={cat.name}
                  categoryId={String(cat.id)}
                  loading={false}
                  loadingMore={loadingMore}
                  onLoadMore={loadMore}
                  hasMore={hasMore}
                  isLoaded
                />
              );
            };

            if (storeId) {
              if (displayedParents.length === 0) {
                return loading ? (
                  <>
                    <CategoryProductsSkeleton rows={2} />
                    {sentinel}
                  </>
                ) : (
                  sentinel
                );
              }

              return (
                <>
                  {displayedParents.map((cat, index) => (
                    <React.Fragment key={cat.id}>
                      {renderRow(cat)}
                      {index === 1 ? <OfferBannerSlider /> : null}
                    </React.Fragment>
                  ))}
                  {sentinel}
                </>
              );
            }

            if (displayedParents.length === 0) {
              return loading ? (
                <>
                  <CategoryProductsSkeleton rows={2} />
                  {sentinel}
                </>
              ) : (
                sentinel
              );
            }

            if (displayedParents.length < 2) {
              return (
                <>
                  {displayedParents.map(renderRow)}
                  {sentinel}
                </>
              );
            }

            const [first, second, ...rest] = displayedParents;
            const tail = rest.length >= 3 ? rest.slice(3) : rest.slice(1);

            return (
              <>
                <div className="flex flex-col md:flex-row md:gap-6 md:items-stretch">
                  <div className="flex-1 min-w-0">
                    {renderRow(first)}
                    {renderRow(second)}
                  </div>
                  <div className="hidden md:flex md:flex-col md:w-[20%] flex-shrink-0 self-stretch min-h-0">
                    <CategoryRowAdSlot imageUrl={promotionBanner1} alt="Promotion Banner 1" />
                  </div>
                </div>
                <LazyMount skeletonCount={3}>
                  <OfferBannerSlider />
                </LazyMount>
                {rest[0] ? renderRow(rest[0]) : null}
                {rest.length >= 3 ? (
                  <div className="flex flex-col md:flex-row md:gap-6 md:items-stretch">
                    <div className="flex-1 min-w-0">
                      {renderRow(rest[1])}
                      {renderRow(rest[2])}
                    </div>
                    <div className="hidden md:flex md:flex-col md:w-[20%] flex-shrink-0 self-stretch min-h-0">
                      <CategoryRowAdSlot imageUrl={promotionBanner2} alt="Promotion Banner 2" />
                    </div>
                  </div>
                ) : null}
                {tail.map(renderRow)}
                {sentinel}
              </>
            );
          })()}
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
