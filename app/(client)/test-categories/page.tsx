"use client";

import React, { useState, useEffect } from 'react';
import { getParentCategories, getSubcategories, getProducts } from '@/lib/api';
import ProductList from '@/components/ProductList';
import { Category } from '@/components/Categories';

export default function TestCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [categoriesData, productsData] = await Promise.all([
          getParentCategories(),
          getProducts()
        ]);
        
        setCategories(categoriesData);
        setProducts(productsData);
        console.log('Categories loaded:', categoriesData);
        console.log('Products loaded:', productsData.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading categories and products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Hierarchical Categories Test</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">How it works:</h2>
        <ul className="text-blue-700 space-y-1">
          <li>• <strong>All</strong> - Shows all products from all subcategories</li>
          <li>• <strong>Parent Categories</strong> - Click to expand and see subcategories</li>
          <li>• <strong>Subcategories</strong> - Click to see products in that specific subcategory</li>
          <li>• <strong>Deals</strong> - Shows all discounted products</li>
        </ul>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">Categories Loaded:</h3>
        <p className="text-gray-600">Parent Categories: {categories.length}</p>
        <p className="text-gray-600">Products: {products.length}</p>
      </div>

      <ProductList 
        products={products} 
        categories={categories} 
        title={true}
      />
    </div>
  );
}
