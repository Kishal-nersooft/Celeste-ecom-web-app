"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { getProducts } from "@/lib/api";

export default function TestPricingPage() {
  const { user, loading: authLoading } = useAuth();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testPricing = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      console.log('🧪 Testing Pricing Fix...');
      
      // Test getProducts with pricing
      const products = await getProducts(
        null, // categoryIds
        1,    // page
        3,    // pageSize
        true, // onlyDiscounted
        true, // includeCategories
        true, // includePricing
        true, // includeInventory
        [1],  // storeIds
        undefined, // latitude
        undefined  // longitude
      );
      
      console.log(`📊 Products returned: ${products.length}`);
      
      const productsWithPricing = products.filter(p => p.pricing !== null).length;
      
      setResults({
        totalProducts: products.length,
        productsWithPricing: productsWithPricing,
        successRate: ((productsWithPricing / products.length) * 100).toFixed(1),
        products: products,
        firstProduct: products[0] || null
      });
      
    } catch (error: any) {
      console.error('Test error:', error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="p-8 text-center">Loading authentication...</div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded p-6">
          <h1 className="text-2xl font-bold text-red-800 mb-4">❌ Not Authenticated</h1>
          <p className="text-red-700">Please sign in to your web app first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">🧪 Test Pricing Fix</h1>
      
      <div className="mb-6">
        <button
          onClick={testPricing}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
        >
          {loading ? "Testing..." : "Test Pricing Fix"}
        </button>
      </div>

      {results && (
        <div className="space-y-6">
          {results.error ? (
            <div className="bg-red-50 border border-red-200 rounded p-6">
              <h2 className="text-xl font-semibold text-red-800 mb-2">❌ Error</h2>
              <p className="text-red-700">{results.error}</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">📊 Test Results</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{results.totalProducts}</div>
                    <div className="text-sm text-gray-600">Total Products</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{results.productsWithPricing}</div>
                    <div className="text-sm text-gray-600">With Pricing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{results.successRate}%</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                </div>
              </div>

              {/* First Product Details */}
              {results.firstProduct && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">🔍 First Product Analysis</h2>
                  <div className="space-y-2">
                    <p><strong>Name:</strong> {results.firstProduct.name}</p>
                    <p><strong>Base Price:</strong> {results.firstProduct.base_price}</p>
                    <p><strong>Pricing:</strong> {results.firstProduct.pricing ? 'Present' : 'NULL'}</p>
                    
                    {results.firstProduct.pricing ? (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                        <h3 className="font-semibold text-green-800 mb-2">🎉 SUCCESS! Pricing Data:</h3>
                        <div className="space-y-1 text-sm">
                          <p><strong>Base Price:</strong> {results.firstProduct.pricing.base_price}</p>
                          <p><strong>Final Price:</strong> {results.firstProduct.pricing.final_price}</p>
                          <p><strong>Discount Applied:</strong> {results.firstProduct.pricing.discount_applied}</p>
                          <p><strong>Discount Percentage:</strong> {results.firstProduct.pricing.discount_percentage}%</p>
                          <p><strong>Applied Price Lists:</strong> {results.firstProduct.pricing.applied_price_lists?.join(', ') || 'None'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                        <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Pricing Still NULL</h3>
                        <p className="text-sm">The pricing calculation may not be working properly.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* All Products */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">📋 All Products</h2>
                <div className="space-y-2">
                  {results.products.map((product: any, index: number) => (
                    <div key={product.id} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <span className="font-medium">{product.name}</span>
                        <span className="text-gray-500 ml-2">(ID: {product.id})</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Base: {product.base_price}</div>
                        <div className={`text-sm ${product.pricing ? 'text-green-600' : 'text-red-600'}`}>
                          {product.pricing ? `Final: ${product.pricing.final_price}` : 'NULL'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">📋 Instructions</h2>
        <div className="space-y-2 text-sm">
          <p><strong>This test will:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Fetch 3 discounted products</li>
            <li>Check if pricing data is calculated automatically</li>
            <li>Show detailed pricing information if available</li>
          </ul>
          <p className="mt-4"><strong>Expected result:</strong> All products should have pricing data with discounts applied.</p>
        </div>
      </div>
    </div>
  );
}
