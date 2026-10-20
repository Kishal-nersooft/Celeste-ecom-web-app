"use client";

import React, { useEffect } from "react";
import Container from "@/components/Container";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useFavorites } from "@/contexts/FavoritesContext";
import Loader from "@/components/Loader";
import AuthRetryScreen from "@/components/AuthRetryScreen";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart } from "lucide-react";

export default function FavoritesPage() {
  const { user, loading: authLoading, unresolved, isGuest } = useAuth();
  const { favorites, loading, error, refetch } = useFavorites();
  const router = useRouter();

  useEffect(() => {
    if (isGuest) {
      router.push("/login?returnUrl=" + encodeURIComponent("/favorites"));
    }
  }, [isGuest, router]);

  useEffect(() => {
    if (user) {
      refetch();
    }
  }, [user, refetch]);

  if (authLoading && !unresolved) {
    return <Loader />;
  }

  if (unresolved) {
    return <AuthRetryScreen />;
  }

  if (!user) {
    return null;
  }

  const productGridClass =
    "grid w-full grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6";

  return (
    <div className="bg-gray-100 pb-6">
      <Container className="py-3 sm:py-4">
        <div className="relative mb-3 flex h-11 items-center sm:mb-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Back to home"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50"
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold tracking-tight text-neutral-900 sm:text-lg">
            Favorites
          </h1>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-yellow-400 bg-yellow-100 px-4 py-3 text-yellow-800">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        <div className="rounded-lg bg-white p-3 shadow-md sm:p-4 md:p-6">
          {loading ? (
            <div className={productGridClass}>
              {Array.from({ length: 6 }).map((_, index) => (
                <ProductCardSkeleton key={`skeleton-${index}`} compact />
              ))}
            </div>
          ) : favorites.length > 0 ? (
            <div className={productGridClass}>
              {favorites.map((product) => (
                <ProductCard key={product.id} product={product} compact />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-12 text-center sm:py-16">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Heart className="h-6 w-6 text-black" />
              </div>
              <p className="text-lg font-semibold text-black">No favorites yet</p>
              <p className="mt-1 max-w-xs text-sm text-gray-500">
                Tap the heart on any product to save it here.
              </p>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mt-6 rounded-md bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
              >
                Browse products
              </button>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
