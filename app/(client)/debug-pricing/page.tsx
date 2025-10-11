"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { getProducts } from "@/lib/api";

export default function DebugPricingPage() {
  const { user, loading: authLoading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setDebugInfo({
        uid: user.uid,
        email: user.email,
        phoneNumber: user.phoneNumber,
        providerId: user.providerData[0]?.providerId,
        isAnonymous: user.isAnonymous,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneNumber ? true : false
      });
    }
  }, [user]);

  const testPricingAPI = async () => {
    setLoading(true);
    try {
      console.log("🔍 Testing pricing API with authentication...");
      
      const products = await getProducts(
        null, // categoryIds
        1,    // page
        3,    // pageSize
        true, // onlyDiscounted
        true, // includeCategories
        true, // includePricing
        true, // includeInventory
        [1, 2, 3, 4], // storeIds
        undefined, // latitude
        undefined  // longitude
      );
      
      console.log("API response:", products);
      
      const analysis = {
        totalProducts: products.length,
        productsWithPricing: products.filter(p => p.pricing !== null).length,
        productsWithInventory: products.filter(p => p.inventory && p.inventory.length > 0).length,
        sampleProduct: products[0] || null,
        pricingPercentage: products.length > 0 ? ((products.filter(p => p.pricing !== null).length / products.length) * 100).toFixed(1) : 0,
        inventoryPercentage: products.length > 0 ? ((products.filter(p => p.inventory && p.inventory.length > 0).length / products.length) * 100).toFixed(1) : 0
      };
      
      setTestResults(analysis);
      
    } catch (error) {
      console.error("API test error:", error);
      setTestResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="p-8 text-center">Loading authentication...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">🔐 Pricing Authentication Debug</h1>
      
      {/* Authentication Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">1. Authentication Status</h2>
        {user ? (
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <h3 className="text-green-800 font-semibold">✅ User Authenticated</h3>
            <div className="mt-2 space-y-1 text-sm">
              <p><strong>UID:</strong> {debugInfo?.uid}</p>
              <p><strong>Email:</strong> {debugInfo?.email || 'None'}</p>
              <p><strong>Phone:</strong> {debugInfo?.phoneNumber || 'None'}</p>
              <p><strong>Provider:</strong> {debugInfo?.providerId || 'Unknown'}</p>
              <p><strong>Email Verified:</strong> {debugInfo?.emailVerified ? 'Yes' : 'No'}</p>
              <p><strong>Phone Verified:</strong> {debugInfo?.phoneVerified ? 'Yes' : 'No'}</p>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <h3 className="text-red-800 font-semibold">❌ No User Authenticated</h3>
            <p className="text-red-700">Please sign in to your web app first.</p>
          </div>
        )}
      </div>

      {/* API Test */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">2. API Test</h2>
        <button
          onClick={testPricingAPI}
          disabled={!user || loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
        >
          {loading ? "Testing..." : "Test Pricing API"}
        </button>
        
        {testResults && (
          <div className="mt-4">
            {testResults.error ? (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <h3 className="text-red-800 font-semibold">❌ API Error</h3>
                <p className="text-red-700">{testResults.error}</p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h3 className="text-blue-800 font-semibold">📊 API Test Results</h3>
                <div className="mt-2 space-y-1 text-sm">
                  <p><strong>Total Products:</strong> {testResults.totalProducts}</p>
                  <p><strong>Products with Pricing:</strong> {testResults.productsWithPricing} ({testResults.pricingPercentage}%)</p>
                  <p><strong>Products with Inventory:</strong> {testResults.productsWithInventory} ({testResults.inventoryPercentage}%)</p>
                </div>
                
                {testResults.sampleProduct && (
                  <div className="mt-4">
                    <h4 className="font-semibold">Sample Product:</h4>
                    <div className="bg-gray-50 p-3 rounded mt-2">
                      <p><strong>Name:</strong> {testResults.sampleProduct.name}</p>
                      <p><strong>Base Price:</strong> {testResults.sampleProduct.base_price}</p>
                      <p><strong>Pricing:</strong> {testResults.sampleProduct.pricing ? 'Present' : 'NULL'}</p>
                      <p><strong>Inventory:</strong> {testResults.sampleProduct.inventory ? 'Present' : 'NULL'}</p>
                      
                      {testResults.sampleProduct.pricing && (
                        <div className="mt-2">
                          <h5 className="font-semibold">Pricing Details:</h5>
                          <pre className="text-xs bg-white p-2 rounded border">
                            {JSON.stringify(testResults.sampleProduct.pricing, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Troubleshooting */}
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-xl font-semibold mb-4">🔧 Troubleshooting</h2>
        <div className="space-y-2 text-sm">
          <p><strong>If pricing is still NULL:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Check if the user has a valid tier in the backend system</li>
            <li>Verify the backend is properly configured for pricing calculations</li>
            <li>Check if there are any price lists configured for the user's tier</li>
            <li>Ensure the Firebase token is being sent correctly (check Network tab)</li>
            <li>Check backend logs for any authentication or pricing errors</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
