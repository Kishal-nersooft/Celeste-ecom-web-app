"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { getProducts } from "@/lib/api";
import Title from "@/components/Title";

const AuthTestPage = () => {
  const { user, backendUser, loading } = useAuth();
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const testAPI = async () => {
    setTesting(true);
    try {
      // Test fetching discounted products
      const products = await getProducts(null, 1, 5, true, true, true);
      
      setTestResults({
        success: true,
        productCount: products.length,
        firstProduct: products[0] || null,
        hasPricing: products[0]?.pricing ? true : false,
        pricingData: products[0]?.pricing || null
      });
    } catch (error: any) {
      setTestResults({
        success: false,
        error: error.message
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Title className="!text-3xl mb-6">Authentication Test Page</Title>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auth Status */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Firebase User:</span>
                <span className={user ? "text-green-600" : "text-red-600"}>
                  {user ? "✅ Signed In" : "❌ Not Signed In"}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium">Backend User:</span>
                <span className={backendUser ? "text-green-600" : "text-red-600"}>
                  {backendUser ? "✅ Authenticated" : "❌ Not Authenticated"}
                </span>
              </div>
              
              {backendUser && (
                <div className="mt-4 p-3 bg-gray-100 rounded">
                  <div className="text-sm">
                    <div><strong>User ID:</strong> {backendUser.user_id}</div>
                    <div><strong>Tier ID:</strong> {backendUser.tier_id}</div>
                    <div><strong>Access Token:</strong> {backendUser.access_token ? "✅ Present" : "❌ Missing"}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* API Test */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">API Test</h2>
          
          <button
            onClick={testAPI}
            disabled={testing || !backendUser}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {testing ? "Testing..." : "Test Discounted Products API"}
          </button>
          
          {!backendUser && (
            <p className="text-sm text-gray-500 mt-2">
              Please sign in to test the API
            </p>
          )}
          
          {testResults && (
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <h3 className="font-medium mb-2">Test Results:</h3>
              <div className="text-sm space-y-1">
                <div><strong>Success:</strong> {testResults.success ? "✅" : "❌"}</div>
                {testResults.success ? (
                  <>
                    <div><strong>Products Found:</strong> {testResults.productCount}</div>
                    <div><strong>Has Pricing:</strong> {testResults.hasPricing ? "✅" : "❌"}</div>
                    {testResults.pricingData && (
                      <div className="mt-2">
                        <strong>Pricing Data:</strong>
                        <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(testResults.pricingData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div><strong>Error:</strong> {testResults.error}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
        <div className="flex flex-wrap gap-4">
          <a href="/sign-up-phone" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Sign Up with Phone
          </a>
          <a href="/sign-in-phone" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Sign In with Phone
          </a>
          <a href="/deals" className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
            View Deals Page
          </a>
        </div>
      </div>
    </div>
  );
};

export default AuthTestPage;
