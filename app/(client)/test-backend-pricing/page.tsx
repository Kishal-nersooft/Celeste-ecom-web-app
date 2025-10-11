"use client";

import React, { useState, useEffect } from "react";
import { getProductsWithPricing } from "@/lib/api";

export default function TestBackendPricingPage() {
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [discountedProducts, setDiscountedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testBackendPricing = async () => {
      try {
        console.log("🧪 Testing backend pricing integration...");
        
        // Test 1: Get all products with pricing
        console.log("📦 Test 1: Getting all products with pricing...");
        const allProductsResponse = await getProductsWithPricing(
          null, // All categories
          1,    // page
          10,   // pageSize
          false, // Show all products
          true, // includeCategories
          true, // includeInventory
          [1, 2, 3, 4] // storeIds
        );
        
        console.log("📦 All products result:", allProductsResponse);
        setAllProducts(allProductsResponse);
        
        // Test 2: Get only discounted products
        console.log("🎯 Test 2: Getting only discounted products...");
        const discountedProductsResponse = await getProductsWithPricing(
          null, // All categories
          1,    // page
          10,   // pageSize
          true, // onlyDiscounted=true
          true, // includeCategories
          true, // includeInventory
          [1, 2, 3, 4] // storeIds
        );
        
        console.log("🎯 Discounted products result:", discountedProductsResponse);
        setDiscountedProducts(discountedProductsResponse);
        
      } catch (err) {
        console.error("🧪 Error testing backend pricing:", err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    testBackendPricing();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Backend Pricing Integration</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Backend Pricing Integration</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p><strong>Error:</strong> {error}</p>
        </div>
      </div>
    );
  }

  const allProductsWithPricing = allProducts.filter(p => p.pricing !== null);
  const allProductsWithoutPricing = allProducts.filter(p => p.pricing === null);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Testing Backend Pricing Integration</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Test Results</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-semibold text-blue-800">All Products Test</h3>
            <p>Total: {allProducts.length}</p>
            <p>With Pricing: {allProductsWithPricing.length}</p>
            <p>Without Pricing: {allProductsWithoutPricing.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <h3 className="font-semibold text-green-800">Discounted Products Test</h3>
            <p>Total: {discountedProducts.length}</p>
            <p>All have pricing: {discountedProducts.every(p => p.pricing !== null) ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>

      {allProducts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Sample All Products (First 3)</h3>
          <div className="space-y-4">
            {allProducts.slice(0, 3).map((product) => (
              <div key={product.id} className="bg-white border border-gray-200 rounded p-4">
                <h4 className="font-semibold">{product.name}</h4>
                <p className="text-sm text-gray-600">ID: {product.id}</p>
                <p className="text-sm text-gray-600">Base Price: {product.base_price}</p>
                {product.pricing ? (
                  <div className="mt-2 p-2 bg-green-50 rounded">
                    <p className="text-sm font-semibold text-green-800">✅ Has Pricing Data</p>
                    <p className="text-xs">Final Price: {product.pricing.final_price}</p>
                    <p className="text-xs">Discount: {product.pricing.discount_applied}</p>
                    <p className="text-xs">Percentage: {product.pricing.discount_percentage}%</p>
                  </div>
                ) : (
                  <div className="mt-2 p-2 bg-red-50 rounded">
                    <p className="text-sm font-semibold text-red-800">❌ No Pricing Data</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {discountedProducts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Discounted Products (First 3)</h3>
          <div className="space-y-4">
            {discountedProducts.slice(0, 3).map((product) => (
              <div key={product.id} className="bg-white border border-gray-200 rounded p-4">
                <h4 className="font-semibold">{product.name}</h4>
                <p className="text-sm text-gray-600">ID: {product.id}</p>
                <p className="text-sm text-gray-600">Base Price: {product.base_price}</p>
                {product.pricing && (
                  <div className="mt-2 p-2 bg-green-50 rounded">
                    <p className="text-sm font-semibold text-green-800">✅ Discounted Product</p>
                    <p className="text-xs">Final Price: {product.pricing.final_price}</p>
                    <p className="text-xs">Discount: {product.pricing.discount_applied}</p>
                    <p className="text-xs">Percentage: {product.pricing.discount_percentage}%</p>
                    <p className="text-xs">Price Lists: {product.pricing.applied_price_lists?.join(', ')}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded p-4">
        <h4 className="font-semibold text-yellow-800 mb-2">Expected Behavior:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Backend API should return pricing data when include_pricing=true</li>
          <li>• only_discounted=true should filter to only products with discounts</li>
          <li>• No individual API calls should be made for pricing</li>
          <li>• All data should come from the main products API</li>
        </ul>
      </div>
    </div>
  );
}
