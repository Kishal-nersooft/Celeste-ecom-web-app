"use client";

import React, { useEffect, useState } from "react";
import Container from "@/components/Container";
import ProductGrid from "@/components/ProductGrid";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { getPopularProducts } from "@/lib/api";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useLocation } from "@/contexts/LocationContext";
import { Product } from "@/store";
import Loader from "@/components/Loader";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function PopularItemsPage() {
  const { user, loading: authLoading } = useAuth();
  const { deliveryType, defaultAddress, selectedStore } = useLocation();
  const router = useRouter();
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
          if (selectedStore?.id) {
            storeIds = [parseInt(selectedStore.id.toString())];
          } else {
            storeIds = [1, 2, 3, 4];
          }
        } else {
          if (defaultAddress?.latitude && defaultAddress?.longitude) {
            latitude = parseFloat(defaultAddress.latitude);
            longitude = parseFloat(defaultAddress.longitude);
          } else {
            setError("Please select a delivery location to view popular items");
            setLoading(false);
            return;
          }
        }

        const products = await getPopularProducts(
          'trending',
          100,
          undefined,
          undefined,
          1,
          true,
          true,
          false,
          true,
          true,
          storeIds,
          latitude,
          longitude
        );
        
        if (Array.isArray(products) && products.length > 0) {
          setPopularProducts(products);
        } else {
          setPopularProducts([]);
        }
      } catch (err) {
        console.error("❌ Error fetching popular products:", err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching popular items');
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
    <div className="bg-gray-100 min-h-screen">
      <Container className="py-3 sm:py-4">
        {/* Header with Go Back Button - same as category page */}
        <div className="flex items-center mb-3 sm:mb-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mr-3 sm:mr-4"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            <span className="font-medium text-sm sm:text-base truncate">Popular Items</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
            <p className="font-semibold">⚠️ {error}</p>
            {deliveryType === "delivery" && !defaultAddress && (
              <p className="text-sm mt-1">
                Please select a delivery location from the header to view popular items in your area.
              </p>
            )}
          </div>
        )}

        {/* White box - same as category page, no left sidebar, no "X products found" */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4 md:mb-6">
            Popular Items
          </h1>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="w-full">
                  <ProductCardSkeleton />
                </div>
              ))}
            </div>
          ) : popularProducts.length > 0 ? (
            <ProductGrid products={popularProducts} />
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No popular items found</p>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}

