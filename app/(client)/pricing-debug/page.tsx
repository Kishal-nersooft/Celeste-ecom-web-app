'use client';

import { useEffect, useState } from 'react';
import { getProducts } from '@/lib/api';

export default function PricingDebugPage() {
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [discountedProducts, setDiscountedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch all products
        console.log('Fetching all products...');
        const allResponse = await getProducts(null, 1, 10, false, true, true);
        setAllProducts(Array.isArray(allResponse) ? allResponse : []);
        
        // Fetch only discounted products
        console.log('Fetching discounted products...');
        const discountedResponse = await getProducts(null, 1, 10, true, true, true);
        setDiscountedProducts(Array.isArray(discountedResponse) ? discountedResponse : []);
        
      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Pricing Data Debug</h1>
      
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-100 p-4 rounded">
          <h3 className="font-semibold">All Products</h3>
          <p className="text-2xl">{allProducts.length}</p>
        </div>
        <div className="bg-green-100 p-4 rounded">
          <h3 className="font-semibold">API Discounted</h3>
          <p className="text-2xl">{discountedProducts.length}</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded">
          <h3 className="font-semibold">With Pricing Data</h3>
          <p className="text-2xl">{allProducts.filter(p => p.pricing).length}</p>
        </div>
      </div>

      {/* All Products with Pricing Details */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">All Products - Pricing Data Analysis</h2>
        <div className="space-y-4">
          {allProducts.map((product) => (
            <div key={product.id} className="border p-4 rounded bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-gray-600">ID: {product.id} | Base Price: {product.base_price}</p>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded text-sm ${
                    product.pricing ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.pricing ? 'Has Pricing' : 'No Pricing'}
                  </div>
                </div>
              </div>
              
              {/* Pricing Details */}
              <div className="mt-2 p-2 bg-white rounded border">
                <h4 className="font-medium text-sm mb-1">Pricing Object:</h4>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(product.pricing, null, 2)}
                </pre>
              </div>
              
              {/* Full Product Object */}
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                  Show Full Product Object
                </summary>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto mt-1 max-h-96 overflow-y-auto">
                  {JSON.stringify(product, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      </div>

      {/* Discounted Products Analysis */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">API Discounted Products - Pricing Analysis</h2>
        <div className="space-y-4">
          {discountedProducts.map((product) => (
            <div key={product.id} className="border p-4 rounded bg-yellow-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-gray-600">ID: {product.id} | Base Price: {product.base_price}</p>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded text-sm ${
                    product.pricing ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.pricing ? 'Has Pricing' : 'No Pricing'}
                  </div>
                </div>
              </div>
              
              {/* Expected vs Actual Pricing */}
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-2 bg-green-100 rounded">
                  <h4 className="font-medium text-sm mb-1">Expected (from your example):</h4>
                  <pre className="text-xs">
{`{
  "base_price": 435.0,
  "final_price": 369.75,
  "discount_applied": 65.25,
  "discount_percentage": 15.0,
  "applied_price_lists": ["summer_clearance"]
}`}
                  </pre>
                </div>
                <div className="p-2 bg-red-100 rounded">
                  <h4 className="font-medium text-sm mb-1">Actual (from API):</h4>
                  <pre className="text-xs">
                    {JSON.stringify(product.pricing, null, 2)}
                  </pre>
                </div>
              </div>
              
              {/* Full Product Object */}
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                  Show Full Product Object
                </summary>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto mt-1 max-h-96 overflow-y-auto">
                  {JSON.stringify(product, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      </div>

      {/* Hardcoded Analysis */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
        <h3 className="font-semibold mb-2">Hardcoded Data Analysis:</h3>
        <div className="text-sm space-y-2">
          <p><strong>Frontend Fallback:</strong> Yes, there are hardcoded product IDs (6285, 6286, 6287) in <code>discount-utils.ts</code></p>
          <p><strong>API Fallback:</strong> Yes, there are hardcoded products in <code>app/api/products/route.ts</code> as fallback data</p>
          <p><strong>Backend API:</strong> The external API is returning the correct products but with <code>pricing: null</code></p>
          <p><strong>Root Issue:</strong> Backend pricing calculation is not working - all products have <code>pricing: null</code></p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded mt-4">
        <h3 className="font-semibold mb-2">Recommendations:</h3>
        <div className="text-sm space-y-1">
          <p>1. <strong>Backend Fix:</strong> Ask your backend developer to fix the pricing calculation</p>
          <p>2. <strong>Remove Hardcoded Data:</strong> Once backend is fixed, remove hardcoded fallbacks</p>
          <p>3. <strong>Test Real Data:</strong> Verify that products return proper pricing objects</p>
          <p>4. <strong>Dynamic Discounts:</strong> Ensure discounts are calculated based on active price lists</p>
        </div>
      </div>
    </div>
  );
}
