"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { searchProducts, trackSearchClick, getSearchHistory, invalidateSearchHistoryCache, getParentCategories, getCategories } from '@/lib/api';
import { getProductPath } from '@/lib/product-slug';
import { getProductImageUrl } from '@/lib/product-image';
import { stripCategoryEmojis } from '@/lib/category-display-name';
import { useLocation } from '@/contexts/LocationContext';
import { Product } from '@/store';
import { Category } from './Categories';
import AddToCartButton from './AddToCartButton';
import useCartStore from '@/store';

interface SearchResponse {
  suggestions: Array<{
    query: string;
    type: string;
    search_count: number;
  }>;
  products: Product[];
  total_results: number;
  search_metadata: {
    query: string;
    search_time_ms: number;
    mode: string;
    method?: string;
    filters_applied?: Record<string, any>;
    error?: string;
  };
}

/** Map search API product payload to the Product shape AddToCartButton expects. */
function mapSearchProductToProduct(raw: Record<string, unknown>): Product {
  const imageUrl = getProductImageUrl(raw);
  const pricing = raw.pricing as Product['pricing'] | undefined;
  const basePrice =
    pricing?.base_price ??
    (typeof raw.base_price === 'number' ? raw.base_price : undefined) ??
    (typeof raw.price === 'number' ? raw.price : 0);
  const finalPrice =
    pricing?.final_price ??
    (typeof raw.final_price === 'number' ? raw.final_price : undefined) ??
    basePrice;

  const imageUrls = Array.isArray(raw.image_urls)
    ? (raw.image_urls as string[]).filter((url) => typeof url === 'string' && url.trim())
    : imageUrl
      ? [imageUrl]
      : [];

  return {
    id: raw.id as number,
    ref: typeof raw.ref === 'string' ? raw.ref : undefined,
    name: String(raw.name ?? ''),
    description: typeof raw.description === 'string' ? raw.description : undefined,
    brand: typeof raw.brand === 'string' ? raw.brand : undefined,
    base_price: basePrice,
    unit_measure:
      typeof raw.unit_measure === 'string'
        ? raw.unit_measure
        : typeof raw.unit === 'string'
          ? raw.unit
          : '',
    image_urls: imageUrls,
    ecommerce_category_id:
      typeof raw.ecommerce_category_id === 'number'
        ? raw.ecommerce_category_id
        : undefined,
    ecommerce_subcategory_id:
      typeof raw.ecommerce_subcategory_id === 'number'
        ? raw.ecommerce_subcategory_id
        : undefined,
    pricing:
      pricing ??
      ({
        base_price: basePrice,
        final_price: finalPrice,
        discount_applied: Math.max(0, basePrice - finalPrice),
        discount_percentage:
          basePrice > 0
            ? Math.round(((basePrice - finalPrice) / basePrice) * 100)
            : 0,
        applied_price_lists: [],
      } satisfies NonNullable<Product['pricing']>),
    inventory: raw.inventory as Product['inventory'] | undefined,
    price: finalPrice,
    imageUrl: imageUrl ?? undefined,
  };
}

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  showSuggestions?: boolean;
  maxResults?: number;
}

/** Wait for typing pause before hitting the search API. */
const SEARCH_DEBOUNCE_MS = 400;

const PLACEHOLDER_ROTATE_MS = 2500;
const PLACEHOLDER_ANIMATION = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };

const DROPDOWN_SKELETON_COUNT = 5;

function collectSubcategoryNames(categories: Category[]): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  const addName = (cat?: { name?: string; display_name?: string }) => {
    if (!cat) return;
    const cleaned = stripCategoryEmojis((cat.display_name || cat.name || '').trim());
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    names.push(cleaned);
  };

  for (const cat of categories) {
    if (Array.isArray(cat.subcategories) && cat.subcategories.length > 0) {
      for (const sub of cat.subcategories) addName(sub);
    } else if (cat.parent_category_id) {
      addName(cat);
    }
  }

  return names;
}

function pickRandomName(names: string[], current: string): string {
  if (names.length === 0) return current;
  if (names.length === 1) return names[0];
  let next = current;
  let attempts = 0;
  while (next === current && attempts < 8) {
    next = names[Math.floor(Math.random() * names.length)];
    attempts += 1;
  }
  return next;
}

