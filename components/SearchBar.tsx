"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { searchProducts, trackSearchClick, getProductById, getSearchHistory } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import { Product } from '@/store';
import AddToCartButton from './AddToCartButton';
import useCartStore from '@/store';

interface SearchResult {
  id: number;
  name: string;
  ref: string;
  image_url: string;
  base_price: number;
  final_price: number;
}

interface SearchResponse {
  suggestions: Array<{
    query: string;
    type: string;
    search_count: number;
  }>;
  products: SearchResult[];
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

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  showSuggestions?: boolean;
  maxResults?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  className = "",
  placeholder = "Search...",
  showSuggestions = true,
  maxResults = 10
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedStore, deliveryType, defaultAddress } = useLocation();
  // Subscribe to cart items to force re-render when cart changes
  const cartItems = useCartStore((state) => state.items);
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  // Search history state
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  // Store full product data for products that have been fetched
  const [productDataCache, setProductDataCache] = useState<Map<number, Product>>(new Map());
  // Track if user is interacting with dropdown to prevent closing
  const isInteractingRef = useRef(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch search history with force refresh
  const fetchSearchHistory = useCallback(async (force = false) => {
    setIsLoadingHistory(true);
    try {
      const history = await getSearchHistory(10);
      console.log('🔍 Search History - Fetched from API:', history);
      // Always update state to ensure fresh data is displayed
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

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults(null);
      // If query is empty, we'll handle showing history in handleFocus
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchOptions: any = {
        includePricing: true,
        includeInventory: true
      };

      // Add location context based on delivery type
      if (deliveryType === 'pickup' && selectedStore?.id) {
        // For pickup mode, use store ID
        searchOptions.storeIds = [selectedStore.id];
      } else if (deliveryType === 'delivery' && defaultAddress?.latitude && defaultAddress?.longitude) {
        // For delivery mode, use user's coordinates
        searchOptions.latitude = defaultAddress.latitude;
        searchOptions.longitude = defaultAddress.longitude;
      }

      const searchResults = await searchProducts(searchQuery, 'dropdown', searchOptions);
      
      // Show all results
      setResults(searchResults);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults(null);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStore, deliveryType, defaultAddress]);

  // Fetch history on mount
  useEffect(() => {
    fetchSearchHistory();
  }, [fetchSearchHistory]);

  // Refresh history when page becomes visible (user comes back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh history when user comes back to the page
        fetchSearchHistory();
      }
    };

    const handleWindowFocus = () => {
      // Refresh history when window regains focus (user switches back to browser tab)
      fetchSearchHistory();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchSearchHistory]);

  // Refresh history when navigating back to home page (not on search page)
  useEffect(() => {
    // If we're not on the search page, refresh history
    // This ensures history is fresh when user navigates back from search page
    if (pathname !== '/search') {
      // Delays to ensure backend has saved the query - force refresh
      const timer1 = setTimeout(() => {
        fetchSearchHistory(true);
      }, 500);
      const timer2 = setTimeout(() => {
        fetchSearchHistory(true);
      }, 1200);
      const timer3 = setTimeout(() => {
        fetchSearchHistory(true);
      }, 2000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [pathname, fetchSearchHistory]);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1); // Reset selection when typing
    if (value.length < 2) {
      setResults(null);
      // Show history if available when input is cleared
      if (value.length === 0 && searchHistory.length > 0 && document.activeElement === inputRef.current) {
        setIsOpen(true);
      } else if (value.length === 0) {
        setIsOpen(false);
      }
    }
  };

  // Handle product click
  const handleProductClick = async (product: SearchResult) => {
    try {
      // Track the click (this also saves the search query to history on backend)
      await trackSearchClick(query, product.id);
      
      // Navigate to search page with query
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
      setQuery('');
      
      // Refresh history after delays to ensure backend has saved it
      // Multiple attempts to catch the save - force refresh each time
      setTimeout(() => {
        fetchSearchHistory(true);
      }, 800);
      setTimeout(() => {
        fetchSearchHistory(true);
      }, 1500);
      setTimeout(() => {
        fetchSearchHistory(true);
      }, 2500);
    } catch (err) {
      console.error('Error tracking search click:', err);
      // Still navigate even if tracking fails
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
      setQuery('');
      // Refresh history after search - force refresh
      setTimeout(() => {
        fetchSearchHistory(true);
      }, 800);
      setTimeout(() => {
        fetchSearchHistory(true);
      }, 1500);
      setTimeout(() => {
        fetchSearchHistory(true);
      }, 2500);
    }
  };

  // Handle history item click
  const handleHistoryClick = async (historyQuery: string) => {
    // Navigate directly to search page
    router.push(`/search?q=${encodeURIComponent(historyQuery)}`);
    setIsOpen(false);
    setQuery('');
    
    // Refresh history after navigation (backend saves the query when navigating to search page)
    setTimeout(() => {
      fetchSearchHistory(true);
    }, 800);
    setTimeout(() => {
      fetchSearchHistory(true);
    }, 1500);
    setTimeout(() => {
      fetchSearchHistory(true);
    }, 2500);
  };

  // Handle clear button click
  const handleClear = async () => {
    setQuery('');
    setResults(null);
    setSelectedIndex(-1);
    // Always fetch fresh history when clearing
    const history = await fetchSearchHistory(true);
    if (history.length > 0) {
      setIsOpen(true);
    }
    inputRef.current?.focus();
  };

  // Fetch full product data (with caching)
  const fetchProductData = useCallback(async (product: SearchResult): Promise<Product | null> => {
    // Check cache first
    if (productDataCache.has(product.id)) {
      return productDataCache.get(product.id)!;
    }
    
    try {
      // Get location context for fetching product
      let storeIds: number[] | undefined;
      let latitude: number | undefined;
      let longitude: number | undefined;
      
      if (deliveryType === 'pickup' && selectedStore?.id) {
        // Convert store ID string to number
        const storeIdNum = parseInt(selectedStore.id, 10);
        if (!isNaN(storeIdNum)) {
          storeIds = [storeIdNum];
        }
      } else if (deliveryType === 'delivery' && defaultAddress?.latitude && defaultAddress?.longitude) {
        latitude = defaultAddress.latitude;
        longitude = defaultAddress.longitude;
      }
      
      // Fetch full product data
      const fullProduct = await getProductById(
        product.id.toString(),
        storeIds,
        latitude,
        longitude
      );
      
      if (!fullProduct) {
        return null;
      }
      
      // Cache the product data
      setProductDataCache(prev => new Map(prev).set(product.id, fullProduct));
      return fullProduct;
    } catch (error) {
      console.error('Failed to fetch product data:', error);
      return null;
    }
  }, [productDataCache, deliveryType, selectedStore, defaultAddress]);

  // Pre-fetch product data for all search results (so AddToCartButton can work)
  useEffect(() => {
    if (!results?.products || !isOpen) return;

    const fetchAllProductData = async () => {
      for (const product of results.products) {
        // Fetch product data if not cached
        if (!productDataCache.has(product.id)) {
          // Fetch in background without blocking UI
          fetchProductData(product).catch(err => {
            console.error(`Failed to pre-fetch product ${product.id}:`, err);
          });
        }
      }
    };

    fetchAllProductData();
  }, [results?.products, isOpen, productDataCache, fetchProductData]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
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
          } else if (query.length >= 2) {
            // If no product selected, navigate to search page with query
            // Backend will save the query when navigating to search page (via searchProducts call)
            const searchQuery = query;
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
            setIsOpen(false);
            setQuery('');
            // Refresh history after delays to ensure backend has saved it
            // Multiple attempts to catch the save - force refresh
            setTimeout(() => {
              fetchSearchHistory(true);
            }, 800);
            setTimeout(() => {
              fetchSearchHistory(true);
            }, 1500);
            setTimeout(() => {
              fetchSearchHistory(true);
            }, 2500);
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
      // Always refresh history when focusing on empty search bar
      // This ensures we get the latest history from backend
      // Refresh immediately and also after delays to catch any recent saves
      const history = await fetchSearchHistory(true);
      if (history.length > 0 && document.activeElement === inputRef.current) {
        setIsOpen(true);
      }
      // Also refresh after delays to catch any recent backend saves - force refresh
      setTimeout(() => {
        fetchSearchHistory(true).then((refreshedHistory) => {
          if (refreshedHistory.length > 0 && document.activeElement === inputRef.current && query.length === 0) {
            setIsOpen(true);
          }
        });
      }, 600);
      setTimeout(() => {
        fetchSearchHistory(true).then((refreshedHistory) => {
          if (refreshedHistory.length > 0 && document.activeElement === inputRef.current && query.length === 0) {
            setIsOpen(true);
          }
        });
      }, 1500);
    } else if (query.length < 2) {
      // Query is 1 character, don't show anything
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
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-8"
        />
        
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
          ) : results?.products && results.products.length > 0 ? (
            <div className="py-2">
              {results.products.map((product, index) => {
                const cachedProduct = productDataCache.get(product.id);
                
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
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
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
                      <p className="text-xs text-gray-500 truncate">
                        {product.ref}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatPrice(product.final_price)}
                        </span>
                        {product.final_price < product.base_price && (
                          <span className="text-xs text-gray-500 line-through">
                            {formatPrice(product.base_price)}
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
                      {cachedProduct ? (
                        <AddToCartButton product={cachedProduct} />
                      ) : (
                        // Show loading state while fetching product data
                        <div className="w-7 h-7 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                        </div>
                      )}
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
            </div>
          ) : query.length >= 2 ? (
            <div className="p-3 text-gray-500 text-sm text-center">
              No products found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
