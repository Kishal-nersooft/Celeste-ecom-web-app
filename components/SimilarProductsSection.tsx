"use client";
import React, { useEffect, useState } from "react";
import ProductRow from "./ProductRow";
import { Product } from "../store";
import { getSimilarProducts } from "../lib/api";
import { useLocation } from "../contexts/LocationContext";
import { catalogueStockQuery } from "@/lib/catalogue-location";

interface SimilarProductsSectionProps {
  productId: number | string;
}

const SimilarProductsSection: React.FC<SimilarProductsSectionProps> = ({ productId }) => {
  const { deliveryType, defaultAddress, selectedStore, isLocationLoading } = useLocation();
  const stockQuery = catalogueStockQuery({
    deliveryType,
    isLocationLoading,
    defaultAddress,
    selectedStore,
  });
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!stockQuery.ready) {
        setLoading(true);
        return;
      }

      try {
        setLoading(true);

        // Fetch similar products (using default limit of 10)
        const products = await getSimilarProducts(
          productId,
          10, // limit (default)
          0.5, // min_similarity (default)
          true, // includePricing
          true, // includeCategories
          true, // includeTags
          true, // includeInventory
          stockQuery.storeIds,
          stockQuery.latitude,
          stockQuery.longitude
        );
        
        
        if (Array.isArray(products) && products.length > 0) {
          setSimilarProducts(products);
        } else {
          console.warn("⚠️ SimilarProducts: No products returned from API");
          setSimilarProducts([]);
        }
      } catch (error) {
        console.error("❌ Error fetching similar products:", error);
        setSimilarProducts([]);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProducts();
    }
  }, [productId, stockQuery.ready, stockQuery.latitude, stockQuery.longitude, stockQuery.storeIds?.[0]]);

  // Hide section if no products and not loading
  if (!loading && similarProducts.length === 0) {
    return null;
  }

  return (
    <div className="w-full py-8">
      {/* Product Row */}
      <ProductRow
        products={similarProducts}
        categoryName="Similar Products"
        categoryId="similar"
        loading={loading}
        isLoaded={!loading && similarProducts.length > 0}
      />
    </div>
  );
};

export default SimilarProductsSection;

