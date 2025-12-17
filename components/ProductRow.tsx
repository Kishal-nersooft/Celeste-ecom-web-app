"use client";
import { Product } from "../store";
import React, { useRef, useState } from "react";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props {
  products: Product[];
  categoryName: string;
  categoryId: string;
  loading?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoaded?: boolean;
  onScrollIntoView?: () => void;
}

const ProductRow = ({
  products,
  categoryName,
  categoryId,
  loading = false,
  loadingMore = false,
  onLoadMore,
  hasMore = false,
  isLoaded = false,
  onScrollIntoView,
}: Props) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const router = useRouter();

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Check scroll buttons on mount and when products change
  React.useEffect(() => {
    checkScrollButtons();
  }, [products]);

  // Intersection Observer for lazy loading
  React.useEffect(() => {
    if (!onScrollIntoView || isLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onScrollIntoView();
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% of the element is visible
        rootMargin: '50px', // Start loading 50px before the element comes into view
      }
    );

    if (rowRef.current) {
      observer.observe(rowRef.current);
    }

    return () => {
      if (rowRef.current) {
        observer.unobserve(rowRef.current);
      }
    };
  }, [onScrollIntoView, isLoaded]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const cardWidth = 200; // Approximate width of each product card + gap
      scrollContainerRef.current.scrollBy({
        left: -cardWidth * 3, // Scroll by 3 cards at a time
        behavior: "smooth",
      });
      // Update button states after scroll
      setTimeout(checkScrollButtons, 300);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const cardWidth = 200; // Approximate width of each product card + gap
      const container = scrollContainerRef.current;
      const { scrollLeft, scrollWidth, clientWidth } = container;

      // Check if we're near the end of the scroll
      const isNearEnd = scrollLeft >= scrollWidth - clientWidth - cardWidth * 2;

      // If we're near the end and there are more products to load, load more
      if (isNearEnd && hasMore && !loadingMore && onLoadMore) {
        onLoadMore();
      }

      // Scroll by 3 cards at a time
      container.scrollBy({
        left: cardWidth * 3,
        behavior: "smooth",
      });

      // Update button states after scroll
      setTimeout(checkScrollButtons, 300);
    }
  };

  // Show all products in the scrollable view, filtering out invalid products
  const visibleProducts = products.filter(
    (product) =>
      product &&
      product.id &&
      product.name &&
      typeof product.id === "number" &&
      typeof product.name === "string"
  );

  // Debug logging for ProductRow
  console.log(`🛍️ ProductRow - ${categoryName}:`, {
    productsCount: products.length,
    visibleProductsCount: visibleProducts.length,
    loading,
    isLoaded,
    categoryId
  });

  const handleSeeAllClick = () => {
    if (typeof window !== 'undefined') {
      // Store subcategory products and info for caching
      sessionStorage.setItem(
        `subcategory_${categoryId}_products`,
        JSON.stringify(products)
      );
      sessionStorage.setItem(`subcategory_${categoryId}_name`, categoryName);
      sessionStorage.setItem(`subcategory_${categoryId}_id`, categoryId);

      // Store parent category info for back navigation
      // We need to get the parent category ID from the current context
      // This will be set by the parent component that knows the parent category
      const parentCategoryId = (window as any).currentParentCategoryId;
      if (parentCategoryId) {
        sessionStorage.setItem(
          `subcategory_${categoryId}_parent_id`,
          parentCategoryId.toString()
        );
      }

      // For "all" category, redirect to a special route or handle differently
      if (categoryId === "all") {
        // You might want to create a special route for "all products" or handle this differently
        console.log("See all products clicked - all products already displayed");
        return;
      }

      // Check if this is a parent category from "All" view
      const isParentCategoryFromAll = (window as any).isParentCategoryFromAll;
      if (isParentCategoryFromAll) {
        // Store source tracking for back button behavior
        sessionStorage.setItem('category_source', 'all');
        // Navigate to parent category page
        router.push(`/categories/${categoryId}`);
      } else {
        // Regular subcategory navigation
        router.push(`/categories/${categoryId}`);
      }
    }
  };

  return (
    <div ref={rowRef} className="mb-4 sm:mb-6 md:mb-8">
      {/* Header with category name and See All button */}
      <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
        <h2 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-semibold text-gray-600">{categoryName}</h2>
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
          <button
            onClick={handleSeeAllClick}
            className="text-blue-600 hover:text-blue-800 font-medium text-[10px] sm:text-xs md:text-sm transition-colors"
          >
            See All
          </button>
          <div className="flex gap-0.5 sm:gap-1">
            <button
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              className={`p-1 sm:p-1.5 md:p-2 rounded-full transition-colors ${
                canScrollLeft
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={scrollRight}
              disabled={(!canScrollRight && !hasMore) || loadingMore}
              className={`p-1 sm:p-1.5 md:p-2 rounded-full transition-colors ${
                (canScrollRight || hasMore) && !loadingMore
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {loadingMore ? (
                <div className="w-3 h-3 sm:w-3 sm:h-3 md:w-4 md:h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable product container */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollButtons}
          className="flex gap-2 sm:gap-2.5 md:gap-3 overflow-x-auto scrollbar-hide pb-4 scroll-smooth"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {!isLoaded && loading
            ? // Show skeleton cards for initial loading
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px]"
                >
                  <ProductCardSkeleton />
                </div>
              ))
            : !isLoaded
            ? // Show skeleton cards when not loaded yet
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`skeleton-unloaded-${index}`}
                  className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px]"
                >
                  <ProductCardSkeleton />
                </div>
              ))
            : visibleProducts.map((product) => (
                <motion.div
                  key={product?.id}
                  layout
                  initial={{ opacity: 0.2 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px]"
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}

          {/* Show skeleton for loading more */}
          {loadingMore &&
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`loading-more-${index}`}
                className="flex-shrink-0 w-[180px] sm:w-[200px]"
              >
                <ProductCardSkeleton />
              </div>
            ))}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ProductRow;
