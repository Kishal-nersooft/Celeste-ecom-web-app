"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { getProducts } from "@/lib/api";
import Title from "@/components/Title";

const DatabaseDebugPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [discountedProducts, setDiscountedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'discounted'>('all');

  const fetchAllProducts = async () => {
    if (!user) {
      setError("Please sign in first to see all products");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching ALL products from database...");
      const products = await getProducts(
        null, // categoryIds
        1, // page
        100, // pageSize
        false, // onlyDiscounted = false to get ALL products
        true, // includeCategories
        true // includePricing
      );
      
      console.log("All products from database:", products);
      setAllProducts(products);
    } catch (err: any) {
      console.error("Error fetching all products:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscountedProducts = async () => {
    if (!user) {
      setError("Please sign in first to see discounted products");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching DISCOUNTED products from database...");
      const products = await getProducts(
        null, // categoryIds
        1, // page
        100, // pageSize
        true, // onlyDiscounted = true to get ONLY discounted products
        true, // includeCategories
        true // includePricing
      );
      
      console.log("Discounted products from database:", products);
      setDiscountedProducts(products);
    } catch (err: any) {
      console.error("Error fetching discounted products:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoth = async () => {
    await Promise.all([fetchAllProducts(), fetchDiscountedProducts()]);
  };

  const getDiscountInfo = (product: any) => {
    if (!product.pricing) {
      return { hasDiscount: false, discount: 0, percentage: 0, finalPrice: product.base_price };
    }
    
    const discount = product.pricing.discount_applied || 0;
    const percentage = product.pricing.discount_percentage || 0;
    const finalPrice = product.pricing.final_price || product.base_price;
    
    return { hasDiscount: discount > 0, discount, percentage, finalPrice };
  };

  const renderProductCard = (product: any) => {
    const discountInfo = getDiscountInfo(product);
    
    return (
      <div key={product.id} className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg flex-1">{product.name}</h3>
          <span className="text-sm text-gray-500 ml-2">ID: {product.id}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-sm text-gray-600">Base Price</p>
            <p className="font-medium">${product.base_price}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Final Price</p>
            <p className="font-medium">${discountInfo.finalPrice}</p>
          </div>
        </div>

        {discountInfo.hasDiscount ? (
          <div className="bg-green-100 p-3 rounded border border-green-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-green-800 font-semibold">✅ DISCOUNTED</p>
                <p className="text-sm text-green-700">
                  Save ${discountInfo.discount} ({discountInfo.percentage}% off)
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-600">Price Lists:</p>
                <p className="text-xs text-green-600">
                  {product.pricing?.applied_price_lists?.join(', ') || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 p-3 rounded border border-gray-200">
            <p className="text-gray-700 font-semibold">❌ No Discount</p>
            <p className="text-sm text-gray-600">
              {product.pricing ? 'No discount applied' : 'No pricing data available'}
            </p>
          </div>
        )}

        <div className="mt-3 text-xs text-gray-500">
          <p>Category: {product.ecommerce_category_id || 'N/A'}</p>
          <p>Brand: {product.brand || 'N/A'}</p>
          <p>Unit: {product.unit_measure || 'N/A'}</p>
        </div>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4">
        <Title className="!text-3xl">Loading...</Title>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Title className="!text-3xl mb-6">Database Products Debug</Title>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
        {user ? (
          <div>
            <p className="text-green-600">✅ User is authenticated</p>
            <p><strong>Phone:</strong> {user.phoneNumber || 'N/A'}</p>
            <p><strong>UID:</strong> {user.uid}</p>
          </div>
        ) : (
          <div>
            <p className="text-red-600">❌ User is not authenticated</p>
            <p className="text-sm text-gray-600 mt-1">
              You need to sign in to see products from the database.
            </p>
          </div>
        )}
      </div>

      <div className="mb-6 space-x-4">
        <button
          onClick={fetchBoth}
          disabled={loading || !user}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Loading..." : "Fetch All Data"}
        </button>
        
        <button
          onClick={fetchAllProducts}
          disabled={loading || !user}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? "Loading..." : "All Products Only"}
        </button>
        
        <button
          onClick={fetchDiscountedProducts}
          disabled={loading || !user}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400"
        >
          {loading ? "Loading..." : "Discounted Only"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Summary Stats */}
      {(allProducts.length > 0 || discountedProducts.length > 0) && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-100 p-4 rounded">
            <h3 className="font-semibold text-blue-800">Total Products</h3>
            <p className="text-2xl font-bold text-blue-600">{allProducts.length}</p>
          </div>
          <div className="bg-orange-100 p-4 rounded">
            <h3 className="font-semibold text-orange-800">Discounted Products</h3>
            <p className="text-2xl font-bold text-orange-600">{discountedProducts.length}</p>
          </div>
          <div className="bg-green-100 p-4 rounded">
            <h3 className="font-semibold text-green-800">Discount Rate</h3>
            <p className="text-2xl font-bold text-green-600">
              {allProducts.length > 0 
                ? `${((discountedProducts.length / allProducts.length) * 100).toFixed(1)}%`
                : '0%'
              }
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Products ({allProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('discounted')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'discounted'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Discounted Only ({discountedProducts.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Products Display */}
      {activeTab === 'all' && allProducts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">All Products from Database</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allProducts.map(renderProductCard)}
          </div>
        </div>
      )}

      {activeTab === 'discounted' && discountedProducts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Discounted Products from Database</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {discountedProducts.map(renderProductCard)}
          </div>
        </div>
      )}

      {allProducts.length === 0 && discountedProducts.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No products loaded. Click a button above to fetch products from the database.
        </div>
      )}
    </div>
  );
};

export default DatabaseDebugPage;
