import { Product } from "../store";
import React from "react";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Props {
  products: Product[];
  categoryName: string;
  categoryId: string;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
}

// Server-side component for initial rendering
const ProductRowServer = ({
  products,
  categoryName,
  categoryId,
  loading = false,
  loadingMore = false,
  hasMore = false,
}: Props) => {
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
    if (typeof window !== "undefined") {
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
    }
  };

  return (
    <div className="mb-8">
      {/* Header with category name and See All button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-600">{categoryName}</h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/categories/${categoryId}`}
            onClick={handleSeeAllClick}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
          >
            See All
          </Link>
          <div className="flex gap-1">
            {/* Static arrow buttons - will be enhanced by client component */}
            <button
              disabled
              className="p-2 rounded-full bg-gray-100 text-gray-400 cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={!hasMore}
              className={`p-2 rounded-full transition-colors ${
                hasMore
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
                <div
                  key={product?.id}
                  className="flex-shrink-0 w-[180px] sm:w-[200px]"
                >
                  <ProductCard product={product} />
                </div>
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

export default ProductRowServer;
