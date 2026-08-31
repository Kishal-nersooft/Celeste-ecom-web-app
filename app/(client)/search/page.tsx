"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Container from "@/components/Container";
import ProductGrid from "@/components/ProductGrid";
import { searchProducts } from "@/lib/api";
import { useLocation } from "@/contexts/LocationContext";
import Loader from "@/components/Loader";
import { Product } from "@/store";

const SEARCH_PAGE_SIZE = 20;

const SearchPageContent = () => {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") || "";
  const query = rawQuery.trim();
  const { selectedStore, deliveryType, defaultAddress } = useLocation();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchAbortRef = useRef<AbortController | null>(null);
  const activeQueryRef = useRef(query);
  const lastFetchedQueryRef = useRef("");

  const buildSearchOptions = useCallback(
    (cursor?: string | null) => {
      const options: {
        limit: number;
        includePricing: boolean;
        includeInventory: boolean;
        includeCategories: boolean;
        storeIds?: number[];
        latitude?: number;
        longitude?: number;
        cursor?: string;
        signal?: AbortSignal;
      } = {
        limit: SEARCH_PAGE_SIZE,
        includePricing: true,
        includeInventory: true,
        includeCategories: true,
      };

      if (cursor) {
        options.cursor = cursor;
      }

      if (deliveryType === "pickup" && selectedStore?.id) {
        const storeId = parseInt(String(selectedStore.id), 10);
        if (!Number.isNaN(storeId)) {
          options.storeIds = [storeId];
        }
      } else if (
        deliveryType === "delivery" &&
        defaultAddress?.latitude &&
        defaultAddress?.longitude
      ) {
        options.latitude = defaultAddress.latitude;
        options.longitude = defaultAddress.longitude;
      }

      return options;
    },
    [selectedStore, deliveryType, defaultAddress]
  );

  useLayoutEffect(() => {
    activeQueryRef.current = query;

    if (!query || query.length < 2) {
      setProducts([]);
      setTotalResults(0);
      setHasMore(false);
      setNextCursor(null);
      setLoading(false);
      setError(null);
      lastFetchedQueryRef.current = "";
      return;
    }

    setLoading(true);
    setError(null);
    setProducts([]);
    setTotalResults(0);
    setHasMore(false);
    setNextCursor(null);
  }, [query]);

  useEffect(() => {
    activeQueryRef.current = query;

    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }

    if (!query || query.length < 2) {
      return;
    }

    const controller = new AbortController();
    fetchAbortRef.current = controller;

    const fetchFirstPage = async () => {
      try {
        const searchResults = await searchProducts(query, "full", {
          ...buildSearchOptions(),
          signal: controller.signal,
        });

        if (controller.signal.aborted || activeQueryRef.current !== query) {
          return;
        }

        setProducts(searchResults.products || []);
        setTotalResults(searchResults.total_results || 0);
        setNextCursor(searchResults.pagination?.nextCursor ?? null);
        setHasMore(searchResults.pagination?.hasMore ?? false);
        lastFetchedQueryRef.current = query;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (activeQueryRef.current !== query) {
          return;
        }
        console.error("Search error:", err);
        setError(err instanceof Error ? err.message : "Search failed");
        setProducts([]);
        setTotalResults(0);
        setHasMore(false);
        setNextCursor(null);
        lastFetchedQueryRef.current = query;
      } finally {
        if (!controller.signal.aborted && activeQueryRef.current === query) {
          setLoading(false);
        }
      }
    };

    void fetchFirstPage();

    return () => {
      fetchAbortRef.current?.abort();
    };
  }, [query, buildSearchOptions]);

  const loadMore = useCallback(async () => {
    if (!query || query.length < 2 || loading || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    try {
      const searchResults = await searchProducts(
        query,
        "full",
        buildSearchOptions(nextCursor)
      );

      if (activeQueryRef.current !== query) {
        return;
      }

      setProducts((prev) => [...prev, ...(searchResults.products || [])]);
      setTotalResults(searchResults.total_results || 0);
      setNextCursor(searchResults.pagination?.nextCursor ?? null);
      setHasMore(searchResults.pagination?.hasMore ?? false);
    } catch (err) {
      console.error("Search load-more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [query, loading, loadingMore, hasMore, nextCursor, buildSearchOptions]);

  useEffect(() => {
    const handleScroll = () => {
      if (loading || loadingMore || !hasMore) return;

      const { scrollY, innerHeight } = window;
      const docHeight = document.documentElement.scrollHeight;
      const isNearBottom = scrollY + innerHeight >= docHeight - 200;

      if (isNearBottom) {
        void loadMore();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMore, loading, loadingMore, hasMore]);

  const hasFetchedCurrentQuery = lastFetchedQueryRef.current === query;
  const showInitialSkeleton =
    products.length === 0 && (loading || !hasFetchedCurrentQuery);
  const showEmptyState =
    !loading && hasFetchedCurrentQuery && products.length === 0;

  if (loading && !query) {
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

  if (error && products.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-normal min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl text-center">
          <h1 className="text-3xl font-bold mb-3 text-red-600">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Container className="py-3 sm:py-4">
        <div className="mx-auto w-full max-w-[1200px] bg-white rounded-lg shadow-md px-4 sm:px-6 md:px-8 py-4 sm:py-5">
          <h1 className="text-sm sm:text-base font-semibold text-gray-700 mb-3 sm:mb-4 text-left">
            Search results for{" "}
            <span className="text-darkBlue">&quot;{query}&quot;</span>
          </h1>

          {showInitialSkeleton ? (
            <ProductGrid products={[]} loading centered />
          ) : showEmptyState ? (
            <div className="py-12 text-center">
              <p className="text-base sm:text-lg font-semibold text-gray-800 mb-2">
                No products found for &quot;{query}&quot;
              </p>
              <p className="text-sm text-gray-600">
                Try searching with different keywords
              </p>
            </div>
          ) : (
            <ProductGrid
              products={products}
              loading={loading}
              loadingMore={loadingMore}
              hasMore={hasMore}
              onLoadMore={loadMore}
              centered
            />
          )}
        </div>
      </Container>
    </div>
  );
};

const SearchPage = () => {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
          <Loader />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
};

export default SearchPage;
