"use client";
import { Product } from "../store";
import React, { useRef, useState, useEffect } from "react";
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
}

// Client-side component for interactive features
const ProductRowClient = ({
  products,
  categoryName,
  categoryId,
  loading = false,
  loadingMore = false,
  onLoadMore,
  hasMore = false,
}: Props) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    checkScrollButtons();
  }, [products]);

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

  const handleSeeAllClick = () => {
    // Store subcategory products and info for caching
    sessionStorage.setItem(
      `subcategory_${categoryId}_products`,
      JSON.stringify(products)
    );
    sessionStorage.setItem(`subcategory_${categoryId}_name`, categoryName);
    sessionStorage.setItem(`subcategory_${categoryId}_id`, categoryId);

    // Store parent category info for back navigation
    const parentCategoryId = (window as any).currentParentCategoryId;
    if (parentCategoryId) {
      sessionStorage.setItem(
        `subcategory_${categoryId}_parent_id`,
        parentCategoryId.toString()
      );
    }

    // For "all" category, redirect to a special route or handle differently
    if (categoryId === "all") {
      console.log("See all products clicked - all products already displayed");
      return;
    }

    router.push(`/categories/${categoryId}`);
  };

  return (
    <div className="mb-8">
      {/* Header with category name and See All button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-600">{categoryName}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeeAllClick}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
          >
            See All
          </button>
          <div className="flex gap-1">
            <button
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              className={`p-2 rounded-full transition-colors ${
                canScrollLeft
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={scrollRight}
              disabled={(!canScrollRight && !hasMore) || loadingMore}
              className={`p-2 rounded-full transition-colors ${
                (canScrollRight || hasMore) && !loadingMore
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {loadingMore ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ChevronRight size={16} />
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
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-4 scroll-smooth"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {loading && visibleProducts.length === 0
            ? // Show skeleton cards for initial loading
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="flex-shrink-0 w-[180px] sm:w-[200px]"
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
                  className="flex-shrink-0 w-[180px] sm:w-[200px]"
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

export default ProductRowClient;
