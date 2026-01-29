"use client";
import React, { useEffect, useState } from "react";
import ProductRow from "./ProductRow";
import { Product } from "../store";
import { getSimilarProducts } from "../lib/api";
import { useLocation } from "../contexts/LocationContext";

interface SimilarProductsSectionProps {
  productId: number | string;
}

const SimilarProductsSection: React.FC<SimilarProductsSectionProps> = ({ productId }) => {
  const { deliveryType, defaultAddress, selectedStore } = useLocation();
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Determine location based on delivery type
        let latitude: number | undefined;
        let longitude: number | undefined;
        let storeIds: number[] | undefined;

        if (deliveryType === 'pickup') {
          // For pickup mode, use selected store if available
          if (selectedStore?.id) {
            storeIds = [parseInt(selectedStore.id.toString(), 10)];
          }
          latitude = undefined;
          longitude = undefined;
          console.log("🛍️ SimilarProducts: Using pickup mode with store:", selectedStore?.id);
        } else {
          // For delivery mode, use location coordinates
          if (defaultAddress?.latitude && defaultAddress?.longitude) {
            latitude = parseFloat(defaultAddress.latitude);
            longitude = parseFloat(defaultAddress.longitude);
            console.log("🚚 SimilarProducts: Using delivery mode with location:", { latitude, longitude });
          } else {
            console.log("⚠️ SimilarProducts: Delivery mode but no location available");
            // Still fetch without location - API will handle it
            latitude = undefined;
            longitude = undefined;
          }
        }

        // Fetch similar products (using default limit of 10)
        console.log("🔄 SimilarProducts: Fetching similar products for product ID:", productId);
        const products = await getSimilarProducts(
          productId,
          10, // limit (default)
          0.5, // min_similarity (default)
          true, // includePricing
          true, // includeCategories
          true, // includeTags
          true, // includeInventory
          storeIds, // storeIds (for pickup mode)
          latitude, // latitude (for delivery)
          longitude // longitude (for delivery)
        );
        
        console.log("✅ SimilarProducts: Received products:", products?.length || 0);
        
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
  }, [productId, deliveryType, defaultAddress, selectedStore]);

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

