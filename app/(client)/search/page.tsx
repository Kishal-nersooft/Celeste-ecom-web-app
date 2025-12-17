"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Container from "@/components/Container";
import ProductGrid from "@/components/ProductGrid";
import { searchProducts } from "@/lib/api";
import { useLocation } from "@/contexts/LocationContext";
import Loader from "@/components/Loader";

const SearchPageContent = () => {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const { selectedStore, deliveryType, defaultAddress } = useLocation();
  
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query || query.length < 2) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const searchOptions: any = {
          includePricing: true,
          includeInventory: true,
          includeCategories: true
        };

        // Add location context based on delivery type
        if (deliveryType === 'pickup' && selectedStore?.id) {
          searchOptions.storeIds = [selectedStore.id];
        } else if (deliveryType === 'delivery' && defaultAddress?.latitude && defaultAddress?.longitude) {
          searchOptions.latitude = defaultAddress.latitude;
          searchOptions.longitude = defaultAddress.longitude;
        }

        const searchResults = await searchProducts(query, 'full', searchOptions);
        setProducts(searchResults.products || []);
      } catch (err) {
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, selectedStore, deliveryType, defaultAddress]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <Loader />
      </div>
    );
  }

  if (!query || query.length < 2) {
    return (
      <div className="flex flex-col items-center justify-normal min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl text-center">
          <h1 className="text-3xl font-bold mb-3">Search for products</h1>
          <p className="text-gray-600">Enter at least 2 characters to search</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-normal min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl text-center">
          <h1 className="text-3xl font-bold mb-3 text-red-600">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!products?.length) {
    return (
      <div className="flex flex-col items-center justify-normal min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl text-center">
          <h1 className="text-3xl font-bold mb-3">
            No products found for:{" "}
            <span className="text-darkBlue">{query}</span>
          </h1>
          <p className="text-gray-600">Try searching with different keywords</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-top min-h-screen bg-gray-100">
      <Container className="p-8 bg-white rounded-lg shadow-md mt-3">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Search results for <span className="text-darkBlue">{query}</span>
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Found {products.length} product{products.length !== 1 ? 's' : ''}
        </p>
        <ProductGrid products={products} />
      </Container>
    </div>
  );
};

const SearchPage = () => {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <Loader />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
};

export default SearchPage;
