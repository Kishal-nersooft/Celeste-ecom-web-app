"use client";

import React, { useState, useEffect } from "react";
import { getProductsWithPricing } from "@/lib/api";

export default function TestPricingFixPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testPricing = async () => {
      try {
        console.log("🧪 Testing pricing fix...");
        
        // Test with only discounted products
        const discountedProducts = await getProductsWithPricing(
          null, // categoryIds
          1,    // page
          5,    // pageSize (small for testing)
          true, // onlyDiscounted
          true, // includeCategories
          true, // includeInventory
          [1, 2, 3, 4] // storeIds
        );
        
        console.log("🧪 Discounted products result:", discountedProducts);
        setProducts(discountedProducts);
        
      } catch (err) {
        console.error("🧪 Error testing pricing:", err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    testPricing();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Pricing Fix</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Pricing Fix</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p><strong>Error:</strong> {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Testing Pricing Fix</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Results</h2>
        <p className="text-gray-600">
          Found {products.length} discounted products with pricing data
        </p>
      </div>

      {products.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Discounted Products:</h3>
          {products.map((product) => (
            <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{product.name}</h4>
                  <p className="text-gray-600 text-sm">ID: {product.id}</p>
                  {product.categories && product.categories.length > 0 && (
                    <p className="text-gray-500 text-sm">
                      Categories: {product.categories.map((cat: any) => cat.name).join(', ')}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {product.pricing ? (
                    <div>
                      <div className="text-sm text-gray-500">
                        Original: Rs. {product.pricing.base_price}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        Rs. {product.pricing.final_price}
                      </div>
                      {product.pricing.discount_applied > 0 && (
                        <div className="text-sm text-red-600">
                          Save Rs. {product.pricing.discount_applied} ({product.pricing.discount_percentage}% off)
                        </div>
                      )}
                      {product.pricing.applied_price_lists && product.pricing.applied_price_lists.length > 0 && (
                        <div className="text-xs text-blue-600 mt-1">
                          {product.pricing.applied_price_lists.join(', ')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500">No pricing data</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {products.length === 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>No discounted products found. This could mean:</p>
          <ul className="list-disc list-inside mt-2">
            <li>No products have discounts configured</li>
            <li>There's an issue with the pricing calculation</li>
            <li>The API is not returning the expected data</li>
          </ul>
        </div>
      )}
    </div>
  );
}
