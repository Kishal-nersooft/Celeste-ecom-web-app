'use client';

import React, { useState, useEffect } from 'react';
import StoreCard from './StoreCard';
import { getStores } from '@/lib/api';
import { Store } from '@/types/store';

const StoresGrid: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStores() {
      try {
        setLoading(true);
        const storesData = await getStores();
        setStores(Array.isArray(storesData) ? storesData : []);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching stores:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStores();
  }, []);

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-600 mb-4">Error loading stores: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">No stores available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Stores</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {stores.map((store) => (
          <StoreCard 
            key={store.id} 
            store={store}
            distance="35 Km" // You can calculate actual distance based on user location
          />
        ))}
      </div>
    </div>
  );
};

export default StoresGrid;
