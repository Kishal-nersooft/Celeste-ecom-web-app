"use client";
import { Product } from "../store";
import React, { memo, useMemo } from "react";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  products: Product[];
  loading?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const ProductGrid = memo(
  ({
    products,
    loading = false,
    loadingMore = false,
    onLoadMore,
    hasMore = false,
  }: Props) => {
    // Memoize skeleton loading
    const skeletonGrid = useMemo(
      () => (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ),
      []
    );

    // Show skeleton loading for initial load
    if (loading && products.length === 0) {
      return skeletonGrid;
    }

    return (
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {products?.map((product) => (
            <motion.div
              key={product?.id} // Use product.id as the key
              layout
              initial={{ opacity: 0.2 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}

          {/* Show skeleton for loading more */}
          {loadingMore &&
            Array.from({ length: 6 }).map((_, index) => (
              <ProductCardSkeleton key={`loading-${index}`} />
            ))}
        </div>

        {/* Load More Button */}
        {hasMore && !loadingMore && products.length > 0 && (
          <div className="text-center mt-6">
            <button
              onClick={onLoadMore}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Load More Products
            </button>
          </div>
        )}
      </div>
    );
  }
);

ProductGrid.displayName = "ProductGrid";

export default ProductGrid;
