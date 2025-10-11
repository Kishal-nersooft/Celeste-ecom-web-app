"use client";

import React, { useState, useEffect } from "react";

export default function DebugPricingAPI() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    const results = [];

    // Test 1: Basic products API without pricing
    try {
      console.log("🧪 Test 1: Basic products API");
      const response1 = await fetch("https://celeste-api-846811285865.us-central1.run.app/products?limit=2");
      const data1 = await response1.json();
      results.push({
        test: "Basic products API",
        status: response1.status,
        success: response1.ok,
        data: data1,
        hasPricing: data1.data?.products?.[0]?.pricing ? "Yes" : "No"
      });
    } catch (error) {
      results.push({
        test: "Basic products API",
        success: false,
        error: error.message
      });
    }

    // Test 2: Products API with include_pricing=true
    try {
      console.log("🧪 Test 2: Products API with include_pricing=true");
      const response2 = await fetch("https://celeste-api-846811285865.us-central1.run.app/products?limit=2&include_pricing=true");
      const data2 = await response2.json();
      results.push({
        test: "Products API with include_pricing=true",
        status: response2.status,
        success: response2.ok,
        data: data2,
        hasPricing: data2.data?.products?.[0]?.pricing ? "Yes" : "No"
      });
    } catch (error) {
      results.push({
        test: "Products API with include_pricing=true",
        success: false,
        error: error.message
      });
    }

    // Test 3: Products API with only_discounted=true
    try {
      console.log("🧪 Test 3: Products API with only_discounted=true");
      const response3 = await fetch("https://celeste-api-846811285865.us-central1.run.app/products?limit=2&only_discounted=true");
      const data3 = await response3.json();
      results.push({
        test: "Products API with only_discounted=true",
        status: response3.status,
        success: response3.ok,
        data: data3,
        hasPricing: data3.data?.products?.[0]?.pricing ? "Yes" : "No"
      });
    } catch (error) {
      results.push({
        test: "Products API with only_discounted=true",
        success: false,
        error: error.message
      });
    }

    // Test 4: Products API with both include_pricing=true and only_discounted=true
    try {
      console.log("🧪 Test 4: Products API with both parameters");
      const response4 = await fetch("https://celeste-api-846811285865.us-central1.run.app/products?limit=2&include_pricing=true&only_discounted=true");
      const data4 = await response4.json();
      results.push({
        test: "Products API with both parameters",
        status: response4.status,
        success: response4.ok,
        data: data4,
        hasPricing: data4.data?.products?.[0]?.pricing ? "Yes" : "No"
      });
    } catch (error) {
      results.push({
        test: "Products API with both parameters",
        success: false,
        error: error.message
      });
    }

    // Test 5: Individual pricing calculation
    try {
      console.log("🧪 Test 5: Individual pricing calculation");
      const response5 = await fetch("https://celeste-api-846811285865.us-central1.run.app/pricing/calculate/product/6285?tier_id=1&quantity=1");
      const data5 = await response5.json();
      results.push({
        test: "Individual pricing calculation",
        status: response5.status,
        success: response5.ok,
        data: data5,
        hasPricing: data5.data ? "Yes" : "No"
      });
    } catch (error) {
      results.push({
        test: "Individual pricing calculation",
        success: false,
        error: error.message
      });
    }

    // Test 6: With authentication headers (if needed)
    try {
      console.log("🧪 Test 6: With Content-Type header");
      const response6 = await fetch("https://celeste-api-846811285865.us-central1.run.app/products?limit=2&include_pricing=true", {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      const data6 = await response6.json();
      results.push({
        test: "With Content-Type header",
        status: response6.status,
        success: response6.ok,
        data: data6,
        hasPricing: data6.data?.products?.[0]?.pricing ? "Yes" : "No"
      });
    } catch (error) {
      results.push({
        test: "With Content-Type header",
        success: false,
        error: error.message
      });
    }

    setTestResults(results);
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Debug Pricing API</h1>
      
      <button
        onClick={testAPI}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded mb-6"
      >
        {loading ? "Testing..." : "Test API Endpoints"}
      </button>

      {testResults.length > 0 && (
        <div className="space-y-4">
          {testResults.map((result, index) => (
            <div key={index} className={`border rounded p-4 ${
              result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <h3 className="font-semibold text-lg mb-2">
                {result.test} {result.success ? '✅' : '❌'}
              </h3>
              
              {result.status && (
                <p className="text-sm text-gray-600 mb-2">
                  Status: {result.status}
                </p>
              )}
              
              {result.hasPricing && (
                <p className="text-sm text-gray-600 mb-2">
                  Has Pricing: {result.hasPricing}
                </p>
              )}
              
              {result.error && (
                <p className="text-sm text-red-600 mb-2">
                  Error: {result.error}
                </p>
              )}
              
              {result.data && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-blue-600">
                    View Raw Data
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded p-4">
        <h4 className="font-semibold text-yellow-800 mb-2">What we're looking for:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Which API endpoint returns pricing data</li>
          <li>• What authentication/headers are needed</li>
          <li>• How the pricing data is structured</li>
          <li>• Whether include_pricing=true actually works</li>
          <li>• How to get all products with pricing data</li>
        </ul>
      </div>
    </div>
  );
}
