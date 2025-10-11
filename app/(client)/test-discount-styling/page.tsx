"use client";

import React, { useState, useEffect } from "react";
import { getProductsWithPricing } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import ProductGrid from "@/components/ProductGrid";

export default function TestDiscountStylingPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testStyling = async () => {
      try {
        console.log("🧪 Testing discount styling...");
        
        // Get products with pricing data
        const productsResponse = await getProductsWithPricing(
          null, // All categories
          1,    // page
          20,   // pageSize (small for testing)
          false, // Show all products (not just discounted)
          true, // includeCategories
          true, // includeInventory
          [1, 2, 3, 4] // storeIds
        );
        
        console.log("🧪 Products with pricing:", productsResponse);
        setProducts(productsResponse);
        
      } catch (err) {
        console.error("🧪 Error testing styling:", err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    testStyling();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Discount Styling</h1>
        <p>Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Discount Styling</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p><strong>Error:</strong> {error}</p>
        </div>
      </div>
    );
  }

  const discountedProducts = products.filter(p => p.pricing && p.pricing.discount_applied > 0);
  const regularProducts = products.filter(p => !p.pricing || p.pricing.discount_applied === 0);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Testing Discount Styling</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Results</h2>
        <p className="text-gray-600">
          Total products: {products.length} | 
          Discounted: {discountedProducts.length} | 
          Regular: {regularProducts.length}
        </p>
      </div>

      {discountedProducts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-green-600">
            ✅ Discounted Products (should have black background)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {discountedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {regularProducts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-600">
            Regular Products (should have gray background)
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
          <p>No discounted products found. This could mean:</p>
          <ul className="list-disc list-inside mt-2">
            <li>No products have discounts configured</li>
            <li>There's an issue with the pricing calculation</li>
            <li>The API is not returning the expected data</li>
          </ul>
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded p-4">
        <h4 className="font-semibold text-blue-800 mb-2">Expected Behavior:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Discounted products should have <strong>black background</strong> with white text</li>
          <li>• Regular products should have <strong>gray background</strong> with black text</li>
          <li>• Discounted products should show discount percentage badge</li>
          <li>• This styling should appear everywhere: homepage, categories, subcategories</li>
        </ul>
      </div>
    </div>
  );
}
