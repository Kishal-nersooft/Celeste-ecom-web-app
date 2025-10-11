'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, Home, Tag } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import ProductRow from '@/components/ProductRow';
import ProductList from '@/components/ProductList';
import Categories, { Category } from '@/components/Categories';
import VerticalCategorySelector from '@/components/VerticalCategorySelector';
import { Product } from '@/store';
import { getProducts, getCategories, getStoreById } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import { Store } from '@/types/store';

const StorePageClient: React.FC<{ storeId: string }> = ({ storeId }) => {
  const router = useRouter();
  const { selectedStore } = useLocation();
  const [activeTab, setActiveTab] = useState<'shop' | 'deals'>('shop');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isDealsSelected, setIsDealsSelected] = useState<boolean>(false);
  const [dealsProducts, setDealsProducts] = useState<Product[]>([]);
  const [loadingDeals, setLoadingDeals] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Use selectedStore from context if available and matches the storeId
        if (selectedStore && selectedStore.id === storeId) {
          console.log('Using store data from context:', selectedStore);
          setStore(selectedStore);
        } else {
          // Try to fetch store data from API
          try {
            const storeData = await getStoreById(storeId);
            setStore(storeData);
          } catch (storeError) {
            console.warn('Failed to fetch store data from API, using context data if available:', storeError);
            // Fallback to context data if API fails
            if (selectedStore) {
              setStore(selectedStore);
            }
          }
        }
        
        // Fetch products and categories with store filtering
        const [productsData, categoriesData] = await Promise.all([
          getProducts(null, 1, 100, false, true, true, true, [parseInt(storeId)]), // Include store ID for filtering
          getCategories()
        ]);
        
        setProducts(Array.isArray(productsData) ? productsData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [storeId, selectedStore]);

  // Fetch deals products when deals category is selected
  useEffect(() => {
    if (isDealsSelected) {
      setLoadingDeals(true);
      getProducts(null, 1, 100, true, true, true, true, [parseInt(storeId)]) // Include store ID for filtering
        .then((discountedProducts) => {
          setDealsProducts(Array.isArray(discountedProducts) ? discountedProducts : []);
        })
        .catch((error) => {
          console.error("Error fetching deals products:", error);
          setDealsProducts([]);
        })
        .finally(() => {
          setLoadingDeals(false);
        });
    }
  }, [isDealsSelected]);

  // ProductList component handles its own filtering based on selectedCategoryId and isDealsSelected

  const handleBackClick = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      {/* <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={handleBackClick}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
        </div>
      </div> */}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Store Profile */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
              {/* Store Image */}
              <div className="relative mb-6">
                <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-gray-200">
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-lg font-bold">
                    {store ? store.name.charAt(0) : 'S'}
                  </div>
                </div>
              </div>

              {/* Store Info */}
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-gray-900 mb-2">
                  {store ? store.name : 'Loading...'}
                </h1>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="text-center">
                      {store ? store.address : 'Loading address...'}
                    </span>
                  </div>
                  {store?.phone && (
                    <div className="flex items-center justify-center">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{store.phone}</span>
                    </div>
                  )}
                  {store?.email && (
                    <div className="flex items-center justify-center">
                      <span className="text-xs text-gray-500">{store.email}</span>
                    </div>
                  )}
                  {store?.description && (
                    <div className="mt-3 text-xs text-gray-500">
                      {store.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="space-y-2 mb-6">
                <button
                  onClick={() => setActiveTab('shop')}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'shop' 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Home className="h-5 w-5 mr-3" />
                  Shop
                </button>
                <button
                  onClick={() => setActiveTab('deals')}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'deals' 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Tag className="h-5 w-5 mr-3" />
                  Deals
                </button>
              </div>

              {/* Category Selector */}
              {activeTab === 'shop' && (
                <VerticalCategorySelector 
                  onSelectCategory={(categoryId, isDeals) => {
                    console.log("🏪 StorePageClient - Category selected:", { categoryId, isDeals });
                    setSelectedCategoryId(categoryId);
                    setIsDealsSelected(isDeals || false);
                  }}
                  selectedCategoryId={selectedCategoryId}
                />
              )}
            </div>
          </div>

          {/* Right Main Content */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading products...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">Error loading products: {error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'shop' && (
                  <ProductList 
                    products={products} 
                    categories={categories} 
                    title={true}
                    storeId={parseInt(storeId)}
                    selectedCategoryId={selectedCategoryId}
                    isDealsSelected={isDealsSelected}
                  />
                )}
              </>
            )}

            {activeTab === 'deals' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">All Deals</h2>
                {(() => {
                  const dealsProducts = products.filter(product => (product.pricing?.discount_percentage ?? 0) > 0);
                  return dealsProducts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {dealsProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No deals available at the moment</p>
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default StorePageClient;
