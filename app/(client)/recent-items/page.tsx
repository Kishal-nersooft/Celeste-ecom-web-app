"use client";

import React, { useEffect, useState } from "react";
import Container from "@/components/Container";
import ProductGrid from "@/components/ProductGrid";
import { getRecentProducts } from "@/lib/api";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useLocation } from "@/contexts/LocationContext";
import { Product } from "@/store";
import Loader from "@/components/Loader";
import { useRouter } from "next/navigation";

export default function RecentItemsPage() {
  const { user, loading: authLoading } = useAuth();
  const { deliveryType, defaultAddress, selectedStore } = useLocation();
  const router = useRouter();
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/sign-in");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchProducts = async () => {
      // Don't fetch if user is not authenticated
      if (!user || authLoading) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Determine location based on delivery type
        let latitude: number | undefined;
        let longitude: number | undefined;

        if (deliveryType === 'pickup') {
          // For pickup mode, we don't send location (store_id is handled by backend based on auth)
          latitude = undefined;
          longitude = undefined;
          console.log("🛍️ RecentItemsPage: Using pickup mode");
        } else {
          // For delivery mode, use location coordinates
          if (defaultAddress?.latitude && defaultAddress?.longitude) {
            latitude = parseFloat(defaultAddress.latitude);
            longitude = parseFloat(defaultAddress.longitude);
            console.log("🚚 RecentItemsPage: Using delivery mode with location:", { latitude, longitude });
          } else {
            console.log("⚠️ RecentItemsPage: Delivery mode but no location available yet");
            setError("Please select a delivery location to view recent items");
            setLoading(false);
            return;
          }
        }

        // Fetch all recent products (max 100)
        console.log("🔄 RecentItemsPage: Fetching recent products...");
        const products = await getRecentProducts(
          100, // limit (max allowed)
          true, // includePricing
          true, // includeCategories
          false, // includeTags
          true, // includeInventory
          latitude, // latitude (for delivery)
          longitude // longitude (for delivery)
        );
        
        console.log("✅ RecentItemsPage: Received products:", products?.length || 0);
        
        if (Array.isArray(products) && products.length > 0) {
          setRecentProducts(products);
        } else {
          console.warn("⚠️ RecentItemsPage: No products returned from API");
          setRecentProducts([]);
        }
      } catch (error) {
        console.error("❌ Error fetching recent products:", error);
        setError(error instanceof Error ? error.message : 'An error occurred while fetching recent items');
        setRecentProducts([]);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchProducts();
    }
  }, [user, authLoading, deliveryType, defaultAddress, selectedStore]);

  if (authLoading) {
    return <Loader />;
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <Container className="pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Recently Bought</h1>
        <p className="text-gray-600">Products you've purchased recently</p>
        
        {error && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <p className="font-semibold">⚠️ {error}</p>
            {deliveryType === 'delivery' && !defaultAddress && (
              <p className="text-sm mt-1">
                Please select a delivery location from the header to view recent items in your area.
              </p>
            )}
          </div>
        )}
        
        {recentProducts.length > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            {recentProducts.length} recent items available
          </p>
        )}
      </div>
      
      {loading ? (
        <ProductGrid products={[]} loading={true} />
      ) : recentProducts.length > 0 ? (
        <ProductGrid products={recentProducts} />
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">No recent purchases found</p>
          <p className="text-gray-400 text-sm mt-2">Start shopping to see your recent items here!</p>
        </div>
      )}
    </Container>
  );
}

