"use client";

import React, { useState, useEffect } from 'react';
import { getStores, getNearbyStores, getStoreDistance } from '@/lib/api';

interface Store {
  id: string;
  name: string;
  description?: string;
  address: string;
  phone?: string;
  email?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  tags?: Array<{
    id: number;
    name: string;
    type: string;
  }>;
  distance?: number;
}

export default function TestStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [storeDistance, setStoreDistance] = useState<number | null>(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, []);

  const fetchAllStores = async () => {
    setLoading(true);
    setError(null);
    try {
      const storesData = await getStores();
      setStores(storesData);
      console.log('All stores:', storesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stores');
      console.error('Error fetching stores:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyStores = async () => {
    if (!userLocation) {
      setError('User location not available');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nearbyStoresData = await getNearbyStores(userLocation.lat, userLocation.lng, 50);
      setNearbyStores(nearbyStoresData);
      console.log('Nearby stores:', nearbyStoresData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nearby stores');
      console.error('Error fetching nearby stores:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStoreDistance = async (store: Store) => {
    if (!userLocation) {
      setError('User location not available');
      return;
    }

    try {
      const distance = await getStoreDistance(store.id, userLocation.lat, userLocation.lng);
      setStoreDistance(distance.distance);
      setSelectedStore(store);
      console.log('Store distance:', distance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate distance');
      console.error('Error calculating distance:', err);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Stores API Test</h1>
      
      <div className="space-y-6">
        {/* User Location */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">User Location</h2>
          {userLocation ? (
            <p className="text-green-600">
              Lat: {userLocation.lat.toFixed(6)}, Lng: {userLocation.lng.toFixed(6)}
            </p>
          ) : (
            <p className="text-gray-500">Location not available</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={fetchAllStores}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Fetch All Stores'}
          </button>
          
          <button
            onClick={fetchNearbyStores}
            disabled={loading || !userLocation}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Fetch Nearby Stores'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* All Stores */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">All Stores ({stores.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {stores.map((store) => (
              <div
                key={store.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
              >
                <div className="flex-1">
                  <h3 className="font-semibold">{store.name}</h3>
                  <p className="text-sm text-gray-600">{store.address}</p>
                  <p className="text-xs text-gray-500">
                    Lat: {store.location.latitude.toFixed(6)}, Lng: {store.location.longitude.toFixed(6)}
                  </p>
                  {store.phone && <p className="text-xs text-gray-500">Phone: {store.phone}</p>}
                  {store.distance && (
                    <p className="text-xs text-blue-600 font-medium">
                      Distance: {store.distance.toFixed(1)} km
                    </p>
                  )}
                </div>
                <button
                  onClick={() => calculateStoreDistance(store)}
                  className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                >
                  Calculate Distance
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Nearby Stores */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Nearby Stores ({nearbyStores.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {nearbyStores.map((store) => (
              <div
                key={store.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
              >
                <div className="flex-1">
                  <h3 className="font-semibold">{store.name}</h3>
                  <p className="text-sm text-gray-600">{store.address}</p>
                  <p className="text-xs text-gray-500">
                    Lat: {store.location.latitude.toFixed(6)}, Lng: {store.location.longitude.toFixed(6)}
                  </p>
                  {store.phone && <p className="text-xs text-gray-500">Phone: {store.phone}</p>}
                  {store.distance && (
                    <p className="text-xs text-blue-600 font-medium">
                      Distance: {store.distance.toFixed(1)} km
                    </p>
                  )}
                </div>
                <button
                  onClick={() => calculateStoreDistance(store)}
                  className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                >
                  Calculate Distance
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Store Distance */}
        {selectedStore && storeDistance !== null && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
            <h3 className="font-semibold">Distance to {selectedStore.name}</h3>
            <p>Distance: {storeDistance.toFixed(2)} km</p>
          </div>
        )}
      </div>
    </div>
  );
}