const AnimatedSearchPlaceholder: React.FC<{ names: string[] }> = ({ names }) => {
  const [name, setName] = useState(names[0] ?? '');
  const [width, setWidth] = useState(0);
  const sizerRef = useRef<HTMLSpanElement>(null);
  const namesRef = useRef(names);
  namesRef.current = names;
  const shownName = names.includes(name) ? name : (names[0] ?? '');

  useEffect(() => {
    if (names.length === 0) {
      setName('');
      return;
    }
    setName((prev) => (names.includes(prev) ? prev : names[0]));
  }, [names]);

  useEffect(() => {
    if (names.length < 2) return;

    const id = window.setInterval(() => {
      setName((prev) => pickRandomName(namesRef.current, prev));
    }, PLACEHOLDER_ROTATE_MS);

    return () => window.clearInterval(id);
  }, [names.length]);

  useLayoutEffect(() => {
    setWidth(sizerRef.current?.offsetWidth ?? 0);
  }, [shownName]);

  return (
    <span className="flex items-center gap-1.5 min-w-0 text-sm leading-none text-gray-400 select-none">
      <Search className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
      <span className="flex items-center min-w-0">
        <span className="shrink-0">{shownName ? 'Search "' : 'Search'}</span>
        {shownName ? (
          <motion.span
            className="relative inline-block h-[1em] max-w-[14rem] sm:max-w-[22rem] lg:max-w-[28rem] overflow-hidden align-middle"
            initial={false}
            animate={{ width: width || 0 }}
            transition={PLACEHOLDER_ANIMATION}
          >
            <span
              ref={sizerRef}
              className="absolute invisible whitespace-nowrap pointer-events-none leading-none"
              aria-hidden
            >
              {shownName}
            </span>
            <AnimatePresence initial={false}>
              <motion.span
                key={shownName}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={PLACEHOLDER_ANIMATION}
                className="absolute inset-0 leading-none truncate whitespace-nowrap"
              >
                {shownName}
              </motion.span>
            </AnimatePresence>
          </motion.span>
        ) : null}
        {shownName ? <span className="shrink-0">&quot;</span> : null}
      </span>
    </span>
  );
};

const SearchDropdownSkeleton: React.FC = () => (
  <div className="py-2">
    {Array.from({ length: DROPDOWN_SKELETON_COUNT }).map((_, index) => (
      <div
        key={index}
        className="flex items-center gap-3 p-3 animate-pulse"
        aria-hidden
      >
        <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-md" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-2 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
        <div className="flex-shrink-0 w-7 h-7 bg-gray-200 rounded-full" />
      </div>
    ))}
  </div>
);

