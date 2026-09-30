'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import StoreCard from './StoreCard';
import { getNearbyStores, getStores } from '@/lib/api';
import { Store } from '@/types/store';
import { useLocation } from '@/contexts/LocationContext';

type StoreRecord = Store & {
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
  distance?: number | null;
};

function storeCoordinates(store: StoreRecord) {
  const latitude = Number(store.location?.latitude ?? store.latitude);
  const longitude = Number(store.location?.longitude ?? store.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number) {
  if (km < 1) return `${Math.max(50, Math.round(km * 1000 / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function StoreCardSkeleton() {
  return (
    <div className="flex animate-pulse gap-3 rounded-2xl border border-neutral-200 bg-white p-3 sm:gap-4 sm:p-4">
      <div className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-xl bg-neutral-200 sm:h-24 sm:w-24" />
      <div className="flex flex-1 flex-col justify-between py-1">
        <div className="space-y-2">
          <div className="h-4 w-2/3 rounded bg-neutral-200" />
          <div className="h-3 w-1/2 rounded bg-neutral-100" />
        </div>
        <div className="h-3 w-16 rounded bg-neutral-100" />
      </div>
    </div>
  );
}

const StoresGrid: React.FC = () => {
  const { defaultAddress, selectedStore } = useLocation();
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [userPoint, setUserPoint] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    const latitude = Number(defaultAddress?.latitude);
    const longitude = Number(defaultAddress?.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      setUserPoint({ latitude, longitude });
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPoint({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {},
      { timeout: 5000, enableHighAccuracy: false }
    );
  }, [defaultAddress?.latitude, defaultAddress?.longitude]);

  useEffect(() => {
    let cancelled = false;

    async function fetchStores() {
      try {
        setLoading(true);
        setError(null);
        let list: StoreRecord[] = [];
        if (userPoint) {
          try {
            const nearby = await getNearbyStores(userPoint.latitude, userPoint.longitude, 80);
            if (Array.isArray(nearby) && nearby.length > 0) list = nearby;
          } catch (nearbyError) {
            console.error('Nearby stores unavailable, loading all stores:', nearbyError);
          }
        }
        if (list.length === 0) {
          const allStores = await getStores();
          list = Array.isArray(allStores) ? allStores : [];
        }
        if (!cancelled) setStores(list);
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load stores';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStores();
    return () => {
      cancelled = true;
    };
  }, [userPoint]);

  const listedStores = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return stores
      .filter((store) => store.is_active !== false && store.isActive !== false)
      .map((store) => {
        const point = storeCoordinates(store);
        const km =
          userPoint && point
            ? distanceKm(userPoint, point)
            : typeof store.distance === 'number'
              ? store.distance
              : null;
        return { store, km };
      })
      .filter(({ store }) => {
        if (!needle) return true;
        return (
          store.name.toLowerCase().includes(needle) ||
          store.address.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => {
        const aSelected = selectedStore?.id != null && String(selectedStore.id) === String(a.store.id);
        const bSelected = selectedStore?.id != null && String(selectedStore.id) === String(b.store.id);
        if (aSelected !== bSelected) return aSelected ? -1 : 1;
        if (a.km != null && b.km != null) return a.km - b.km;
        if (a.km != null) return -1;
        if (b.km != null) return 1;
        return a.store.name.localeCompare(b.store.name);
      });
  }, [stores, query, userPoint, selectedStore?.id]);

  return (
    <section className="py-6 sm:py-8">
      <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Pickup</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Choose a store
          </h2>
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Search stores</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search stores"
            className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-neutral-900 focus:bg-white"
          />
        </label>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
          <StoreCardSkeleton />
          <StoreCardSkeleton />
          <StoreCardSkeleton />
          <StoreCardSkeleton />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-10 text-center">
          <p className="text-sm text-neutral-600">We couldn&apos;t load stores. Try again in a moment.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      ) : listedStores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
          <p className="text-sm text-neutral-500">
            {query ? 'No stores match that search.' : 'No stores are available right now.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
            {listedStores.map(({ store, km }) => (
              <StoreCard
                key={store.id}
                store={store}
                distanceLabel={km != null && km < 200 ? formatDistance(km) : null}
                selected={selectedStore?.id != null && String(selectedStore.id) === String(store.id)}
              />
            ))}
        </div>
      )}
    </section>
  );
};

export default StoresGrid;
