"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/FirebaseAuthProvider";

export default function DebugBackendPricingPage() {
  const { user, loading: authLoading } = useAuth();
  const [backendChecks, setBackendChecks] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const checkBackendPricing = async () => {
    if (!user) return;
    
    setLoading(true);
    const checks: any = {};
    
    try {
      // Get the ID token
      const idToken = await user.getIdToken();
      
      // Check 1: Price Lists
      console.log("🔍 Checking price lists...");
      try {
        const priceListsResponse = await fetch('https://celeste-api-846811285865.us-central1.run.app/pricing/price-lists', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (priceListsResponse.ok) {
          const priceListsData = await priceListsResponse.json();
          checks.priceLists = {
            status: 'success',
            count: priceListsData.length || 0,
            data: priceListsData
          };
        } else {
          const errorText = await priceListsResponse.text();
          checks.priceLists = {
            status: 'error',
            error: `${priceListsResponse.status}: ${priceListsResponse.statusText}`,
            details: errorText
          };
        }
      } catch (error: any) {
        checks.priceLists = {
          status: 'error',
          error: error.message
        };
      }
      
      // Check 2: User Tier
      console.log("🔍 Checking user tier...");
      try {
        const userTierResponse = await fetch('https://celeste-api-846811285865.us-central1.run.app/users/me/tier', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (userTierResponse.ok) {
          const userTierData = await userTierResponse.json();
          checks.userTier = {
            status: 'success',
            data: userTierData
          };
        } else {
          const errorText = await userTierResponse.text();
          checks.userTier = {
            status: 'error',
            error: `${userTierResponse.status}: ${userTierResponse.statusText}`,
            details: errorText
          };
        }
      } catch (error: any) {
        checks.userTier = {
          status: 'error',
          error: error.message
        };
      }
      
      // Check 3: Available Tiers
      console.log("🔍 Checking available tiers...");
      try {
        const tiersResponse = await fetch('https://celeste-api-846811285865.us-central1.run.app/tiers/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (tiersResponse.ok) {
          const tiersData = await tiersResponse.json();
          checks.tiers = {
            status: 'success',
            count: tiersData.length || 0,
            data: tiersData
          };
        } else {
          const errorText = await tiersResponse.text();
          checks.tiers = {
            status: 'error',
            error: `${tiersResponse.status}: ${tiersResponse.statusText}`,
            details: errorText
          };
        }
      } catch (error: any) {
        checks.tiers = {
          status: 'error',
          error: error.message
        };
      }
      
      // Check 4: Specific Product Pricing
      console.log("🔍 Checking specific product pricing...");
      try {
        const productResponse = await fetch('https://celeste-api-846811285865.us-central1.run.app/products/6285?include_pricing=true&include_inventory=true&store_id=1', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (productResponse.ok) {
          const productData = await productResponse.json();
          checks.productPricing = {
            status: 'success',
            data: productData,
            hasPricing: productData.pricing !== null,
            hasInventory: productData.inventory !== null
          };
        } else {
          const errorText = await productResponse.text();
          checks.productPricing = {
            status: 'error',
            error: `${productResponse.status}: ${productResponse.statusText}`,
            details: errorText
          };
        }
      } catch (error: any) {
        checks.productPricing = {
          status: 'error',
          error: error.message
        };
      }
      
      setBackendChecks(checks);
      
    } catch (error: any) {
      console.error("Backend check error:", error);
      setBackendChecks({ error: error.message });
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
      <h1 className="text-3xl font-bold mb-8">🔍 Backend Pricing Debug</h1>
      
      <div className="mb-6">
        <button
          onClick={checkBackendPricing}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
        >
          {loading ? "Checking Backend..." : "Check Backend Pricing Configuration"}
        </button>
      </div>

      {/* Price Lists Check */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">1. Price Lists Check</h2>
        {backendChecks.priceLists ? (
          <div className={`p-4 rounded ${backendChecks.priceLists.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className={`font-semibold ${backendChecks.priceLists.status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {backendChecks.priceLists.status === 'success' ? '✅' : '❌'} Price Lists
            </h3>
            {backendChecks.priceLists.status === 'success' ? (
              <div className="mt-2">
                <p><strong>Count:</strong> {backendChecks.priceLists.count}</p>
                {backendChecks.priceLists.count > 0 && (
                  <div className="mt-2">
                    <h4 className="font-semibold">Sample Price List:</h4>
                    <pre className="text-xs bg-white p-2 rounded border mt-1">
                      {JSON.stringify(backendChecks.priceLists.data[0], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2">
                <p><strong>Error:</strong> {backendChecks.priceLists.error}</p>
                {backendChecks.priceLists.details && (
                  <pre className="text-xs bg-white p-2 rounded border mt-1">
                    {backendChecks.priceLists.details}
                  </pre>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Click "Check Backend" to test price lists</p>
        )}
      </div>

      {/* User Tier Check */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">2. User Tier Check</h2>
        {backendChecks.userTier ? (
          <div className={`p-4 rounded ${backendChecks.userTier.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className={`font-semibold ${backendChecks.userTier.status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {backendChecks.userTier.status === 'success' ? '✅' : '❌'} User Tier
            </h3>
            {backendChecks.userTier.status === 'success' ? (
              <div className="mt-2">
                <pre className="text-xs bg-white p-2 rounded border">
                  {JSON.stringify(backendChecks.userTier.data, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="mt-2">
                <p><strong>Error:</strong> {backendChecks.userTier.error}</p>
                {backendChecks.userTier.details && (
                  <pre className="text-xs bg-white p-2 rounded border mt-1">
                    {backendChecks.userTier.details}
                  </pre>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Click "Check Backend" to test user tier</p>
        )}
      </div>

      {/* Available Tiers Check */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">3. Available Tiers Check</h2>
        {backendChecks.tiers ? (
          <div className={`p-4 rounded ${backendChecks.tiers.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className={`font-semibold ${backendChecks.tiers.status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {backendChecks.tiers.status === 'success' ? '✅' : '❌'} Available Tiers
            </h3>
            {backendChecks.tiers.status === 'success' ? (
              <div className="mt-2">
                <p><strong>Count:</strong> {backendChecks.tiers.count}</p>
                {backendChecks.tiers.count > 0 && (
                  <div className="mt-2">
                    <h4 className="font-semibold">Sample Tier:</h4>
                    <pre className="text-xs bg-white p-2 rounded border mt-1">
                      {JSON.stringify(backendChecks.tiers.data[0], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2">
                <p><strong>Error:</strong> {backendChecks.tiers.error}</p>
                {backendChecks.tiers.details && (
                  <pre className="text-xs bg-white p-2 rounded border mt-1">
                    {backendChecks.tiers.details}
                  </pre>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Click "Check Backend" to test available tiers</p>
        )}
      </div>

      {/* Product Pricing Check */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">4. Product Pricing Check</h2>
        {backendChecks.productPricing ? (
          <div className={`p-4 rounded ${backendChecks.productPricing.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className={`font-semibold ${backendChecks.productPricing.status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {backendChecks.productPricing.status === 'success' ? '✅' : '❌'} Product Pricing
            </h3>
            {backendChecks.productPricing.status === 'success' ? (
              <div className="mt-2">
                <p><strong>Has Pricing:</strong> {backendChecks.productPricing.hasPricing ? 'Yes' : 'No'}</p>
                <p><strong>Has Inventory:</strong> {backendChecks.productPricing.hasInventory ? 'Yes' : 'No'}</p>
                <div className="mt-2">
                  <h4 className="font-semibold">Product Data:</h4>
                  <pre className="text-xs bg-white p-2 rounded border mt-1">
                    {JSON.stringify(backendChecks.productPricing.data, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <p><strong>Error:</strong> {backendChecks.productPricing.error}</p>
                {backendChecks.productPricing.details && (
                  <pre className="text-xs bg-white p-2 rounded border mt-1">
                    {backendChecks.productPricing.details}
                  </pre>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Click "Check Backend" to test product pricing</p>
        )}
      </div>

      {/* Summary */}
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-xl font-semibold mb-4">📋 Summary & Next Steps</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Based on the results above, the issue is likely one of these:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>No price lists configured:</strong> The system has no price lists set up</li>
            <li><strong>User has no tier:</strong> The user is not assigned to any tier</li>
            <li><strong>No tiers available:</strong> The system has no tiers configured</li>
            <li><strong>User not registered:</strong> The user exists in Firebase but not in your backend system</li>
            <li><strong>Backend pricing service down:</strong> The pricing calculation service is not working</li>
          </ul>
          <p className="mt-4"><strong>To fix this, you need to:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Set up tiers in your backend system</li>
            <li>Create price lists for those tiers</li>
            <li>Assign the user to a tier</li>
            <li>Ensure the backend pricing service is working</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
