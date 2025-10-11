"use client";

import React, { useState, useEffect } from "react";
import { getProductsWithPricing } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { useAuth } from "@/components/FirebaseAuthProvider";

export default function TestDealsCategory() {
  const { user, loading: authLoading } = useAuth();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [dealsProducts, setDealsProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      testDealsCategory();
    }
  }, [user, authLoading]);

  const testDealsCategory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("🧪 Testing deals category filtering...");
      
      // Get all products with pricing data
      const allProductsResponse = await getProductsWithPricing(
        null, // All categories
        1,    // page
        50,   // pageSize
        false, // Show all products
        true, // includeCategories
        true, // includeInventory
        [1, 2, 3, 4] // storeIds
      );
      
      console.log("📦 All products:", allProductsResponse);
      setAllProducts(allProductsResponse);
      
      // Apply the same filtering logic as the deals category
      const dealsProductsFiltered = allProductsResponse.filter(product => 
        product.pricing && 
        product.pricing.discount_applied !== null && 
        product.pricing.discount_applied !== undefined && 
        product.pricing.discount_applied > 0
      );
      
      console.log("🎯 Deals products (filtered):", dealsProductsFiltered);
      setDealsProducts(dealsProductsFiltered);
      
    } catch (err) {
      console.error("🧪 Error testing deals category:", err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Deals Category</h1>
        <p>Loading authentication...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Deals Category</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p><strong>Authentication Required:</strong> Please sign in to test deals category.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Deals Category</h1>
        <p>Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Deals Category</h1>
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
      <h1 className="text-3xl font-bold mb-4">Testing Deals Category Filtering</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Results Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-semibold text-blue-800">Total Products</h3>
            <p className="text-2xl font-bold">{allProducts.length}</p>
            <p className="text-sm">All products with pricing data</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <h3 className="font-semibold text-green-800">Deals Category</h3>
            <p className="text-2xl font-bold">{dealsProducts.length}</p>
            <p className="text-sm">Only discounted products (Black BG)</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <h3 className="font-semibold text-gray-800">Regular Products</h3>
            <p className="text-2xl font-bold">{regularProducts.length}</p>
            <p className="text-sm">Products without discounts (Gray BG)</p>
          </div>
        </div>
      </div>

      {dealsProducts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-green-600">
            ✅ Deals Category Products (Should show ONLY these when deals is selected)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {dealsProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          
          <div className="mt-4 bg-green-50 border border-green-200 rounded p-3">
            <h4 className="font-semibold text-green-800 mb-2">Deals Category Details:</h4>
            <p className="text-sm text-green-700 mb-2">
              <strong>Filtering Logic:</strong> Only products with discount_applied > 0
            </p>
            <div className="text-sm text-green-700">
              {dealsProducts.slice(0, 3).map((product) => (
                <div key={product.id}>
                  <strong>{product.name}:</strong> {product.pricing.discount_percentage}% off (Save Rs. {product.pricing.discount_applied})
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {regularProducts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-600">
            Regular Products (Should NOT appear in deals category)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {regularProducts.slice(0, 12).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {dealsProducts.length === 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p><strong>No discounted products found for deals category.</strong></p>
          <p>This could mean:</p>
          <ul className="list-disc list-inside mt-2">
            <li>No products have discount_applied > 0</li>
            <li>Pricing data is not being fetched correctly</li>
            <li>Authentication issues preventing pricing data</li>
          </ul>
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded p-4">
        <h4 className="font-semibold text-blue-800 mb-2">How Deals Category Works:</h4>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>User clicks "Deals" in category selector</li>
          <li>ProductList component sets <code>isDealsSelected = true</code></li>
          <li>Fetches all products with pricing data</li>
          <li>Filters to only products with <code>discount_applied > 0</code></li>
          <li>Shows only discounted products with black background</li>
          <li>Regular products are completely hidden from deals category</li>
        </ol>
      </div>

      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-4">
        <h4 className="font-semibold text-yellow-800 mb-2">Expected Behavior:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• <strong>Deals Category:</strong> Shows ONLY products with discount_applied > 0</li>
          <li>• <strong>Other Categories:</strong> Show all products with proper discount styling</li>
          <li>• <strong>All Products:</strong> Show all products with proper discount styling</li>
        </ul>
      </div>
    </div>
  );
}
