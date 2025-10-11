'use client';

import { useEffect, useState } from 'react';
import { getProducts } from '@/lib/api';

export default function DebugDiscountsPage() {
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
        const allResponse = await getProducts(null, 1, 20, false, true, true);
        setAllProducts(Array.isArray(allResponse) ? allResponse : []);
        
        // Fetch only discounted products
        console.log('Fetching discounted products...');
        const discountedResponse = await getProducts(null, 1, 20, true, true, true);
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

  // Analyze products
  const productsWithPricing = allProducts.filter(p => p.pricing);
  const productsWithDiscounts = allProducts.filter(p => 
    p.pricing && p.pricing.discount_applied > 0
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Discount Debug Tool</h1>
      
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-100 p-4 rounded">
          <h3 className="font-semibold">Total Products</h3>
          <p className="text-2xl">{allProducts.length}</p>
        </div>
        <div className="bg-green-100 p-4 rounded">
          <h3 className="font-semibold">With Pricing</h3>
          <p className="text-2xl">{productsWithPricing.length}</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded">
          <h3 className="font-semibold">With Discounts</h3>
          <p className="text-2xl">{productsWithDiscounts.length}</p>
        </div>
        <div className="bg-purple-100 p-4 rounded">
          <h3 className="font-semibold">API Discounted</h3>
          <p className="text-2xl">{discountedProducts.length}</p>
        </div>
      </div>

      {/* API Comparison */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">API Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border p-4 rounded">
            <h3 className="font-medium mb-2">All Products (only_discounted=false)</h3>
            <p>Count: {allProducts.length}</p>
            <p>With pricing: {productsWithPricing.length}</p>
            <p>With discounts: {productsWithDiscounts.length}</p>
          </div>
          <div className="border p-4 rounded">
            <h3 className="font-medium mb-2">Discounted Only (only_discounted=true)</h3>
            <p>Count: {discountedProducts.length}</p>
            <p>Expected: {productsWithDiscounts.length}</p>
            <p className={discountedProducts.length === productsWithDiscounts.length ? 'text-green-600' : 'text-red-600'}>
              Match: {discountedProducts.length === productsWithDiscounts.length ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>

      {/* Products with Discounts */}
      {productsWithDiscounts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Products with Discounts (from all products)</h2>
          <div className="space-y-4">
            {productsWithDiscounts.map((product) => (
              <div key={product.id} className="border p-4 rounded bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-gray-600">ID: {product.id}</p>
                    <p className="text-sm text-gray-600">Base Price: {product.base_price}</p>
                  </div>
                  <div className="text-right">
                    <div className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
                      {Math.round(product.pricing.discount_percentage)}% off
                    </div>
                    <p className="text-sm">Final: {product.pricing.final_price}</p>
                    <p className="text-sm">Saved: {product.pricing.discount_applied}</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Price Lists: {product.pricing.applied_price_lists?.join(', ') || 'None'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Discounted Products */}
      {discountedProducts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">API Discounted Products (only_discounted=true)</h2>
          <div className="space-y-4">
            {discountedProducts.map((product) => (
              <div key={product.id} className="border p-4 rounded bg-green-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-gray-600">ID: {product.id}</p>
                    <p className="text-sm text-gray-600">Base Price: {product.base_price}</p>
                  </div>
                  <div className="text-right">
                    <div className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
                      {Math.round(product.pricing.discount_percentage)}% off
                    </div>
                    <p className="text-sm">Final: {product.pricing.final_price}</p>
                    <p className="text-sm">Saved: {product.pricing.discount_applied}</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Price Lists: {product.pricing.applied_price_lists?.join(', ') || 'None'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products without pricing */}
      {allProducts.filter(p => !p.pricing).length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Products without Pricing Data</h2>
          <div className="space-y-2">
            {allProducts.filter(p => !p.pricing).slice(0, 5).map((product) => (
              <div key={product.id} className="border p-2 rounded bg-red-50">
                <p className="text-sm">{product.name} (ID: {product.id})</p>
                <p className="text-xs text-gray-500">Base Price: {product.base_price}</p>
              </div>
            ))}
            {allProducts.filter(p => !p.pricing).length > 5 && (
              <p className="text-sm text-gray-500">... and {allProducts.filter(p => !p.pricing).length - 5} more</p>
            )}
          </div>
        </div>
      )}

      {/* Debugging Tips */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
        <h3 className="font-semibold mb-2">Debugging Tips:</h3>
        <ul className="text-sm space-y-1">
          <li>• If "API Discounted" count is 0, the backend only_discounted parameter isn't working</li>
          <li>• If "With Discounts" count is 0, no products have pricing.savings > 0</li>
          <li>• If counts don't match, there's a mismatch between frontend and backend logic</li>
          <li>• Check that price lists are active and have valid date ranges</li>
          <li>• Verify that products are assigned to the correct tier</li>
        </ul>
      </div>
    </div>
  );
}
