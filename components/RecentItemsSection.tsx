"use client";
import React, { useEffect, useState } from "react";
import ProductRow from "./ProductRow";
import { Product } from "../store";
import { getRecentProducts } from "../lib/api";
import { useLocation } from "../contexts/LocationContext";
import { useAuth } from "./FirebaseAuthProvider";
import Link from "next/link";

const RecentItemsSection = () => {
  const { deliveryType, defaultAddress, selectedStore } = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      // Only fetch if user is authenticated (recent products require auth)
      if (!user || authLoading) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Determine location based on delivery type
        let latitude: number | undefined;
        let longitude: number | undefined;

        if (deliveryType === 'pickup') {
          // For pickup mode, we don't send location (store_id is handled by backend based on auth)
          latitude = undefined;
          longitude = undefined;
          console.log("🛍️ RecentItems: Using pickup mode");
        } else {
          // For delivery mode, use location coordinates
          if (defaultAddress?.latitude && defaultAddress?.longitude) {
            latitude = parseFloat(defaultAddress.latitude);
            longitude = parseFloat(defaultAddress.longitude);
            console.log("🚚 RecentItems: Using delivery mode with location:", { latitude, longitude });
          } else {
            console.log("⚠️ RecentItems: Delivery mode but no location available yet");
            // Don't fetch if we don't have location for delivery mode
            setLoading(false);
            return;
          }
        }

        // Fetch recent products (limit 20 for the section)
        console.log("🔄 RecentItems: Fetching recent products...");
        const products = await getRecentProducts(
          20, // limit
          true, // includePricing
          true, // includeCategories
          false, // includeTags
          true, // includeInventory
          latitude, // latitude (for delivery)
          longitude // longitude (for delivery)
        );
        
        console.log("✅ RecentItems: Received products:", products?.length || 0);
        
        if (Array.isArray(products) && products.length > 0) {
          setRecentProducts(products);
        } else {
          console.warn("⚠️ RecentItems: No products returned from API");
          setRecentProducts([]);
        }
      } catch (error) {
        console.error("❌ Error fetching recent products:", error);
        setRecentProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [user, authLoading, deliveryType, defaultAddress, selectedStore]);

  // Don't show section if user is not authenticated
  if (!user) {
    return null;
  }

  // Don't show section if no products and not loading
  if (!loading && recentProducts.length === 0) {
    return null;
  }

  return (
    <div className="w-full pt-8 pb-2">
      {/* Header with section name and See All button */}
      {/* <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-600">
          Recently Bought
        </h2>
        <div className="flex items-center gap-2">
          <Link 
            href="/recent-items" 
            className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
          >
            See All
          </Link>
        </div>
      </div> */}

      {/* Product Row */}
      <ProductRow
        products={recentProducts}
        categoryName="Recently Bought"
        categoryId="recent"
        loading={loading}
        isLoaded={!loading && recentProducts.length > 0}
      />
    </div>
  );
};

export default RecentItemsSection;