const SearchBar: React.FC<SearchBarProps> = ({
  className = "",
  placeholder = "Search...",
  showSuggestions = true,
  maxResults = 10
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSearchPage = pathname === '/search';
  const { selectedStore, deliveryType, defaultAddress } = useLocation();
  // Subscribe to cart items to force re-render when cart changes
  const cartItems = useCartStore((state) => state.items);
  
  const [query, setQuery] = useState('');
  const [placeholderNames, setPlaceholderNames] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  // Search history state
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  // Track if user is interacting with dropdown to prevent closing
  const isInteractingRef = useRef(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevPathnameRef = useRef(pathname);
  const historyRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const activeSearchQueryRef = useRef('');
  const searchRequestIdRef = useRef(0);
  const lastCompletedSearchQueryRef = useRef('');

  const fetchSearchHistory = useCallback(async (force = false) => {
    setIsLoadingHistory(true);
    try {
      const history = await getSearchHistory(10, { force });
      setSearchHistory(history);
      return history;
    } catch (err) {
      console.error('Error fetching search history:', err);
      setSearchHistory([]);
      return [];
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const scheduleHistoryRefresh = useCallback(() => {
    invalidateSearchHistoryCache();
    if (historyRefreshTimeoutRef.current) {
      clearTimeout(historyRefreshTimeoutRef.current);
    }
    historyRefreshTimeoutRef.current = setTimeout(() => {
      historyRefreshTimeoutRef.current = null;
      fetchSearchHistory(true);
    }, 800);
  }, [fetchSearchHistory]);

  const navigateToSearchPage = useCallback(
    (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (trimmed.length < 2) return;

      const url = `/search?q=${encodeURIComponent(trimmed)}`;
      const currentQuery = isSearchPage ? searchParams.get('q') || '' : '';

      if (isSearchPage && currentQuery === trimmed) {
        setIsOpen(false);
        return;
      }

      if (isSearchPage) {
        router.replace(url, { scroll: false });
      } else {
        router.push(url);
        setQuery('');
      }

      setIsOpen(false);
      scheduleHistoryRefresh();
    },
    [isSearchPage, searchParams, router, scheduleHistoryRefresh]
  );

  // Keep header input in sync with the URL on the search results page.
  useEffect(() => {
    if (!isSearchPage) return;
    setQuery((searchParams.get('q') || '').trim());
  }, [isSearchPage, searchParams]);

  // Run dropdown search — aborts stale requests, ignores out-of-date responses.
  const performSearch = useCallback(async (searchQuery: string, signal: AbortSignal) => {
    if (!searchQuery || searchQuery.length < 2) {
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    activeSearchQueryRef.current = searchQuery;
    setIsLoading(true);
    setError(null);

    try {
      const searchOptions: {
        limit: number;
        includePricing: boolean;
        includeInventory: boolean;
        includeCategories: boolean;
        includeTags: boolean;
        storeIds?: number[];
        latitude?: number;
        longitude?: number;
        signal: AbortSignal;
      } = {
        limit: maxResults,
        includePricing: true,
        includeInventory: true,
        includeCategories: false,
        includeTags: false,
        signal,
      };

      if (deliveryType === 'pickup' && selectedStore?.id) {
        const storeId = parseInt(String(selectedStore.id), 10);
        if (!Number.isNaN(storeId)) {
          searchOptions.storeIds = [storeId];
        }
      } else if (
        deliveryType === 'delivery' &&
        defaultAddress?.latitude &&
        defaultAddress?.longitude
      ) {
        searchOptions.latitude = defaultAddress.latitude;
        searchOptions.longitude = defaultAddress.longitude;
      }

      const searchResults = await searchProducts(
        searchQuery,
        'dropdown',
        searchOptions
      );

      if (
        signal.aborted ||
        requestId !== searchRequestIdRef.current ||
        activeSearchQueryRef.current !== searchQuery
      ) {
        return;
      }

      setResults({
        ...searchResults,
        products: (searchResults.products || []).map(
          (product: Record<string, unknown>) => mapSearchProductToProduct(product)
        ),
      });
      lastCompletedSearchQueryRef.current = searchQuery;
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (
        requestId !== searchRequestIdRef.current ||
        activeSearchQueryRef.current !== searchQuery
      ) {
        return;
      }
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults(null);
      lastCompletedSearchQueryRef.current = searchQuery;
      setIsOpen(true);
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [maxResults, selectedStore, deliveryType, defaultAddress]);

  // Load subcategory names for the rotating placeholder (hits the shared categories cache).
  useEffect(() => {
    let cancelled = false;

    const loadNames = async () => {
      try {
        const parents = await getParentCategories();
        let names = collectSubcategoryNames(Array.isArray(parents) ? parents : []);
        if (names.length === 0) {
          const all = await getCategories(true, false);
          names = collectSubcategoryNames(Array.isArray(all) ? all : []);
        }
        if (!cancelled) setPlaceholderNames(names);
      } catch (err) {
        console.error('Error fetching search placeholder names:', err);
      }
    };

    void loadNames();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load history once on mount (deduped in api.ts)
  useEffect(() => {
    fetchSearchHistory();
  }, [fetchSearchHistory]);

  // Refresh when returning from the search page only
  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (prev === '/search' && pathname !== '/search') {
      fetchSearchHistory(true);
    }
  }, [pathname, fetchSearchHistory]);

  // Refresh when tab regains focus — throttled via api cache TTL
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSearchHistory();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (historyRefreshTimeoutRef.current) {
        clearTimeout(historyRefreshTimeoutRef.current);
      }
    };
  }, [fetchSearchHistory]);

  // Debounced dropdown search — skipped on /search (full results page handles fetching).
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
      searchAbortRef.current = null;
    }

    if (isSearchPage) {
      setResults(null);
      setIsOpen(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (query.trim().length < 2) {
      activeSearchQueryRef.current = query;
      lastCompletedSearchQueryRef.current = '';
      setResults(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const trimmedQuery = query.trim();

    // Show dropdown skeleton immediately while debouncing / fetching.
    activeSearchQueryRef.current = trimmedQuery;
    setIsLoading(true);
    setError(null);
    setIsOpen(true);

    debounceTimeoutRef.current = setTimeout(() => {
      debounceTimeoutRef.current = null;
      const controller = new AbortController();
      searchAbortRef.current = controller;
      void performSearch(trimmedQuery, controller.signal);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
        searchAbortRef.current = null;
      }
    };
  }, [query, performSearch, isSearchPage]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    if (value.trim().length < 2) {
      lastCompletedSearchQueryRef.current = '';
      setResults(null);
      setIsLoading(false);
      // Show history if available when input is cleared
      if (value.length === 0 && searchHistory.length > 0 && document.activeElement === inputRef.current) {
        setIsOpen(true);
      } else if (value.length === 0) {
        setIsOpen(false);
      }
    } else if (!isSearchPage) {
      setIsLoading(true);
      setIsOpen(true);
    }
  };

  // Handle product click
  const handleProductClick = async (product: Product) => {
    try {
      // Track the click (this also saves the search query to history on backend)
      await trackSearchClick(query, product.id);

      router.push(
        getProductPath({ id: product.id, name: product.name, ref: product.ref })
      );
      setIsOpen(false);
      setQuery('');
      scheduleHistoryRefresh();
    } catch (err) {
      console.error('Error tracking search click:', err);
      router.push(
        getProductPath({ id: product.id, name: product.name, ref: product.ref })
      );
      setIsOpen(false);
      setQuery('');
      scheduleHistoryRefresh();
    }
  };

  // Handle history item click
  const handleHistoryClick = async (historyQuery: string) => {
    navigateToSearchPage(historyQuery);
  };

  const handleShowAllResults = () => {
    navigateToSearchPage(query);
  };

  // Handle clear button click
  const handleClear = async () => {
    setQuery('');
    setResults(null);
    lastCompletedSearchQueryRef.current = '';
    setSelectedIndex(-1);
    const history = await fetchSearchHistory();
    if (history.length > 0) {
      setIsOpen(true);
    }
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      const showingHistory = query.length < 2 && searchHistory.length > 0;
      const showingProducts =
        !isSearchPage &&
        query.length >= 2 &&
        results?.products &&
        results.products.length > 0;

      if (showingHistory && selectedIndex >= 0 && selectedIndex < searchHistory.length) {
        e.preventDefault();
        handleHistoryClick(searchHistory[selectedIndex]);
        return;
      }

      if (showingProducts && selectedIndex >= 0 && selectedIndex < results.products.length) {
        e.preventDefault();
        handleProductClick(results.products[selectedIndex]);
        return;
      }

      e.preventDefault();
      navigateToSearchPage(query);
      return;
    }

    if (!isOpen) return;

    // Determine if we're showing history or products
    const showingHistory = query.length < 2 && searchHistory.length > 0;
    const showingProducts = query.length >= 2 && results?.products && results.products.length > 0;

    if (showingHistory) {
      // Navigate through history items
      const totalItems = searchHistory.length;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < totalItems - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < totalItems) {
            handleHistoryClick(searchHistory[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    } else if (showingProducts) {
      // Navigate through product results
      const products = results.products;
      const totalItems = products.length;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < totalItems - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < totalItems) {
            handleProductClick(products[selectedIndex]);
          } else {
            navigateToSearchPage(query);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    }
  };

  // Handle input focus
  const handleFocus = async () => {
    if (query.length >= 2 && results) {
      setIsOpen(true);
    } else if (query.length === 0) {
      if (searchHistory.length > 0) {
        setIsOpen(true);
      }
      const history = await fetchSearchHistory();
      if (history.length > 0 && document.activeElement === inputRef.current) {
        setIsOpen(true);
      }
    } else if (query.length < 2) {
      setIsOpen(false);
    }
  };

  // Handle input blur
  const handleBlur = (e: React.FocusEvent) => {
    // Delay closing to allow clicks on dropdown items and cart buttons
    setTimeout(() => {
      // Don't close if user is interacting with dropdown
      if (isInteractingRef.current) {
        isInteractingRef.current = false;
        return;
      }
      
      // Check if focus moved to an element inside the dropdown
      const activeElement = document.activeElement;
      const relatedTarget = e.relatedTarget as Node;
      
      // Don't close if focus moved to dropdown or input
      if (
        dropdownRef.current?.contains(activeElement) || 
        dropdownRef.current?.contains(relatedTarget) ||
        inputRef.current?.contains(activeElement) ||
        inputRef.current?.contains(relatedTarget)
      ) {
        return;
      }
      
      // Only close if focus truly moved outside
      setIsOpen(false);
      setSelectedIndex(-1);
    }, 300);
  };


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Don't close if clicking inside dropdown or input
      if (
        dropdownRef.current?.contains(target) ||
        inputRef.current?.contains(target)
      ) {
        return;
      }
      
      // Close if clicking outside
      setIsOpen(false);
      setSelectedIndex(-1);
    };

    // Use click instead of mousedown to avoid conflicts
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, []);

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const trimmedQuery = query.trim();
  const isDropdownSearchPending =
    !isSearchPage &&
    trimmedQuery.length >= 2 &&
    (isLoading || lastCompletedSearchQueryRef.current !== trimmedQuery);
  const hasDropdownSearchCompleted =
    !isSearchPage &&
    trimmedQuery.length >= 2 &&
    !isLoading &&
    lastCompletedSearchQueryRef.current === trimmedQuery &&
    results !== null;

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder=""
          aria-label={placeholder || 'Search'}
          className="w-full border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-8"
        />
        <div
          className={`absolute inset-0 flex items-center px-3 pr-8 pointer-events-none text-sm overflow-hidden ${
            query.length === 0 ? '' : 'invisible'
          }`}
          aria-hidden
        >
          <AnimatedSearchPlaceholder names={placeholderNames} />
        </div>
        
        {/* Clear button - hide when loading */}
        {query.length > 0 && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none z-10"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {/* Loading indicator */}
        {isLoading && query.length > 0 && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Search Dropdown */}
      {isOpen && showSuggestions && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          onMouseDown={(e) => {
            // Mark that user is interacting with dropdown
            isInteractingRef.current = true;
            // Prevent input blur when clicking inside dropdown (but allow scrolling)
            // Only prevent for interactive elements, not scrollable areas
            const target = e.target as HTMLElement;
            if (target.tagName === 'BUTTON' || target.closest('button') || target.closest('[role="button"]')) {
              e.preventDefault();
            }
          }}
          onMouseUp={() => {
            // Reset interaction flag after a short delay
            setTimeout(() => {
              isInteractingRef.current = false;
            }, 100);
          }}
        >
          {error ? (
            <div className="p-3 text-red-600 text-sm">
              {error}
            </div>
          ) : query.length === 0 && searchHistory.length > 0 ? (
            // Show search history when input is empty
            <div className="py-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Recently Searched
              </div>
              {isLoadingHistory ? (
                <div className="p-3 text-center text-gray-500 text-sm">
                  Loading history...
                </div>
              ) : (
                searchHistory.map((historyQuery, index) => (
                  <div
                    key={index}
                    onClick={() => handleHistoryClick(historyQuery)}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedIndex === index ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Clock icon */}
                    <div className="flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    
                    {/* History query text */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-900 truncate">
                        {historyQuery}
                      </span>
                    </div>
                    
                    {/* Arrow indicator */}
                    <div className="flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : isDropdownSearchPending ? (
            <SearchDropdownSkeleton />
          ) : hasDropdownSearchCompleted && results.products.length > 0 ? (
            <div className="py-2">
              {results.products.map((product, index) => {
                const imageUrl = getProductImageUrl(product);
                const finalPrice =
                  product.pricing?.final_price ?? product.base_price ?? product.price ?? 0;
                const basePrice =
                  product.pricing?.base_price ?? product.base_price ?? finalPrice;

                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedIndex === index ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Product Image */}
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-md overflow-hidden">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={product.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </h3>
                      {product.brand && (
                        <p className="text-xs text-gray-500 truncate">
                          {product.brand}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatPrice(finalPrice)}
                        </span>
                        {finalPrice < basePrice && (
                          <span className="text-xs text-gray-500 line-through">
                            {formatPrice(basePrice)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Cart Controls - Use AddToCartButton like homepage */}
                    <div 
                      className="flex-shrink-0" 
                      onClick={(e) => {
                        e.stopPropagation();
                        isInteractingRef.current = true;
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        isInteractingRef.current = true;
                      }}
                    >
                      <AddToCartButton product={product} />
                    </div>
                    
                    {/* Arrow indicator */}
                    <div className="flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={handleShowAllResults}
                onMouseDown={(e) => {
                  e.preventDefault();
                  isInteractingRef.current = true;
                }}
                className="w-full px-3 py-2.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-t border-gray-100 transition-colors text-center"
              >
                {results.total_results > results.products.length
                  ? `Show all ${results.total_results} results`
                  : 'Show more'}
              </button>
            </div>
          ) : hasDropdownSearchCompleted && results.products.length === 0 ? (
            <div className="p-3 text-gray-500 text-sm text-center">
              No products found for &quot;{trimmedQuery}&quot;
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
