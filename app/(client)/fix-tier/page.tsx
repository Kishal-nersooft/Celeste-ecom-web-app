"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/FirebaseAuthProvider";

export default function FixTierPage() {
  const { user, loading: authLoading } = useAuth();
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const fixUserTier = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Get the ID token
      const idToken = await user.getIdToken();
      
      // Call our API route to handle the tier fixing
      const response = await fetch('/api/fix-tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken })
      });
      
      if (response.ok) {
        const stepResults = await response.json();
        setResults(stepResults);
      } else {
        const errorData = await response.json();
        setResults({ error: errorData.error || 'API call failed' });
      }
      
    } catch (error: any) {
      console.error("Fix tier error:", error);
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
      <h1 className="text-3xl font-bold mb-8">🔧 Fix User Tier Assignment</h1>
      
      <div className="mb-6">
        <button
          onClick={fixUserTier}
          disabled={loading}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
        >
          {loading ? "Fixing Tier..." : "Fix User Tier Assignment"}
        </button>
      </div>

      {/* Step 1: Current Tier */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">1. Current Tier Status</h2>
        {results.currentTier ? (
          <div className={`p-4 rounded ${results.currentTier.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className={`font-semibold ${results.currentTier.status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {results.currentTier.status === 'success' ? '✅' : '❌'} Current Tier
            </h3>
            {results.currentTier.status === 'success' ? (
              <div className="mt-2">
                <pre className="text-xs bg-white p-2 rounded border">
                  {JSON.stringify(results.currentTier.data, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="mt-2">
                <p><strong>Error:</strong> {results.currentTier.error}</p>
                {results.currentTier.details && (
                  <pre className="text-xs bg-white p-2 rounded border mt-1">
                    {results.currentTier.details}
                  </pre>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Click "Fix User Tier Assignment" to check current tier</p>
        )}
      </div>

      {/* Step 2: Tier Evaluation */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">2. Tier Evaluation</h2>
        {results.tierEvaluation ? (
          <div className={`p-4 rounded ${results.tierEvaluation.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className={`font-semibold ${results.tierEvaluation.status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {results.tierEvaluation.status === 'success' ? '✅' : '❌'} Tier Evaluation
            </h3>
            {results.tierEvaluation.status === 'success' ? (
              <div className="mt-2">
                <pre className="text-xs bg-white p-2 rounded border">
                  {JSON.stringify(results.tierEvaluation.data, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="mt-2">
                <p><strong>Error:</strong> {results.tierEvaluation.error}</p>
                {results.tierEvaluation.details && (
                  <pre className="text-xs bg-white p-2 rounded border mt-1">
                    {results.tierEvaluation.details}
                  </pre>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Click "Fix User Tier Assignment" to evaluate tier</p>
        )}
      </div>

      {/* Step 3: Auto Update */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">3. Auto-Update Tier</h2>
        {results.autoUpdate ? (
          <div className={`p-4 rounded ${results.autoUpdate.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className={`font-semibold ${results.autoUpdate.status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {results.autoUpdate.status === 'success' ? '✅' : '❌'} Auto-Update
            </h3>
            {results.autoUpdate.status === 'success' ? (
              <div className="mt-2">
                <p><strong>Tier Changed:</strong> {results.autoUpdate.tierChanged ? 'Yes' : 'No'}</p>
                <pre className="text-xs bg-white p-2 rounded border mt-2">
                  {JSON.stringify(results.autoUpdate.data, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="mt-2">
                <p><strong>Error:</strong> {results.autoUpdate.error}</p>
                {results.autoUpdate.details && (
                  <pre className="text-xs bg-white p-2 rounded border mt-1">
                    {results.autoUpdate.details}
                  </pre>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Click "Fix User Tier Assignment" to auto-update tier</p>
        )}
      </div>

      {/* Step 4: User Profile */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">4. User Profile Check</h2>
        {results.userProfile ? (
          <div className={`p-4 rounded ${results.userProfile.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <h3 className={`font-semibold ${results.userProfile.status === 'success' ? 'text-green-800' : 'text-yellow-800'}`}>
              {results.userProfile.status === 'success' ? '✅' : '⚠️'} User Profile
            </h3>
            <div className="mt-2">
              <p><strong>Status:</strong> {results.userProfile.message}</p>
              {results.userProfile.status === 'success' ? (
                <div className="mt-2">
                  <pre className="text-xs bg-white p-2 rounded border">
                    {JSON.stringify(results.userProfile.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="mt-2">
                  <p><strong>Error:</strong> {results.userProfile.error}</p>
                  {results.userProfile.details && (
                    <pre className="text-xs bg-white p-2 rounded border mt-1">
                      {results.userProfile.details}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Click "Fix User Tier Assignment" to check user profile</p>
        )}
      </div>

      {/* Step 5: Pricing Test */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">5. Pricing Test</h2>
        {results.pricingTest ? (
          <div className={`p-4 rounded ${results.pricingTest.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <h3 className={`font-semibold ${results.pricingTest.success ? 'text-green-800' : 'text-yellow-800'}`}>
              {results.pricingTest.success ? '🎉' : '⚠️'} Pricing Test
            </h3>
            <div className="mt-2">
              <p><strong>Total Products:</strong> {results.pricingTest.totalProducts}</p>
              <p><strong>Products with Pricing:</strong> {results.pricingTest.productsWithPricing}</p>
              <p><strong>Success:</strong> {results.pricingTest.success ? 'Yes' : 'No'}</p>
              
              {results.pricingTest.sampleProduct && (
                <div className="mt-2">
                  <h4 className="font-semibold">Sample Product:</h4>
                  <p><strong>Name:</strong> {results.pricingTest.sampleProduct.name}</p>
                  <p><strong>Base Price:</strong> {results.pricingTest.sampleProduct.base_price}</p>
                  <p><strong>Pricing:</strong> {results.pricingTest.sampleProduct.pricing ? 'Present' : 'NULL'}</p>
                  
                  {results.pricingTest.sampleProduct.pricing && (
                    <div className="mt-2">
                      <h5 className="font-semibold">Pricing Details:</h5>
                      <pre className="text-xs bg-white p-2 rounded border">
                        {JSON.stringify(results.pricingTest.sampleProduct.pricing, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Click "Fix User Tier Assignment" to test pricing</p>
        )}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded p-6">
        <h2 className="text-xl font-semibold mb-4">📋 Summary</h2>
        <div className="space-y-2 text-sm">
          <p><strong>This tool will:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Check your current tier status</li>
            <li>Evaluate what tier you should be in</li>
            <li>Auto-update your tier assignment</li>
            <li>Check if your user profile exists in the system</li>
            <li>Test if pricing data now works</li>
          </ul>
          <p className="mt-4"><strong>Expected result:</strong> You should be assigned to the Bronze tier and get pricing data.</p>
          <p className="mt-2 text-yellow-700"><strong>Note:</strong> If pricing still doesn't work, the user may need to be created in the main user system first.</p>
        </div>
      </div>
    </div>
  );
}
