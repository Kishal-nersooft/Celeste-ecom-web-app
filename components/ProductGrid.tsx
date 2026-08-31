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
  gridClassName?: string;
  /** Center cards as a group with balanced side margins (flex wrap). */
  centered?: boolean;
  itemClassName?: string;
}

const DEFAULT_GRID_CLASS =
  "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2 md:gap-3";

const CENTERED_LAYOUT_CLASS =
  "flex flex-wrap justify-center gap-1 sm:gap-1.5 md:gap-2";

const CENTERED_ITEM_CLASS = "w-[140px] sm:w-[160px] md:w-[180px]";

const ProductGrid = memo(
  ({
    products,
    loading = false,
    loadingMore = false,
    onLoadMore,
    hasMore = false,
    gridClassName = DEFAULT_GRID_CLASS,
    centered = false,
    itemClassName = CENTERED_ITEM_CLASS,
  }: Props) => {
    const layoutClassName = centered ? CENTERED_LAYOUT_CLASS : gridClassName;

    const wrapItem = (node: React.ReactNode, key: React.Key) =>
      centered ? (
        <div key={key} className={itemClassName}>
          {node}
        </div>
      ) : (
        <React.Fragment key={key}>{node}</React.Fragment>
      );

    // Memoize skeleton loading
    const skeletonGrid = useMemo(
      () => (
        <div className={layoutClassName}>
          {Array.from({ length: 12 }).map((_, index) =>
            wrapItem(<ProductCardSkeleton />, `skeleton-${index}`)
          )}
        </div>
      ),
      [layoutClassName, centered, itemClassName]
    );

    // Show skeleton loading for initial load
    if (loading && products.length === 0) {
      return skeletonGrid;
    }

    return (
      <div>
        <div className={layoutClassName}>
          {products?.map((product) =>
            wrapItem(
              <motion.div
                layout
                initial={{ opacity: 0.2 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ProductCard product={product} />
              </motion.div>,
              product?.id
            )
          )}

          {/* Show skeleton for loading more */}
          {loadingMore &&
            Array.from({ length: 6 }).map((_, index) =>
              wrapItem(
                <ProductCardSkeleton />,
                `loading-${index}`
              )
            )}
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
