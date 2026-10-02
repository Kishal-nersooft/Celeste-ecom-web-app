"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { addToFavorites, getFavorites, removeFromFavorites } from "@/lib/api";
import { Product } from "@/store";
import { useLocation } from "@/contexts/LocationContext";

interface FavoritesContextType {
  favorites: Product[];
  favoriteIds: Set<number>;
  isFavorite: (productId: number) => boolean;
  addFavorite: (productId: number) => Promise<void>;
  removeFavorite: (productId: number) => Promise<void>;
  refetch: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { deliveryType, selectedStore, defaultAddress } = useLocation();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const storeId =
        deliveryType === "pickup" && selectedStore?.id
          ? parseInt(String(selectedStore.id), 10)
          : NaN;
      const data = await getFavorites({
        include_products: true,
        latitude:
          deliveryType === "delivery" ? defaultAddress?.latitude : undefined,
        longitude:
          deliveryType === "delivery" ? defaultAddress?.longitude : undefined,
        store_ids: Number.isFinite(storeId) ? [storeId] : undefined,
      });
      const list = Array.isArray(data)
        ? (data as Product[]).filter((p) => p && typeof p.id === "number")
        : [];
      setFavorites(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load favorites");
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [user, deliveryType, selectedStore, defaultAddress]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((p) => p.id)),
    [favorites]
  );

  const isFavorite = useCallback(
    (productId: number) => favoriteIds.has(productId),
    [favoriteIds]
  );

  const addFavorite = useCallback(
    async (productId: number) => {
      if (!user) return;
      try {
        await addToFavorites(productId);
        await refetch();
      } catch (e) {
        throw e;
      }
    },
    [user, refetch]
  );

  const removeFavorite = useCallback(
    async (productId: number) => {
      if (!user) return;
      try {
        await removeFromFavorites(productId);
        await refetch();
      } catch (e) {
        throw e;
      }
    },
    [user, refetch]
  );

  const value: FavoritesContextType = {
    favorites,
    favoriteIds,
    isFavorite,
    addFavorite,
    removeFavorite,
    refetch,
    loading,
    error,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (ctx === undefined) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}
