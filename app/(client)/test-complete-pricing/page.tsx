"use client";

import React, { useState, useEffect } from "react";
import { getProductsWithPricing } from "@/lib/api";
import { useAuth } from "@/components/FirebaseAuthProvider";

export default function TestCompletePricing() {
  const { user, loading: authLoading } = useAuth();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [discountedProducts, setDiscountedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && user) {
      testCompletePricing();
    }
  }, [user, authLoading]);

  const testCompletePricing = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("🧪 Testing complete pricing integration...");
      console.log("👤 User authenticated:", !!user);
      console.log("👤 User UID:", user?.uid);
      
      // Test 1: Get all products with pricing
      console.log("📦 Test 1: Getting all products with pricing...");
      const allProductsResponse = await getProductsWithPricing(
        null, // All categories
        1,    // page
        20,   // pageSize
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
        20,   // pageSize
        true, // onlyDiscounted=true
        true, // includeCategories
        true, // includeInventory
        [1, 2, 3, 4] // storeIds
      );
      
      console.log("🎯 Discounted products result:", discountedProductsResponse);
      setDiscountedProducts(discountedProductsResponse);
      
      // Analyze results
      const analysis = {
        totalProducts: allProductsResponse.length,
        productsWithPricing: allProductsResponse.filter(p => p.pricing && p.pricing !== null).length,
        productsWithoutPricing: allProductsResponse.filter(p => !p.pricing || p.pricing === null).length,
        discountedProductsCount: discountedProductsResponse.length,
        actualDiscountedProducts: discountedProductsResponse.filter(p => p.pricing && p.pricing.discount_applied > 0).length,
        sampleProduct: allProductsResponse[0] || null,
        sampleDiscountedProduct: discountedProductsResponse[0] || null
      };
      
      setTestResults(analysis);
      
    } catch (err) {
      console.error("🧪 Error testing complete pricing:", err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Complete Pricing Integration</h1>
        <p>Loading authentication...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Complete Pricing Integration</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p><strong>Authentication Required:</strong> Please sign in to test pricing data.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Complete Pricing Integration</h1>
        <p>Loading pricing data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Testing Complete Pricing Integration</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p><strong>Error:</strong> {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Testing Complete Pricing Integration</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <p className="text-green-800">✅ User authenticated: {user.email || user.uid}</p>
        </div>
      </div>

      {testResults && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Test Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h3 className="font-semibold text-blue-800">All Products Test</h3>
              <p>Total: {testResults.totalProducts}</p>
              <p>With Pricing: {testResults.productsWithPricing}</p>
              <p>Without Pricing: {testResults.productsWithoutPricing}</p>
              <p>Pricing Success Rate: {testResults.totalProducts > 0 ? Math.round((testResults.productsWithPricing / testResults.totalProducts) * 100) : 0}%</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h3 className="font-semibold text-green-800">Discounted Products Test</h3>
              <p>Total Returned: {testResults.discountedProductsCount}</p>
              <p>Actually Discounted: {testResults.actualDiscountedProducts}</p>
              <p>Filter Accuracy: {testResults.discountedProductsCount > 0 ? Math.round((testResults.actualDiscountedProducts / testResults.discountedProductsCount) * 100) : 0}%</p>
            </div>
          </div>
        </div>
      )}

      {testResults?.sampleProduct && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Sample Product (All Products)</h3>
          <div className="bg-white border border-gray-200 rounded p-4">
            <h4 className="font-semibold">{testResults.sampleProduct.name}</h4>
            <p className="text-sm text-gray-600">ID: {testResults.sampleProduct.id}</p>
            <p className="text-sm text-gray-600">Base Price: {testResults.sampleProduct.base_price}</p>
            {testResults.sampleProduct.pricing ? (
              <div className="mt-2 p-2 bg-green-50 rounded">
                <p className="text-sm font-semibold text-green-800">✅ Has Pricing Data</p>
                <p className="text-xs">Final Price: {testResults.sampleProduct.pricing.final_price}</p>
                <p className="text-xs">Discount Applied: {testResults.sampleProduct.pricing.discount_applied}</p>
                <p className="text-xs">Discount Percentage: {testResults.sampleProduct.pricing.discount_percentage}%</p>
                <p className="text-xs">Price Lists: {testResults.sampleProduct.pricing.applied_price_lists?.join(', ')}</p>
              </div>
            ) : (
              <div className="mt-2 p-2 bg-red-50 rounded">
                <p className="text-sm font-semibold text-red-800">❌ No Pricing Data</p>
              </div>
            )}
          </div>
        </div>
      )}

      {testResults?.sampleDiscountedProduct && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Sample Discounted Product</h3>
          <div className="bg-white border border-gray-200 rounded p-4">
            <h4 className="font-semibold">{testResults.sampleDiscountedProduct.name}</h4>
            <p className="text-sm text-gray-600">ID: {testResults.sampleDiscountedProduct.id}</p>
            <p className="text-sm text-gray-600">Base Price: {testResults.sampleDiscountedProduct.base_price}</p>
            {testResults.sampleDiscountedProduct.pricing && (
              <div className="mt-2 p-2 bg-green-50 rounded">
                <p className="text-sm font-semibold text-green-800">✅ Discounted Product</p>
                <p className="text-xs">Final Price: {testResults.sampleDiscountedProduct.pricing.final_price}</p>
                <p className="text-xs">Discount Applied: {testResults.sampleDiscountedProduct.pricing.discount_applied}</p>
                <p className="text-xs">Discount Percentage: {testResults.sampleDiscountedProduct.pricing.discount_percentage}%</p>
                <p className="text-xs">Price Lists: {testResults.sampleDiscountedProduct.pricing.applied_price_lists?.join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded p-4">
        <h4 className="font-semibold text-yellow-800 mb-2">What we're testing:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Whether backend API returns pricing data with include_pricing=true</li>
          <li>• Whether authentication is required for pricing data</li>
          <li>• Whether only_discounted=true filtering works</li>
          <li>• Fallback to individual pricing calls if needed</li>
          <li>• All products should have pricing data (even if discount_applied = 0)</li>
        </ul>
      </div>
    </div>
  );
}
