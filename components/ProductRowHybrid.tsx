import { Product } from "../store";
import React from "react";
import ProductRowServer from "./ProductRowServer";
import ProductRowClient from "./ProductRowClient";

interface Props {
  products: Product[];
  categoryName: string;
  categoryId: string;
  loading?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  enableSSR?: boolean; // Flag to enable/disable SSR
}

// Hybrid component that can render server-side or client-side
const ProductRowHybrid = ({
  products,
  categoryName,
  categoryId,
  loading = false,
  loadingMore = false,
  onLoadMore,
  hasMore = false,
  enableSSR = true,
}: Props) => {
  // If SSR is enabled and we have products, render server-side version
  if (enableSSR && products.length > 0 && !loading) {
    return (
      <ProductRowServer
        products={products}
        categoryName={categoryName}
        categoryId={categoryId}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
      />
    );
  }

  // Otherwise, render client-side version for interactivity
  return (
    <ProductRowClient
      products={products}
      categoryName={categoryName}
      categoryId={categoryId}
      loading={loading}
      loadingMore={loadingMore}
      onLoadMore={onLoadMore}
      hasMore={hasMore}
    />
  );
};

export default ProductRowHybrid;
