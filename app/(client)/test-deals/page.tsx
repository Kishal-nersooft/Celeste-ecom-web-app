'use client';

import { useEffect, useState } from 'react';
import { getProducts } from '@/lib/api';

export default function TestDealsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeals() {
      try {
        setLoading(true);
        console.log('Testing API call with only_discounted=true...');
        
        const response = await getProducts(null, 1, 10, true, true, true);
        console.log('API Response:', response);
        
        setProducts(Array.isArray(response) ? response : []);
      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDeals();
  }, []);

  if (loading) return <div className="p-8">Loading deals...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Deals API</h1>
      <p className="mb-4">Found {products.length} discounted products</p>
      
      {products.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Products with Discounts:</h2>
          {products.map((product) => (
            <div key={product.id} className="border p-4 rounded">
              <h3 className="font-medium">{product.name}</h3>
              <p>ID: {product.id}</p>
              <p>Base Price: {product.base_price}</p>
              {product.pricing ? (
                <div className="mt-2 p-2 bg-green-100 rounded">
                  <p>Final Price: {product.pricing.final_price}</p>
                  <p>Discount Applied: {product.pricing.discount_applied}</p>
                  <p>Discount Percentage: {product.pricing.discount_percentage}%</p>
                  <p>Applied Price Lists: {product.pricing.applied_price_lists?.join(', ')}</p>
                </div>
              ) : (
                <div className="mt-2 p-2 bg-red-100 rounded">
                  <p>No pricing data available</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {products.length === 0 && (
        <div className="text-gray-500">
          No discounted products found. This could mean:
          <ul className="list-disc list-inside mt-2">
            <li>The API is not returning discounted products</li>
            <li>There are no products with discounts in the database</li>
            <li>The only_discounted parameter is not working as expected</li>
          </ul>
        </div>
      )}
    </div>
  );
}
