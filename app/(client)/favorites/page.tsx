"use client";

import React, { useEffect } from "react";
import Container from "@/components/Container";
import ProductGrid from "@/components/ProductGrid";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useFavorites } from "@/contexts/FavoritesContext";
import Loader from "@/components/Loader";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const { favorites, loading, error, refetch } = useFavorites();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?returnUrl=" + encodeURIComponent("/favorites"));
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      refetch();
    }
  }, [user, refetch]);

  if (authLoading) {
    return <Loader />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <Container className="py-3 sm:py-4">
        <div className="flex items-center mb-3 sm:mb-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mr-3 sm:mr-4"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            <span className="font-medium text-sm sm:text-base truncate">Favorites</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
            <p className="font-semibold">⚠️ {error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4 md:mb-6">
            Favorites
          </h1>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="w-full">
                  <ProductCardSkeleton />
                </div>
              ))}
            </div>
          ) : favorites.length > 0 ? (
            <ProductGrid products={favorites} />
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No favorites yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Tap the heart on any product to add it here.
              </p>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
