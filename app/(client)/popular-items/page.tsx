"use client";

import React, { useEffect, useState } from "react";
import Container from "@/components/Container";
import PopularProductCard from "@/components/PopularProductCard";
import { getPopularProducts } from "@/lib/api";
import { POPULAR_PRODUCTS_MODE } from "@/lib/popular-products-config";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useLocation } from "@/contexts/LocationContext";
import { Product } from "@/store";
import Loader from "@/components/Loader";
import { motion } from "framer-motion";

export default function PopularItemsPage() {
  const { user, loading: authLoading } = useAuth();
  const { deliveryType, defaultAddress, selectedStore } = useLocation();
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Determine storeIds and location based on delivery type
        let storeIds: number[] | undefined;
        let latitude: number | undefined;
        let longitude: number | undefined;

        if (deliveryType === 'pickup') {
          // For pickup mode, use selected store ID
          if (selectedStore?.id) {
            storeIds = [parseInt(selectedStore.id.toString())];
            console.log("🛍️ PopularItemsPage: Using pickup mode with store ID:", storeIds[0]);
          } else {
            // Fallback to default stores if no store selected
            storeIds = [1, 2, 3, 4];
            console.log("🛍️ PopularItemsPage: Using pickup mode with default stores:", storeIds);
          }
        } else {
          // For delivery mode, use location coordinates
          if (defaultAddress?.latitude && defaultAddress?.longitude) {
            latitude = parseFloat(defaultAddress.latitude);
            longitude = parseFloat(defaultAddress.longitude);
            console.log("🚚 PopularItemsPage: Using delivery mode with location:", { latitude, longitude });
          } else {
            console.log("⚠️ PopularItemsPage: Delivery mode but no location available yet");
            setError("Please select a delivery location to view popular items");
            setLoading(false);
            return;
          }
        }

        // Fetch all popular products using the configured mode (max 100 products)
        console.log("🔥 PopularItemsPage: Fetching products with mode:", POPULAR_PRODUCTS_MODE);
        console.log("📋 PopularItemsPage: Request params:", {
          mode: POPULAR_PRODUCTS_MODE,
          storeIds,
          latitude,
          longitude,
          deliveryType
        });
        
        let products = await getPopularProducts(
          POPULAR_PRODUCTS_MODE, // mode from config
          100, // limit (max allowed)
          undefined, // timeWindowDays
          undefined, // categoryIds
          1, // minInteractions (minimum allowed by API)
          true, // includePricing
          true, // includeCategories
          false, // includeTags
          true, // includeInventory
          true, // includePopularityMetrics
          storeIds, // storeIds (for pickup) or undefined (for delivery)
          latitude, // latitude (for delivery)
          longitude // longitude (for delivery)
        );
        
        console.log("✅ PopularItemsPage: Received products:", products?.length || 0);
        
        // If no products with current mode, try 'trending' as fallback
        if (products.length === 0 && POPULAR_PRODUCTS_MODE !== 'trending') {
          console.log("🔄 PopularItemsPage: No products with current mode, trying 'trending' as fallback...");
          products = await getPopularProducts(
            'trending', // Fallback to trending
            100,
            undefined,
            undefined,
            1, // minInteractions
            true,
            true,
            false,
            true,
            true,
            storeIds,
            latitude,
            longitude
          );
          console.log("✅ PopularItemsPage: Fallback received products:", products?.length || 0);
        }
        
        if (Array.isArray(products) && products.length > 0) {
          setPopularProducts(products);
        } else {
          console.warn("⚠️ PopularItemsPage: No products returned from API");
          setPopularProducts([]);
        }
      } catch (error) {
        console.error("❌ Error fetching popular products:", error);
        setError(error instanceof Error ? error.message : 'An error occurred while fetching popular items');
        setPopularProducts([]);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchProducts();
    }
  }, [user, authLoading, deliveryType, defaultAddress, selectedStore]);

  if (authLoading || loading) {
    return <Loader />;
  }

  return (
    <Container className="pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Popular Items</h1>
        <p className="text-gray-600">Discover our most popular products</p>
        
        {error && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <p className="font-semibold">⚠️ {error}</p>
            {deliveryType === 'delivery' && !defaultAddress && (
              <p className="text-sm mt-1">
                Please select a delivery location from the header to view popular items in your area.
              </p>
            )}
          </div>
        )}
        
        {popularProducts.length > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            {popularProducts.length} popular items available
          </p>
        )}
      </div>
      
      {popularProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {popularProducts.map((product) => (
            <motion.div
              key={product?.id}
              layout
              initial={{ opacity: 0.2 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PopularProductCard product={product} />
            </motion.div>
          ))}
        </div>
      ) : (
        !loading && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No popular items found</p>
          </div>
        )
      )}
    </Container>
  );
}

