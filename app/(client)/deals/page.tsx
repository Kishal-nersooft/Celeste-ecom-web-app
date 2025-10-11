"use client";

import React, { useEffect, useState } from "react";
import Container from "@/components/Container";
import ProductList from "@/components/ProductList";
import { getProductsWithPricing, getCategories } from "@/lib/api";
import { useAuth } from "@/components/FirebaseAuthProvider";
import Link from "next/link";

export default function DealsPage() {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<string>("Loading deals...");

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("🔍 Deals page: Starting to fetch data...");
        console.log("🔍 Deals page: User authenticated:", !!user);
        
        setLoadingProgress("Fetching product data...");
        
        // Fetch all products with pricing data first
        console.log("🔍 Deals page: Fetching all products with pricing...");
        setLoadingProgress("Loading products with pricing data...");
        const allProductsResponse = await getProductsWithPricing(null, 1, 100, false, true, true, [1, 2, 3, 4]); // Get all products first
        
        // Filter to only products with discount_applied > 0
        console.log("🔍 Deals page: Filtering for products with discounts...");
        setLoadingProgress("Filtering discounted products...");
        const productsResponse = allProductsResponse.filter(product => 
          product.pricing && 
          product.pricing.discount_applied !== null && 
          product.pricing.discount_applied !== undefined && 
          product.pricing.discount_applied > 0
        );
        console.log("🔍 Deals page: getProducts response:", productsResponse);
        
        setLoadingProgress("Loading categories...");
        console.log("🔍 Deals page: Calling getCategories...");
        const categoriesResponse = await getCategories();
        console.log("🔍 Deals page: getCategories response:", categoriesResponse);

        // Ensure products and categories are always arrays
        const productsArray = Array.isArray(productsResponse) ? productsResponse : [];
        const categoriesArray = Array.isArray(categoriesResponse) ? categoriesResponse : [];
        
        setProducts(productsArray);
        setCategories(categoriesArray);
        
        setLoadingProgress("Deals loaded successfully!");
        
        console.log(`✅ Deals page: Found ${productsArray.length} discounted products`);
        console.log(`✅ Deals page: Found ${categoriesArray.length} categories`);
        
        if (productsArray.length > 0) {
          console.log("🔍 Deals page: First product details:", {
            id: productsArray[0].id,
            name: productsArray[0].name,
            pricing: productsArray[0].pricing
          });
        }
      } catch (error) {
        console.error("❌ Deals page: Error fetching deals data:", error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <Container className="pb-10">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Loading deals...</h1>
          <p className="text-gray-600 text-center max-w-md">{loadingProgress}</p>
          <div className="mt-4 w-full max-w-md bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Deals & Discounts</h1>
        <p className="text-gray-600">Discover amazing deals on your favorite products</p>
        
        {!user && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <p className="font-semibold">Sign in to see personalized discounts!</p>
            <p className="text-sm mt-1">
              Some deals may only be visible to authenticated users.
            </p>
            <Link href="/sign-in" className="text-blue-600 hover:underline mt-2 inline-block">
              Sign In Now
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
            <Link href="/debug-auth" className="text-blue-600 hover:underline mt-2 inline-block">
              Debug Authentication
            </Link>
          </div>
        )}
        
        {products.length > 0 && (
          <p className="text-sm text-green-600 mt-2">
            🎉 {products.length} products currently on sale!
          </p>
        )}
      </div>
      
      {products.length > 0 ? (
        <ProductList title={false} products={products} categories={categories} />
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">No discounted products available at the moment.</p>
          {!user && (
            <p className="text-sm text-gray-500 mt-2">
              Try signing in to see personalized deals.
            </p>
          )}
        </div>
      )}
    </Container>
  );
}
