"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/FirebaseAuthProvider";

export default function TestSimplePricingPage() {
  const { user, loading: authLoading } = useAuth();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSimplePricing = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      console.log('🧪 Testing Simple Pricing Calculation...');
      
      // Test products that we know have discounts
      const testProducts = [
        { id: 6285, name: "Brown Sugar 1Kg - Star Gold" },
        { id: 6286, name: "Caterer'S Dark Super Fine Choco 400G" },
        { id: 6287, name: "Mixed Fruit Nectar 1L" }
      ];
      
      const pricingResults = [];
      
      for (const product of testProducts) {
        try {
          console.log(`Testing product ${product.id}: ${product.name}`);
          
          const response = await fetch('/api/calculate-pricing', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              productId: product.id,
              tierId: 1, // Bronze tier
              quantity: 1
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            pricingResults.push({
              product: product,
              success: true,
              data: data
            });
            console.log(`✅ Product ${product.id} pricing:`, data);
          } else {
            const errorData = await response.json();
            pricingResults.push({
              product: product,
              success: false,
              error: errorData.error
            });
            console.log(`❌ Product ${product.id} error:`, errorData);
          }
        } catch (error: any) {
          pricingResults.push({
            product: product,
            success: false,
            error: error.message
          });
          console.error(`❌ Product ${product.id} error:`, error);
        }
      }
      
      setResults({
        totalProducts: testProducts.length,
        successfulCalculations: pricingResults.filter(r => r.success).length,
        results: pricingResults
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
      <h1 className="text-3xl font-bold mb-8">🧪 Test Simple Pricing</h1>
      
      <div className="mb-6">
        <button
          onClick={testSimplePricing}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
        >
          {loading ? "Testing..." : "Test Simple Pricing Calculation"}
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
                    <div className="text-2xl font-bold text-green-600">{results.successfulCalculations}</div>
                    <div className="text-sm text-gray-600">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {((results.successfulCalculations / results.totalProducts) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">🔍 Detailed Results</h2>
                <div className="space-y-4">
                  {results.results.map((result: any, index: number) => (
                    <div key={index} className={`p-4 rounded border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <h3 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                        {result.success ? '✅' : '❌'} {result.product.name} (ID: {result.product.id})
                      </h3>
                      
                      {result.success ? (
                        <div className="mt-2">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><strong>Base Price:</strong> {result.data.data.base_price}</p>
                              <p><strong>Final Price:</strong> {result.data.data.final_price}</p>
                              <p><strong>Savings:</strong> {result.data.data.savings}</p>
                            </div>
                            <div>
                              <p><strong>Discount Type:</strong> {result.data.data.applied_discounts?.[0]?.discount_type || 'N/A'}</p>
                              <p><strong>Discount Value:</strong> {result.data.data.applied_discounts?.[0]?.discount_value || 'N/A'}%</p>
                              <p><strong>Price List:</strong> {result.data.data.applied_discounts?.[0]?.price_list_name || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p className="text-red-700"><strong>Error:</strong> {result.error}</p>
                        </div>
                      )}
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
            <li>Test pricing calculation for 3 specific products</li>
            <li>Use the pricing calculation API directly</li>
            <li>Show detailed pricing information including discounts</li>
          </ul>
          <p className="mt-4"><strong>Expected result:</strong> All products should show pricing with discounts applied.</p>
        </div>
      </div>
    </div>
  );
}
