"use client";

import React, { useState, useEffect } from "react";
import { getProductsWithPricing } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { useAuth } from "@/components/FirebaseAuthProvider";

export default function TestDiscountFiltering() {
  const { user, loading: authLoading } = useAuth();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [discountedProducts, setDiscountedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      testDiscountFiltering();
    }
  }, [user, authLoading]);

  const testDiscountFiltering = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("🧪 Testing discount filtering...");
      
      // Get all products with pricing data
      const allProductsResponse = await getProductsWithPricing(
        null, // All categories
        1,    // page
        20,   // pageSize
        false, // Show all products
        true, // includeCategories
        true, // includeInventory
        [1, 2, 3, 4] // storeIds
      );
      
      console.log("📦 All products:", allProductsResponse);
      setAllProducts(allProductsResponse);
      
      // Filter to only products with discount_applied > 0
      const discountedProductsFiltered = allProductsResponse.filter(product => 
        product.pricing && 
        product.pricing.discount_applied !== null && 
        product.pricing.discount_applied !== undefined && 
        product.pricing.discount_applied > 0
      );
      
      console.log("🎯 Discounted products (filtered):", discountedProductsFiltered);
      setDiscountedProducts(discountedProductsFiltered);
      
    } catch (err) {
      console.error("🧪 Error testing discount filtering:", err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Discount Filtering</h1>
        <p>Loading authentication...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Discount Filtering</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p><strong>Authentication Required:</strong> Please sign in to test discount filtering.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Discount Filtering</h1>
        <p>Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Discount Filtering</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p><strong>Error:</strong> {error}</p>
        </div>
      </div>
    );
  }

  const regularProducts = allProducts.filter(product => 
    !product.pricing || 
    product.pricing.discount_applied === null || 
    product.pricing.discount_applied === undefined || 
    product.pricing.discount_applied === 0
  );

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Testing Discount Filtering</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Results Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-semibold text-blue-800">Total Products</h3>
            <p className="text-2xl font-bold">{allProducts.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <h3 className="font-semibold text-green-800">Discounted Products</h3>
            <p className="text-2xl font-bold">{discountedProducts.length}</p>
            <p className="text-sm">(Black background)</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <h3 className="font-semibold text-gray-800">Regular Products</h3>
            <p className="text-2xl font-bold">{regularProducts.length}</p>
            <p className="text-sm">(Gray background)</p>
          </div>
        </div>
      </div>

      {discountedProducts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-green-600">
            ✅ Discounted Products (Should have BLACK background)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {discountedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          
          <div className="mt-4 bg-green-50 border border-green-200 rounded p-3">
            <h4 className="font-semibold text-green-800 mb-2">Discount Details:</h4>
            {discountedProducts.slice(0, 3).map((product) => (
              <div key={product.id} className="text-sm text-green-700">
                <strong>{product.name}:</strong> {product.pricing.discount_percentage}% off (Save Rs. {product.pricing.discount_applied})
              </div>
            ))}
          </div>
        </div>
      )}

      {regularProducts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-600">
            Regular Products (Should have GRAY background)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {regularProducts.slice(0, 12).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {discountedProducts.length === 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p><strong>No discounted products found.</strong></p>
          <p>This could mean:</p>
          <ul className="list-disc list-inside mt-2">
            <li>No products have discount_applied > 0</li>
            <li>Pricing data is not being fetched correctly</li>
            <li>Authentication issues preventing pricing data</li>
          </ul>
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded p-4">
        <h4 className="font-semibold text-blue-800 mb-2">Expected Behavior:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Products with <strong>discount_applied > 0</strong> should have <strong>black background</strong></li>
          <li>• Products with <strong>discount_applied = 0 or null</strong> should have <strong>gray background</strong></li>
          <li>• Deals page should show <strong>only discounted products</strong></li>
          <li>• Homepage and subcategories should show <strong>all products</strong> with proper styling</li>
        </ul>
      </div>
    </div>
  );
}
