"use client";

import React, { useEffect, useState } from "react";
import Container from "@/components/Container";
import ProductGrid from "@/components/ProductGrid";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { getRecentProducts } from "@/lib/api";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useLocation } from "@/contexts/LocationContext";
import { Product } from "@/store";
import Loader from "@/components/Loader";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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
    <div className="bg-gray-100 min-h-screen">
      <Container className="py-3 sm:py-4">
        {/* Header with Go Back Button - same as category page */}
        <div className="flex items-center mb-3 sm:mb-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mr-3 sm:mr-4"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            <span className="font-medium text-sm sm:text-base truncate">Recently Bought</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
            <p className="font-semibold">⚠️ {error}</p>
            {deliveryType === "delivery" && !defaultAddress && (
              <p className="text-sm mt-1">
                Please select a delivery location from the header to view recent items in your area.
              </p>
            )}
          </div>
        )}

        {/* White box - same as category page, no left sidebar, no "X products found" */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4 md:mb-6">
            Recently Bought
          </h1>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="w-full">
                  <ProductCardSkeleton />
                </div>
              ))}
            </div>
          ) : recentProducts.length > 0 ? (
            <ProductGrid products={recentProducts} />
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No recent purchases found</p>
              <p className="text-gray-400 text-sm mt-2">Start shopping to see your recent items here!</p>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}

