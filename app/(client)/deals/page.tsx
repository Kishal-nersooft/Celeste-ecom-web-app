"use client";

import React, { useEffect, useState } from "react";
import Container from "@/components/Container";
import ProductList from "@/components/ProductList";
import { getProductsWithPricing } from "@/lib/api";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useCategory } from "@/contexts/CategoryContext";
import { useLocation } from "@/contexts/LocationContext";
import { catalogueStockQuery } from "@/lib/catalogue-location";
import { Product } from "@/store";
import Link from "next/link";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

export default function DealsPage() {
  const { user, loading: authLoading, isGuest } = useAuth();
  const { categories } = useCategory();
  const { deliveryType, defaultAddress, selectedStore, isLocationLoading } = useLocation();
  const stockQuery = catalogueStockQuery({
    deliveryType,
    isLocationLoading,
    defaultAddress,
    selectedStore,
  });
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!stockQuery.ready) return;
      try {
        const allProductsResponse = await getProductsWithPricing(
          null,
          1,
          100,
          false,
          true,
          true,
          stockQuery.storeIds,
          stockQuery.latitude,
          stockQuery.longitude
        );
        
        // Filter to only products with discount_applied > 0
        const productsResponse = allProductsResponse.filter((product: Product) => 
          product.pricing && 
          product.pricing.discount_applied !== null && 
          product.pricing.discount_applied !== undefined && 
          product.pricing.discount_applied > 0
        );

        setProducts(Array.isArray(productsResponse) ? productsResponse : []);
      } catch (error) {
        console.error("❌ Deals page: Error fetching deals data:", error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, stockQuery.ready, stockQuery.latitude, stockQuery.longitude, stockQuery.storeIds?.[0]]);

  return (
    <Container className="pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Deals & Discounts</h1>
        <p className="text-gray-600">Discover amazing deals on your favorite products</p>
        
        {!authLoading && isGuest && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <p className="font-semibold">Log in to see personalized discounts!</p>
            <p className="text-sm mt-1">
              Some deals may only be visible to authenticated users.
            </p>
            <Link href="/login" className="text-blue-600 hover:underline mt-2 inline-block">
              Log in
            </Link>
          </div>
        )}
        
        {user && (
          <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            <p className="font-semibold">✅ You're signed in!</p>
            <p className="text-sm mt-1">
              You should see all available discounts below.
            </p>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="font-semibold">Error loading deals:</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}
        
        {products.length > 0 && (
          <p className="text-sm text-green-600 mt-2">
            🎉 {products.length} products currently on sale!
          </p>
        )}
      </div>
      
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="w-full">
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <ProductList title={false} products={products} categories={categories} />
      ) : null}
    </Container>
  );
}
