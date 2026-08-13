/**
 * Backend API base URL.
 *
 * - Browser: same-origin Next.js proxy (`/api/backend`) so `BACKEND_CLIENT_SECRET` never ships to the client
 * - Server: direct `API_BASE_URL` with `X-Client-Secret` attached in getAuthHeaders()
 */
export const API_BASE_URL = process.env.API_BASE_URL ?? "";
export const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** Same-origin proxy prefix used by browser fetches */
export const BACKEND_PROXY_BASE = "/api/backend";

// Import product caching functions
import { getCachedProducts, setCachedProducts, hasCachedProducts } from './product-cache';
import { apiLog, devLog } from './debug-log';

export { apiLog, apiError, devLog, resetApiLogDedupe, isDebugEnabled } from './debug-log';

// Helper function to get the appropriate base URL for server vs client
export function getBaseUrl() {
  // Browser always goes through the Next.js proxy (adds X-Client-Secret server-side).
  if (typeof window !== 'undefined') {
    return BACKEND_PROXY_BASE;
  }

  // Server-side can call the real API directly.
  return API_BASE_URL || NEXT_PUBLIC_API_BASE_URL;
}

function getServerClientSecretHeaders(): Record<string, string> {
  const secret = process.env.BACKEND_CLIENT_SECRET;
  return secret ? { "X-Client-Secret": secret } : {};
}

// Helper function to get authentication headers
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (typeof window === 'undefined') {
    // Server-side: attach backend client secret (Firebase token is not available in SSR).
    return {
      ...headers,
      ...getServerClientSecretHeaders(),
    };
  }
  
  // Client-side: try to get Firebase user token (proxy adds X-Client-Secret).
  try {
    // Import Firebase auth dynamically to avoid SSR issues
    const { getAuth } = await import('firebase/auth');
    const { app } = await import('@/lib/firebase');
    
    const currentUser = getAuth(app).currentUser;
    
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
    }
  } catch (error) {
    console.error('Error getting auth headers:', error);
  }
  
  return headers;
}

/**
 * Check if user is registered with the backend using an idToken.
 * Returns the user profile if registered (200), or null if not registered (404/401).
 * Used after Firebase phone auth to decide whether to show the name/register step.
 */
export async function getCurrentUserWithToken(
  idToken: string,
  includeAddresses: boolean = false,
  options?: { signal?: AbortSignal }
): Promise<{ registered: true; profile: unknown } | { registered: false }> {
  const response = await fetch(
    `${getBaseUrl()}/users/me?include_addresses=${includeAddresses}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
        ...(typeof window === 'undefined' ? getServerClientSecretHeaders() : {}),
      },
      signal: options?.signal,
    }
  );
  if (response.ok) {
    const profile = await response.json();
    return { registered: true, profile };
  }
  // 404 = user not registered; 401 = invalid/expired or not registered
  if (response.status === 404 || response.status === 401) {
    return { registered: false };
  }
  throw new Error(`Failed to get user profile: ${response.status} ${response.statusText}`);
}

// User profile functions
export async function getUserProfile(includeAddresses: boolean = true) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me?include_addresses=${includeAddresses}`, {
    method: 'GET',
    headers: authHeaders,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to get user profile: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function updateUserProfile(profileData: {
  name?: string;
  is_delivery?: boolean;
}) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to update user profile: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Address management functions
export async function getUserAddresses() {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/addresses`, {
    method: 'GET',
    headers: authHeaders,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to get addresses: ${response.status} ${response.statusText}`);
  }

  const responseData = await response.json();
  // Handle new backend response format: {statusCode, message, data: [...]}
  // Also support old format: direct array
  if (responseData && typeof responseData === 'object' && 'data' in responseData && Array.isArray(responseData.data)) {
    return responseData.data;
  }
  // If it's already an array, return it directly (backward compatibility)
  if (Array.isArray(responseData)) {
    return responseData;
  }
  // Fallback: return empty array if unexpected format
  return [];
}

export async function createUserAddress(addressData: {
  address: string;
  latitude: number;
  longitude: number;
  is_default?: boolean;
  name?: string; // Kept for UI/localStorage; not sent to API per spec
}) {
  const authHeaders = await getAuthHeaders();
  // API spec: only address, latitude, longitude, is_default
  const body = {
    address: addressData.address,
    latitude: addressData.latitude,
    longitude: addressData.longitude,
    is_default: addressData.is_default ?? false,
  };
  const response = await fetch(`${getBaseUrl()}/users/me/addresses`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 500) {
      // Try to register user first, then retry address creation
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          const idToken = await user.getIdToken();
          await registerUser(idToken, user.displayName || 'User');
          
          // Retry address creation
          const retryResponse = await fetch(`${getBaseUrl()}/users/me/addresses`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(body),
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            if (retryData && typeof retryData === 'object' && 'data' in retryData) return retryData.data;
            return retryData;
          }
        }
      } catch (regError) {
      }
      
      throw new Error('Backend service temporarily unavailable. Please try again later.');
    }
    throw new Error(`Failed to create address: ${response.status} ${response.statusText}`);
  }

  const responseData = await response.json();
  // Handle new backend response format: {statusCode, message, data: {...}}
  // Also support old format: direct object
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return responseData.data;
  }
  return responseData;
}

// Alias for createUserAddress to match the import in LocationSelector
export const addUserAddress = createUserAddress;

// Alias for getUserProfile to match the import in profile page
export const getCurrentUser = getUserProfile;

// User Registration
export async function registerUser(idToken: string, name: string) {
  const response = await fetch(`${getBaseUrl()}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(typeof window === 'undefined' ? getServerClientSecretHeaders() : {}),
    },
    body: JSON.stringify({ idToken, name }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    if (response.status === 422) {
      throw new Error('Invalid registration data');
    }
    throw new Error(`Failed to register user: ${response.status} ${response.statusText}`);
  }

  // Backend may return JSON or plain text (Swagger shows `"string"`). Handle both.
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return raw;
  }
}

export async function getUserAddress(addressId: number) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/addresses/${addressId}`, {
    method: 'GET',
    headers: authHeaders,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to get address: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function updateUserAddress(addressId: number, addressData: {
  address?: string;
  latitude?: number;
  longitude?: number;
  name?: string;
}) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/addresses/${addressId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(addressData),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to update address: ${response.status} ${response.statusText}`);
  }

  const responseData = await response.json();
  // Handle new backend response format: {statusCode, message, data: {...}}
  // Also support old format: direct object
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return responseData.data;
  }
  return responseData;
}

export async function deleteUserAddress(addressId: number) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/addresses/${addressId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to delete address: ${response.status} ${response.statusText}`);
  }

  return response.ok;
}

export async function setDefaultAddress(addressId: number) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/addresses/${addressId}/set_default`, {
    method: 'PUT',
    headers: authHeaders,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to set default address: ${response.status} ${response.statusText}`);
  }

  const responseData = await response.json();
  // Handle new backend response format: {statusCode, message, data: {...}}
  // Also support old format: direct object
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return responseData.data;
  }
  return responseData;
}

// ==================== FAVORITES API ====================

export async function addToFavorites(productId: number): Promise<string> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/favorites`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ product_id: productId }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 422) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.detail ? JSON.stringify(err.detail) : 'Validation error');
    }
    throw new Error(`Failed to add to favorites: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return typeof data === 'string' ? data : (data?.data ?? '');
}

export async function getFavorites(options?: {
  include_products?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  store_ids?: number[] | null;
}): Promise<unknown[]> {
  const authHeaders = await getAuthHeaders();
  const params = new URLSearchParams();
  if (options?.include_products !== undefined) {
    params.set('include_products', String(options.include_products));
  }
  if (options?.latitude != null) params.set('latitude', String(options.latitude));
  if (options?.longitude != null) params.set('longitude', String(options.longitude));
  if (options?.store_ids?.length) {
    options.store_ids.forEach((id) => params.append('store_ids', String(id)));
  }
  const qs = params.toString();
  const url = `${getBaseUrl()}/users/me/favorites${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to fetch favorites: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data?.data ?? []);
}

export async function removeFromFavorites(productId: number): Promise<string> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/favorites/${productId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 422) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.detail ? JSON.stringify(err.detail) : 'Validation error');
    }
    throw new Error(`Failed to remove from favorites: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return typeof data === 'string' ? data : (data?.data ?? '');
}

// Alternative: Dynamic port detection for server-side (if needed)
function getServerBaseUrl() {
  return getBaseUrl();
}

export async function getCategories(includeSubcategories: boolean = true, parentOnly: boolean = false) {
  const params = new URLSearchParams();
  if (includeSubcategories !== undefined) {
    params.append('include_subcategories', includeSubcategories.toString());
  }
  if (parentOnly !== undefined) {
    params.append('parent_only', parentOnly.toString());
  }
  
  const authHeaders = await getAuthHeaders();
  // Backend canonicalizes collection endpoints with a trailing slash (e.g. `/categories/`).
  // Hitting the non-slash variant may trigger a redirect, which browsers disallow for CORS preflight.
  const response = await fetch(`${getBaseUrl()}/categories/?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store', // Disable Next.js caching
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...authHeaders
    }
  });
  
  
  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }
  const data = await response.json();
  const categories = data.data || [];
  apiLog('GET /categories/', `${response.status} · ${categories.length} categories`, {
    url: `${getBaseUrl()}/categories/`,
    categories,
  });
  return categories;
}

export async function getProducts(
  categoryIds: number[] | null = null,
  page: number = 1,
  pageSize: number = 100,
  onlyDiscounted: boolean = false,
  includeCategories: boolean = true,
  includePricing: boolean = true,
  includeInventory: boolean = true,
  storeIds?: number[],
  latitude?: number,
  longitude?: number
) {
  // Create cache parameters object
  const cacheParams = {
    categoryIds,
    page,
    pageSize,
    onlyDiscounted,
    includeCategories,
    includePricing,
    includeInventory,
    storeIds,
    latitude,
    longitude
  };

  // Check cache first (only on client side)
  if (typeof window !== 'undefined') {
    const cachedProducts = getCachedProducts(cacheParams);
    if (cachedProducts) {
      devLog('GET /products/ (cache)', {
        categoryIds,
        count: cachedProducts.length,
      });
      return cachedProducts;
    }
  }

  const params = new URLSearchParams();
  params.append('limit', pageSize.toString());
  params.append('include_pricing', includePricing.toString());
  params.append('include_categories', includeCategories.toString());
  params.append('include_inventory', includeInventory.toString());
  
  // Store IDs (if provided)
  if (storeIds && storeIds.length > 0) {
    storeIds.forEach(id => params.append('store_id', id.toString()));
  }
  
  // Location params (if provided AND no store_ids) - for pickup mode, we don't use location
  if (latitude !== undefined && longitude !== undefined && (!storeIds || storeIds.length === 0)) {
    params.append('latitude', latitude.toString());
    params.append('longitude', longitude.toString());
  }
  
  if (categoryIds && categoryIds.length > 0) {
    categoryIds.forEach(id => params.append('category_ids', id.toString()));
  }
  if (onlyDiscounted) {
    params.append('only_discounted', 'true');
  }
  
  // Backend canonicalizes collection endpoints with a trailing slash (e.g. `/products/`).
  // Avoid redirects because redirects break CORS preflight in browsers.
  const url = `${getBaseUrl()}/products/?${params.toString()}`;
  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store', // Disable Next.js caching
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...authHeaders
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error:", errorText);
    throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  
  
  let products = data.data?.products || [];
  
  // Cache the results (only on client side)
  if (typeof window !== 'undefined') {
    setCachedProducts(cacheParams, products);
  }
  
  apiLog('GET /products/', `${response.status} · ${products.length} products`, {
    url: url.split('?')[0],
    params: Object.fromEntries(params),
    products,
  });
  return products;
}

// Get subcategories of a specific parent category
export async function getSubcategories(parentCategoryId: number) {
  const params = new URLSearchParams();
  params.append('parent_id', parentCategoryId.toString());
  params.append('subcategories_only', 'true');
  
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/categories/?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...authHeaders
    }
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch subcategories");
  }
  const data = await response.json();
  return data.data || [];
}

// Get products by subcategory
export async function getProductsBySubcategory(
  subcategoryId: number, 
  pageSize: number = 100,
  storeIds?: number[],
  latitude?: number,
  longitude?: number
) {
  const params = new URLSearchParams();
  params.append('limit', pageSize.toString());
  params.append('include_pricing', 'true');
  params.append('include_categories', 'true');
  params.append('include_inventory', 'true');
  params.append('category_ids', subcategoryId.toString());
  
  // Store IDs (if provided)
  if (storeIds && storeIds.length > 0) {
    storeIds.forEach(id => params.append('store_id', id.toString()));
  }
  
  // Location params (if provided AND no store_ids) - for pickup mode, we don't use location
  if (latitude !== undefined && longitude !== undefined && (!storeIds || storeIds.length === 0)) {
    params.append('latitude', latitude.toString());
    params.append('longitude', longitude.toString());
  }
  
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/products/?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...authHeaders
    }
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch products by subcategory");
  }
  const data = await response.json();
  return data.data?.products || [];
}

// Pricing-aware version of getProductsBySubcategory (using backend's built-in pricing)
export async function getProductsBySubcategoryWithPricing(
  subcategoryId: number, 
  pageSize: number = 100,
  storeIds?: number[],
  latitude?: number,
  longitude?: number
) {
  // Use the main getProducts function with category filtering and pricing
  const products = await getProducts(
    [subcategoryId], // Filter by subcategory
    1, 
    pageSize, 
    false, // Show all products (not just discounted)
    true, // includeCategories
    true, // include_pricing=true - backend returns pricing data
    true, // includeInventory
    storeIds,
    latitude,
    longitude
  );
  
  // Only calculate pricing for fetched products (not all products)
  const productsWithPricing = products.map((product: any) => ({
    ...product,
    pricing: product.pricing || {
      base_price: product.base_price || product.price || 0,
      final_price: product.base_price || product.price || 0,
      discount_applied: 0,
      discount_percentage: 0,
      applied_price_lists: []
    }
  }));
  
  return productsWithPricing;
}

// Get all parent categories only
export async function getParentCategories() {
  return getCategories(true, true);
}

// Get parent category info from subcategory ID
export async function getParentCategoryFromSubcategory(subcategoryId: number) {
  const { flattenCategories } = await import("./category-slug");

  const allCategories = await getCategories(true, false);
  const flat = flattenCategories(allCategories);
  const subcategory = flat.find((cat) => cat.id === subcategoryId);

  if (!subcategory?.parent_category_id) {
    throw new Error("Subcategory not found or has no parent");
  }

  const parentCategory = flat.find(
    (cat) => cat.id === subcategory.parent_category_id
  );

  if (!parentCategory) {
    throw new Error("Parent category not found");
  }

  return parentCategory;
}

export async function revalidateAllProducts() {
  const response = await fetch(`${getBaseUrl()}/revalidate-products`, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      ...(typeof window === 'undefined' ? getServerClientSecretHeaders() : {}),
    }
  });
  if (!response.ok) {
    throw new Error('Failed to revalidate products');
  }
  const data = await response.json();
  return data.data;
}

export async function getProductById(
  productId: string,
  storeIds?: number[],
  latitude?: number,
  longitude?: number,
  quiet = false
) {
  const params = new URLSearchParams();
  params.append('include_pricing', 'true');
  params.append('include_categories', 'true');
  params.append('include_inventory', 'true');
  // Ensure we get full pricing data including discounts
  // The backend should return pricing data when include_pricing=true
  
  // Store IDs (if provided)
  if (storeIds && storeIds.length > 0) {
    storeIds.forEach(id => params.append('store_id', id.toString()));
  }
  
  // Location params (if provided AND no store_ids) - for pickup mode, we don't use location
  if (latitude !== undefined && longitude !== undefined && (!storeIds || storeIds.length === 0)) {
    params.append('latitude', latitude.toString());
    params.append('longitude', longitude.toString());
  }
  
  const url = `${getBaseUrl()}/products/${productId}?${params.toString()}`;

  const authHeaders = await getAuthHeaders();

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store', // Disable Next.js caching
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Content-Type': 'application/json',
      // Only add auth headers if they exist (client-side)
      ...(authHeaders.Authorization && { Authorization: authHeaders.Authorization })
    }
  });

  if (!response.ok) {
    if (!quiet) {
      const errorText = await response.text();
      console.error('❌ getProductById - Error response:', errorText);
    }
    throw new Error(`Failed to fetch product: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const product = data.data;

  if (!quiet) {
    apiLog(
      `GET /products/${productId}`,
      `${response.status} · 1 product`,
      {
        url: url.split('?')[0],
        product,
        pricing: product?.pricing,
        image_urls: product?.image_urls,
        inventory: product?.inventory,
      },
      { dedupeKey: `product-detail|${productId}` }
    );
  }

  return product;
}

export async function getStores(latitude?: number, longitude?: number, radius?: number) {
  const params = new URLSearchParams();
  
  // Add location filtering if provided
  if (latitude !== undefined && longitude !== undefined) {
    params.append('latitude', latitude.toString());
    params.append('longitude', longitude.toString());
  }
  
  if (radius !== undefined) {
    params.append('radius', radius.toString());
  }
  
  const authHeaders = await getAuthHeaders();
  const url = `${getBaseUrl()}/stores/?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store', // Disable Next.js caching
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...authHeaders
    }
  });
  
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Stores API Error:", errorText);
    throw new Error(`Failed to fetch stores: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data?.stores || [];
}

export async function getStoreById(storeId: string) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/stores/${storeId}`, {
    method: 'GET',
    cache: 'no-store', // Disable Next.js caching
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...authHeaders
    }
  });
  if (!response.ok) {
    throw new Error("Failed to fetch store");
  }
  const data = await response.json();
  return data.data;
}

// Get nearby stores with optimized search
export async function getNearbyStores(latitude: number, longitude: number, radius?: number) {
  const params = new URLSearchParams();
  params.append('latitude', latitude.toString());
  params.append('longitude', longitude.toString());
  
  if (radius !== undefined) {
    params.append('radius', radius.toString());
  }
  
  const authHeaders = await getAuthHeaders();
  const url = `${getBaseUrl()}/stores/nearby?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...authHeaders
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Nearby Stores API Error:", errorText);
    throw new Error(`Failed to fetch nearby stores: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data?.stores || [];
}

// Calculate distance to a specific store
export async function getStoreDistance(storeId: string, latitude: number, longitude: number) {
  const params = new URLSearchParams();
  params.append('latitude', latitude.toString());
  params.append('longitude', longitude.toString());
  
  const authHeaders = await getAuthHeaders();
  const url = `${getBaseUrl()}/stores/${storeId}/distance?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...authHeaders
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Store Distance API Error:", errorText);
    throw new Error(`Failed to calculate store distance: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data;
}

// Fetch all products using pagination
export async function getAllProducts(
  categoryIds: number[] | null = null,
  onlyDiscounted: boolean = false,
  includeCategories: boolean = true,
  includePricing: boolean = true,
  includeInventory: boolean = true,
  storeIds?: number[],
  latitude?: number,
  longitude?: number
) {
  // Create cache parameters object for the first page
  const cacheParams = {
    categoryIds,
    page: 1,
    pageSize: 1000, // Large page size for "all products"
    onlyDiscounted,
    includeCategories,
    includePricing,
    includeInventory,
    storeIds,
    latitude,
    longitude
  };

  // Check cache first (only on client side)
  if (typeof window !== 'undefined') {
    const cachedProducts = getCachedProducts(cacheParams);
    if (cachedProducts) {
      return cachedProducts;
    }
  }

  let allProducts: any[] = [];
  let cursor: string | null = null;
  let hasMore = true;
  const pageSize = 100; // API max limit

  while (hasMore) {
    const params = new URLSearchParams();
    params.append('limit', pageSize.toString());
    params.append('include_pricing', includePricing.toString());
    params.append('include_categories', includeCategories.toString());
    params.append('include_inventory', includeInventory.toString());
    
    // Store IDs (if provided)
    if (storeIds && storeIds.length > 0) {
      storeIds.forEach(id => params.append('store_id', id.toString()));
    }
    
    // Location params (if provided AND no store_ids) - for pickup mode, we don't use location
    if (latitude !== undefined && longitude !== undefined && (!storeIds || storeIds.length === 0)) {
      params.append('latitude', latitude.toString());
      params.append('longitude', longitude.toString());
    }
    
    if (categoryIds && categoryIds.length > 0) {
      categoryIds.forEach(id => params.append('category_ids', id.toString()));
    }
    if (onlyDiscounted) {
      params.append('only_discounted', 'true');
    }
    if (cursor) {
      params.append('cursor', cursor);
    }
    
    const url = `${getBaseUrl()}/products/?${params.toString()}`;
    
    const authHeaders = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...authHeaders
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", errorText);
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const products = data.data?.products || [];
    const pagination = data.data?.pagination;
    
    allProducts = [...allProducts, ...products];
    
    // Check if there are more products
    hasMore = pagination?.has_more || false;
    cursor = pagination?.next_cursor || null;
    
  }
  
  
  // Cache the results (only on client side)
  if (typeof window !== 'undefined') {
    setCachedProducts(cacheParams, allProducts);
  }
  
  // Note: The backend API should return pricing data with include_pricing=true
  // If pricing is null, the backend needs to be configured to return pricing data
  
  return allProducts;
}

// New function to get products with pricing data (using backend's built-in pricing)
export async function getProductsWithPricing(
  categoryIds: number[] | null = null,
  page: number = 1,
  pageSize: number = 100,
  onlyDiscounted: boolean = false,
  includeCategories: boolean = true,
  includeInventory: boolean = true,
  storeIds?: number[],
  latitude?: number,
  longitude?: number
) {
  
  // Use the main getProducts function with include_pricing=true
  // The backend API should return pricing data when include_pricing=true
  const products = await getProducts(
    categoryIds, 
    page, 
    pageSize, 
    onlyDiscounted, // Use backend's only_discounted filtering
    includeCategories, 
    true, // include_pricing=true - backend should return pricing data
    includeInventory,
    storeIds,
    latitude,
    longitude
  );

  
  // Only calculate pricing for fetched products (not all products)
  const productsWithPricing = products.map((product: any) => ({
    ...product,
    pricing: product.pricing || {
      base_price: product.base_price || product.price || 0,
      final_price: product.base_price || product.price || 0,
      discount_applied: 0,
      discount_percentage: 0,
      applied_price_lists: []
    }
  }));
  
  return productsWithPricing;
}

// Get popular products from /products/popular endpoint
export async function getPopularProducts(
  mode: 'trending' | 'most_viewed' | 'most_carted' | 'most_ordered' | 'most_searched' | 'overall' = 'trending',
  limit: number = 20,
  timeWindowDays?: number,
  categoryIds?: number[],
  minInteractions: number = 5,
  includePricing: boolean = true,
  includeCategories: boolean = false,
  includeTags: boolean = false,
  includeInventory: boolean = true,
  includePopularityMetrics: boolean = true,
  storeIds?: number[],
  latitude?: number,
  longitude?: number
) {
  
  const params = new URLSearchParams();
  params.append('mode', mode);
  params.append('limit', limit.toString());
  
  if (timeWindowDays !== undefined) {
    params.append('time_window_days', timeWindowDays.toString());
  }
  
  if (categoryIds && categoryIds.length > 0) {
    params.append('category_ids', categoryIds.join(','));
  }
  
  params.append('min_interactions', minInteractions.toString());
  params.append('include_pricing', includePricing.toString());
  params.append('include_categories', includeCategories.toString());
  params.append('include_tags', includeTags.toString());
  params.append('include_inventory', includeInventory.toString());
  params.append('include_popularity_metrics', includePopularityMetrics.toString());
  
  if (storeIds && storeIds.length > 0) {
    params.append('store_ids', storeIds.join(','));
  }
  
  if (latitude !== undefined && longitude !== undefined) {
    params.append('latitude', latitude.toString());
    params.append('longitude', longitude.toString());
  }
  
  const url = `${getBaseUrl()}/products/popular?${params.toString()}`;
  
  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...authHeaders
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error:", errorText);
    throw new Error(`Failed to fetch popular products: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();

  let products: any[] = [];
  if (data.products && Array.isArray(data.products)) {
    products = data.products;
  } else if (data.data?.products && Array.isArray(data.data.products)) {
    products = data.data.products;
  } else if (Array.isArray(data)) {
    products = data;
  }

  const productsWithPricing = products.map((product: any) => ({
    ...product,
    pricing: product.pricing || {
      base_price: product.base_price || product.price || 0,
      final_price: product.base_price || product.price || 0,
      discount_applied: 0,
      discount_percentage: 0,
      applied_price_lists: []
    }
  }));

  apiLog('GET /products/popular', `${response.status} · ${productsWithPricing.length} products · ${mode}`, {
    url: url.split('?')[0],
    mode,
    params: Object.fromEntries(params),
    products: productsWithPricing,
  });

  return productsWithPricing;
}

// Get recent products from /products/recents endpoint
export async function getRecentProducts(
  limit: number = 20,
  includePricing: boolean = true,
  includeCategories: boolean = false,
  includeTags: boolean = false,
  includeInventory: boolean = true,
  latitude?: number,
  longitude?: number
) {
  
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('include_pricing', includePricing.toString());
  params.append('include_categories', includeCategories.toString());
  params.append('include_tags', includeTags.toString());
  params.append('include_inventory', includeInventory.toString());
  
  if (latitude !== undefined && longitude !== undefined) {
    params.append('latitude', latitude.toString());
    params.append('longitude', longitude.toString());
  }
  
  const url = `${getBaseUrl()}/products/recents?${params.toString()}`;
  
  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...authHeaders
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error:", errorText);
    throw new Error(`Failed to fetch recent products: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();

  let products: any[] = [];
  if (Array.isArray(data)) {
    products = data;
  } else if (data.data && Array.isArray(data.data)) {
    products = data.data;
  } else if (data.products && Array.isArray(data.products)) {
    products = data.products;
  } else if (data.data?.products && Array.isArray(data.data.products)) {
    products = data.data.products;
  }

  const productsWithPricing = products.map((product: any) => ({
    ...product,
    pricing: product.pricing || {
      base_price: product.base_price || product.price || 0,
      final_price: product.base_price || product.price || 0,
      discount_applied: 0,
      discount_percentage: 0,
      applied_price_lists: []
    }
  }));

  apiLog(
    'GET /products/recents',
    `${response.status} · ${productsWithPricing.length} products`,
    {
      url: url.split('?')[0],
      params: Object.fromEntries(params),
      products: productsWithPricing,
      productSummary: productsWithPricing.map((p) => ({
        id: p.id,
        name: p.name,
        ref: p.ref,
      })),
    },
    { dedupeKey: `products-recents|${productsWithPricing.length}` }
  );

  return productsWithPricing;
}

export async function getSimilarProducts(
  productId: number | string,
  limit: number = 10,
  minSimilarity: number = 0.5,
  includePricing: boolean = true,
  includeCategories: boolean = true,
  includeTags: boolean = true,
  includeInventory: boolean = true,
  storeIds?: number[],
  latitude?: number,
  longitude?: number,
  quantity: number = 1
) {
  
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('min_similarity', minSimilarity.toString());
  params.append('include_pricing', includePricing.toString());
  params.append('include_categories', includeCategories.toString());
  params.append('include_tags', includeTags.toString());
  params.append('include_inventory', includeInventory.toString());
  params.append('quantity', quantity.toString());
  
  // Store IDs (if provided)
  if (storeIds && storeIds.length > 0) {
    storeIds.forEach(id => params.append('store_id', id.toString()));
  }
  
  // Location params (if provided)
  if (latitude !== undefined && longitude !== undefined) {
    params.append('latitude', latitude.toString());
    params.append('longitude', longitude.toString());
  }
  
  const url = `${getBaseUrl()}/products/${productId}/similar?${params.toString()}`;
  
  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...authHeaders
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error:", errorText);
    throw new Error(`Failed to fetch similar products: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();

  let products: any[] = [];
  if (Array.isArray(data)) {
    products = data;
  } else if (data.data && Array.isArray(data.data)) {
    products = data.data;
  } else if (data.products && Array.isArray(data.products)) {
    products = data.products;
  } else if (data.data?.products && Array.isArray(data.data.products)) {
    products = data.data.products;
  }

  const productsWithPricing = products.map((product: any) => ({
    ...product,
    pricing: product.pricing || {
      base_price: product.base_price || product.price || 0,
      final_price: product.base_price || product.price || 0,
      discount_applied: 0,
      discount_percentage: 0,
      applied_price_lists: []
    }
  }));

  apiLog(
    `GET /products/${productId}/similar`,
    `${response.status} · ${productsWithPricing.length} products`,
    {
      url: url.split('?')[0],
      productId,
      products: productsWithPricing,
      productSummary: productsWithPricing.map((p) => ({
        id: p.id,
        name: p.name,
        ref: p.ref,
        final_price: p.final_price ?? p.pricing?.final_price,
      })),
    },
    { dedupeKey: `product-similar|${productId}|${productsWithPricing.length}` }
  );

  return productsWithPricing;
}

// Optimized function specifically for deals - use backend's only_discounted filtering
export async function getDiscountedProductsOptimized(
  pageSize: number = 50, // Smaller page size for deals
  storeIds?: number[],
  cursor?: string | null
) {
  
  // Use backend's only_discounted=true parameter for fast filtering
  const products = await getProducts(
    null, // All categories
    1, 
    pageSize, 
    true, // only_discounted=true - backend filters for us
    true, // includeCategories
    true, // include_pricing=true - backend returns pricing data
    true, // includeInventory
    storeIds
  );

  
  // Only calculate pricing for fetched products (not all products)
  const productsWithPricing = products.map((product: any) => ({
    ...product,
    pricing: product.pricing || {
      base_price: product.base_price || product.price || 0,
      final_price: product.base_price || product.price || 0,
      discount_applied: 0,
      discount_percentage: 0,
      applied_price_lists: []
    }
  }));
  
  return productsWithPricing;
}

// Enhanced pagination function with cursor support
export async function getProductsWithCursorPagination(
  categoryIds: number[] | null = null,
  pageSize: number = 20,
  cursor?: string | null,
  onlyDiscounted: boolean = false,
  storeIds?: number[]
) {
  const params = new URLSearchParams();
  params.append('limit', pageSize.toString());
  params.append('include_pricing', 'true');
  params.append('include_categories', 'true');
  params.append('include_inventory', 'true');
  
  if (cursor) {
    params.append('cursor', cursor);
  }
  
  if (storeIds && storeIds.length > 0) {
    storeIds.forEach(id => params.append('store_id', id.toString()));
  }
  
  if (categoryIds && categoryIds.length > 0) {
    categoryIds.forEach(id => params.append('category_ids', id.toString()));
  }
  
  if (onlyDiscounted) {
    params.append('only_discounted', 'true');
  }
  
  const url = `${getBaseUrl()}/products/?${params.toString()}`;
  
  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...authHeaders
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error:", errorText);
    throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const products = data.data?.products || [];
  const pagination = data.data?.pagination;
  
  // Only calculate pricing for fetched products
  const productsWithPricing = products.map((product: any) => ({
    ...product,
    pricing: product.pricing || {
      base_price: product.base_price || product.price || 0,
      final_price: product.base_price || product.price || 0,
      discount_applied: 0,
      discount_percentage: 0,
      applied_price_lists: []
    }
  }));
  
  return {
    products: productsWithPricing,
    pagination: {
      hasMore: pagination?.has_more || false,
      nextCursor: pagination?.next_cursor || null,
      totalCount: pagination?.total_count || products.length
    }
  };
}

// Get products by parent category with pagination
export async function getProductsByParentCategoryWithPagination(
  parentCategoryId: number,
  pageSize: number = 18,
  cursor?: string | null,
  storeIds?: number[]
) {
  // First get all subcategories of the parent category
  const subcategories = await getSubcategories(parentCategoryId);
  const subcategoryIds = subcategories.map((sub: any) => sub.id);
  
  if (subcategoryIds.length === 0) {
    return {
      products: [],
      pagination: {
        hasMore: false,
        nextCursor: null,
        totalCount: 0
      }
    };
  }
  
  // Use the existing cursor pagination function with subcategory IDs
  return getProductsWithCursorPagination(
    subcategoryIds,
    pageSize,
    cursor,
    false, // not only discounted
    storeIds
  );
}

// Function to enrich products with individual pricing calculations (DISABLED - causes too many requests)
// This function is now disabled to prevent excessive API calls
// Instead, we use basic pricing structure from product data
async function enrichProductsWithIndividualPricing(products: any[], tierId: number = 1) {
  
  // Return products with basic pricing structure instead of making individual calls
  return products.map((product: any) => ({
    ...product,
    pricing: {
      base_price: product.base_price || product.price || 0,
      final_price: product.base_price || product.price || 0,
      discount_applied: 0,
      discount_percentage: 0,
      applied_price_lists: []
    }
  }));
}

// Individual product pricing function (DISABLED - causes too many requests)
// This function is now disabled to prevent excessive API calls
// Use only for specific use cases where individual pricing is absolutely necessary
async function getProductPricing(productId: number, tierId: number = 1, quantity: number = 1) {
  
  // Return null to indicate pricing is not available
  // This prevents the excessive API calls
  return null;
}

// ==================== USER REGISTRATION API FUNCTIONS ====================
// Note: registerUser function is defined earlier in the file (line 172)



// ==================== CART MANAGEMENT API FUNCTIONS ====================

// Get all user carts (owned + shared)
export async function getUserCarts() {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/carts`, {
    method: 'GET',
    headers: authHeaders
  });
  
  if (!response.ok) {
    // Handle authentication errors (401)
    if (response.status === 401) {
      throw new Error('Authentication required - Please sign in to view your carts');
    }
    
    // Handle other errors
    const errorText = await response.text();
    throw new Error(`Failed to fetch carts: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const data = await response.json();
  
  // Return the structured response with owned_carts and shared_carts
  return {
    owned_carts: data.owned_carts || [],
    shared_carts: data.shared_carts || []
  };
}

// Create a new cart
export async function createCart(cartData: {
  name: string;
  description?: string;
}) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/carts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(cartData)
  });
  
  if (!response.ok) {
    // Handle validation errors (422)
    if (response.status === 422) {
      const errorData = await response.json();
      throw new Error(`Validation error: ${JSON.stringify(errorData.detail)}`);
    }
    
    // Handle authentication errors (401)
    if (response.status === 401) {
      throw new Error('Authentication required - Please sign in to create a cart');
    }
    
    // Handle other errors
    const errorText = await response.text();
    throw new Error(`Failed to create cart: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const data = await response.json();
  return data.data || data; // Return the cart data
}

// Get cart details
export async function getCartDetails(cartId: number) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/carts/${cartId}`, {
    method: 'GET',
    headers: authHeaders
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Cart not found: ${response.status} ${response.statusText}`);
    }
    if (response.status === 403) {
      throw new Error(`Cart access denied: ${response.status} ${response.statusText}`);
    }
    throw new Error(`Failed to fetch cart details: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

// Check if cart is available for modification (not ordered)
export async function isCartAvailableForModification(cartId: number): Promise<boolean> {
  try {
    const cartDetails = await getCartDetails(cartId);
    // Check if cart has any order-related status that would prevent modification
    const cartData = cartDetails?.data || cartDetails;
    
    // If cart has been ordered, it typically won't be accessible or will have a specific status
    // This is a simple check - the backend will return 409 if cart is ordered
    return true;
  } catch (error: any) {
    if (error.message?.includes('404') || error.message?.includes('403')) {
      return false;
    }
    // For other errors, assume cart is not available
    return false;
  }
}

// Update cart details (owner only)
export async function updateCart(cartId: number, cartData: {
  name?: string;
  description?: string;
}) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/carts/${cartId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(cartData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update cart: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

// Delete cart (owner only)
export async function deleteCart(cartId: number) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/carts/${cartId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete cart: ${response.status} ${response.statusText}`);
  }
  
  return response.status === 204;
}

// Add item to cart (owner only)
export async function addItemToCart(cartId: number, itemData: {
  product_id: number;
  quantity: number;
}) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/carts/${cartId}/items`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(itemData)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = `Failed to add item to cart: ${response.status} ${response.statusText}`;
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).details = errorData;
    throw error;
  }
  
  const data = await response.json();
  return data;
}

// Update cart item quantity by item ID (owner only)
export async function updateCartItemQuantity(cartId: number, itemId: number, quantity: number) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/carts/${cartId}/items/${itemId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ quantity })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update cart item: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

// Update cart item quantity by product ID (finds item ID first)
export async function updateCartItemQuantityByProductId(cartId: number, productId: number, quantity: number) {
  try {
    
    // First get cart details to find the item ID for this product
    const cartDetails = await getCartDetails(cartId);
    const cartData = cartDetails?.data || cartDetails;
    const items = cartData?.items || [];
    
    
    // Find the item with the matching product ID
    const cartItem = items.find((item: any) => item.product_id === productId);
    
    if (!cartItem) {
      return null; // Item not in cart
    }
    
    const itemId = cartItem.id;
    return await updateCartItemQuantity(cartId, itemId, quantity);
  } catch (error) {
    console.error('❌ Error updating cart item quantity:', error);
    throw error;
  }
}

// Remove product from cart by product ID
export async function removeFromCart(cartId: number, productId: number, quantity?: number) {
  try {
    
    const params = new URLSearchParams();
    if (quantity !== undefined) {
      params.append('quantity', quantity.toString());
    }
    
    const authHeaders = await getAuthHeaders();
    const url = `${getBaseUrl()}/users/me/carts/${cartId}/items/${productId}?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: authHeaders
    });
    
    if (!response.ok) {
      // Idempotency: if the item is already gone, treat it as a successful remove
      if (response.status === 404) {
        return true;
      }
      throw new Error(`Failed to remove from cart: ${response.status} ${response.statusText}`);
    }
    
    return response.status === 204;
  } catch (error) {
    console.error('❌ Error removing from cart:', error);
    throw error;
  }
}

// Share cart with another user (owner only)
export async function shareCart(cartId: number, userId: string) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/carts/${cartId}/share`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ user_id: userId })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to share cart: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

// Remove cart sharing (owner only)
export async function removeCartSharing(cartId: number, targetUserId: string) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/carts/${cartId}/share/${targetUserId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  
  if (!response.ok) {
    throw new Error(`Failed to remove cart sharing: ${response.status} ${response.statusText}`);
  }
  
  return response.status === 204;
}

// Get cart sharing details (owner only)
export async function getCartSharingDetails(cartId: number) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/carts/${cartId}/shares`, {
    method: 'GET',
    headers: authHeaders
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch cart sharing details: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

// ==================== CHECKOUT API FUNCTIONS ====================

// Get available carts for checkout
export async function getCheckoutCarts() {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/checkout/carts`, {
    method: 'GET',
    headers: authHeaders
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch checkout carts: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

/** Backend `DeliveryOption` enum values (snake_case). */
export type CheckoutDeliveryOption = 'leave_at_door' | 'meet_outside' | 'at_reception';

const checkoutDeliveryServices = {
  standard: { label: 'Standard', description: 'Regular delivery' },
  premium: { label: 'Premium', description: 'Faster delivery' },
  priority: { label: 'Priority', description: 'Fastest delivery' },
} as const;

const checkoutDeliveryOptions: Record<CheckoutDeliveryOption, { label: string }> = {
  leave_at_door: { label: 'Leave at door' },
  meet_outside: { label: 'Meet outside' },
  at_reception: { label: 'At reception' },
};

function getCheckoutLogDetails(data: any) {
  return data?.data ?? data;
}

function getCheckoutSelectionDetails(orderData: any) {
  const serviceLevel =
    (orderData?.location?.delivery_service_level as keyof typeof checkoutDeliveryServices | undefined) ??
    'standard';
  const deliveryOption =
    orderData?.location?.delivery_option as CheckoutDeliveryOption | undefined;
  const usingSavedCard = orderData?.saved_card === false;

  return {
    deliveryService: {
      selected: serviceLevel,
      selectedLabel: checkoutDeliveryServices[serviceLevel]?.label ?? serviceLevel,
      selectedDescription: checkoutDeliveryServices[serviceLevel]?.description,
      options: checkoutDeliveryServices,
    },
    howShouldWeDeliver: {
      selected: deliveryOption ?? null,
      selectedLabel: deliveryOption ? checkoutDeliveryOptions[deliveryOption]?.label : null,
      options: checkoutDeliveryOptions,
    },
    scheduleOrder: {
      isScheduled: Boolean(orderData?.is_scheduled),
      scheduled_at: orderData?.scheduled_at ?? null,
    },
    paymentMethod: {
      selected: orderData?.saved_card === undefined ? null : usingSavedCard ? 'saved_card' : 'new_card',
      selectedCardId: orderData?.source_token_id ?? null,
      saveCard: orderData?.save_card ?? null,
    },
  };
}

function getCheckoutLogKey(orderData: any) {
  return JSON.stringify({
    cart_ids: orderData?.cart_ids,
    mode: orderData?.location?.mode,
    delivery_service_level: orderData?.location?.delivery_service_level,
    delivery_option: orderData?.location?.delivery_option,
    split_order: orderData?.split_order,
    is_scheduled: orderData?.is_scheduled,
    scheduled_at: orderData?.scheduled_at,
    saved_card: orderData?.saved_card,
    source_token_id: orderData?.source_token_id,
  });
}

function getCheckoutItemCount(details: any): number {
  if (Array.isArray(details?.fulfillable_stores)) {
    return details.fulfillable_stores.reduce(
      (count: number, store: any) => count + (Array.isArray(store?.items) ? store.items.length : 0),
      0
    );
  }

  if (Array.isArray(details?.items)) {
    return details.items.length;
  }

  return 0;
}

// Preview multi-cart order
export async function previewOrder(orderData: {
  cart_ids: number[];
  location: {
    mode: 'delivery' | 'pickup';
    address_id?: number | null;
    store_id?: number | null;
    delivery_service_level?: string;
    /** Handoff preference when `mode` is `delivery`. */
    delivery_option?: CheckoutDeliveryOption;
  };
  split_order?: boolean;
}) {
  // Add default values for new required fields
  const requestData = {
    ...orderData,
    location: {
      ...orderData.location,
      delivery_service_level: orderData.location.delivery_service_level || 'standard'
    },
    split_order: orderData.split_order !== undefined ? orderData.split_order : true
  };


  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/checkout/preview`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(requestData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Preview order error response:', errorText);
    console.error('❌ Preview order error status:', response.status);
    
    // If we get a 422 error about address not found, clear the address and retry
    if (response.status === 422 && errorText.includes('Address') && errorText.includes('not found')) {
      const retryData = {
        ...requestData,
        location: {
          ...requestData.location,
          address_id: null
        }
      };
      
      const retryResponse = await fetch(`${getBaseUrl()}/users/me/checkout/preview`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(retryData)
      });
      
      if (retryResponse.ok) {
        const data = await retryResponse.json();
        const preview = getCheckoutLogDetails(data);
        const storeCount = Array.isArray(preview?.fulfillable_stores) ? preview.fulfillable_stores.length : 0;
        const itemCount = getCheckoutItemCount(preview);
        apiLog(
          'POST /checkout/preview',
          `${retryResponse.status} · ${storeCount} stores · ${itemCount} items`,
          {
            checkoutDetails: {
              selections: getCheckoutSelectionDetails(retryData),
              preview,
            },
          },
          { dedupeKey: `checkout-preview-retry|${getCheckoutLogKey(retryData)}|${storeCount}|${itemCount}` }
        );
        return data;
      }
    }
    
    throw new Error(`Failed to preview order: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const data = await response.json();
  const preview = getCheckoutLogDetails(data);
  const storeCount = Array.isArray(preview?.fulfillable_stores) ? preview.fulfillable_stores.length : 0;
  const itemCount = getCheckoutItemCount(preview);
  apiLog(
    'POST /checkout/preview',
    `${response.status} · ${storeCount} stores · ${itemCount} items`,
    {
      checkoutDetails: {
        selections: getCheckoutSelectionDetails(requestData),
        preview,
      },
    },
    { dedupeKey: `checkout-preview|${getCheckoutLogKey(requestData)}|${storeCount}|${itemCount}` }
  );
  return data;
}

// Create multi-cart order
export async function createOrder(orderData: {
  cart_ids: number[];
  location: {
    mode: 'delivery' | 'pickup';
    address_id?: number | null;
    store_id?: number | null;
    delivery_service_level?: string;
    /** Handoff preference when `mode` is `delivery`. */
    delivery_option?: CheckoutDeliveryOption;
  };
  delivery_charge?: number;
  service_charge?: number;
  tax?: number;
  subtotal?: number;
  total_amount?: number;
  split_order?: boolean;
  platform?: string;
  is_scheduled?: boolean;
  /** UTC ISO string with `Z` suffix (e.g. 2026-04-26T14:00:00Z). */
  scheduled_at?: string;
  /** When true, user pays with a new card (hosted session). When false, use saved card + source_token_id. */
  saved_card?: boolean;
  save_card?: boolean;
  source_token_id?: number;
}) {
  const authHeaders = await getAuthHeaders();
  
  const response = await fetch(`${getBaseUrl()}/users/me/checkout/order`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(orderData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    
    // Try to parse the error response for more details
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.details && errorData.details.detail) {
        throw new Error(`Failed to create order: ${response.status} ${response.statusText} - ${errorData.details.detail}`);
      }
    } catch (parseError) {
      // If parsing fails, use the original error text
    }
    
    throw new Error(`Failed to create order: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const order = getCheckoutLogDetails(data);
  apiLog(
    'POST /checkout/order',
    `${response.status} · order created`,
    {
      orderDetails: {
        selections: getCheckoutSelectionDetails(orderData),
        order,
      },
    },
    { dedupeKey: `checkout-order|${getCheckoutLogKey(orderData)}|${order?.id ?? order?.order_id ?? Date.now()}` }
  );
  return data;
}

// ==================== PAYMENT API FUNCTIONS ====================

// Get saved payment cards for the current user
export async function getSavedCards() {
  const authHeaders = await getAuthHeaders();
  // NOTE: `getBaseUrl()` already points at `${API_BASE_URL}` which includes `/api/v1`.
  // Do NOT prefix `/v1` again, otherwise it becomes `/api/v1/v1/...` (404).
  const response = await fetch(`${getBaseUrl()}/payments/saved-cards`, {
    method: 'GET',
    headers: authHeaders,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to fetch saved cards:', errorText);
    throw new Error(`Failed to fetch saved cards: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export async function deleteSavedCard(cardId: number) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/payments/saved-cards/${cardId}`, {
    method: "DELETE",
    headers: authHeaders,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Failed to delete saved card:", errorText);
    throw new Error(`Failed to delete saved card: ${response.status} ${response.statusText}`);
  }

  // Backend returns a JSON string; keep it flexible.
  return response.json().catch(async () => response.text());
}

export async function setDefaultSavedCard(cardId: number) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/payments/saved-cards/${cardId}/set-default`, {
    method: "PATCH",
    headers: authHeaders,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Failed to set default saved card:", errorText);
    throw new Error(`Failed to set default saved card: ${response.status} ${response.statusText}`);
  }

  return response.json().catch(async () => response.text());
}

/** Start MPGS hosted session to add a saved card (no body). Returns API wrapper with `data.session_id`, `data.reference`, etc. */
export async function createSavedCardMpgsSession() {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/payments/saved-cards/mpgs`, {
    method: "POST",
    headers: authHeaders,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Failed to create saved-card MPGS session:", errorText);
    throw new Error(`Failed to start add card session: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Check payment status
export async function checkPaymentStatus(paymentRef: string) {
  const authHeaders = await getAuthHeaders();
  // Add cache-busting timestamp to prevent caching
  const timestamp = Date.now();
  const response = await fetch(`${getBaseUrl()}/payments/status/${paymentRef}?_t=${timestamp}`, {
    method: 'GET',
    headers: {
      ...authHeaders,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to check payment status:', errorText);
    throw new Error(`Failed to check payment status: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

// ==================== INVENTORY CHECK API FUNCTIONS ====================

// Check inventory availability for products
export async function checkInventoryAvailability(productIds: number[], storeId?: number, latitude?: number, longitude?: number) {
  const params = new URLSearchParams();
  params.append('include_inventory', 'true');
  params.append('include_pricing', 'true');
  
  if (storeId) {
    params.append('store_id', storeId.toString());
  }
  
  // Location params (if provided AND no store_id) - for pickup mode, we don't use location
  if (latitude !== undefined && longitude !== undefined && !storeId) {
    params.append('latitude', latitude.toString());
    params.append('longitude', longitude.toString());
  }
  
  // Add product IDs as filters
  productIds.forEach(id => params.append('product_ids', id.toString()));
  
  const url = `${getBaseUrl()}/products/?${params.toString()}&_t=${Date.now()}`;
  
  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Inventory check error:', errorText);
    throw new Error(`Failed to check inventory: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const allProducts = data.data?.products || data.data || [];
  
  // Filter to only include the products we requested
  const products = allProducts.filter((product: any) => productIds.includes(product.id));
  
  
  // Check availability for each product
  const availability = products.map((product: any) => {
    
    // Handle inventory as array - find the first available store or use the first one
    const inventory = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
    
    
    const isAvailable = inventory?.in_stock || inventory?.can_fulfill || false;
    
    return {
      product_id: product.id,
      name: product.name,
      available: isAvailable,
      quantity_available: inventory?.quantity_available || 0,
      inventory_status: product.inventory
    };
  });
  
  return availability;
}

// ==================== ORDER MANAGEMENT API FUNCTIONS ====================

function extractOrdersFromResponse(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.orders)) return data.orders;
  if (Array.isArray(data?.data?.orders)) return data.data.orders;
  return [];
}

// Verify payment for an order
export async function verifyOrderPayment(orderId: string, paymentData: {
  method: string;
  transaction_id: string;
  amount: number;
  status: string;
}) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/orders/${orderId}/payment/verify`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(paymentData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to verify payment: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  apiLog(
    `POST /orders/${orderId}/payment/verify`,
    `${response.status} · payment verified`,
    { payment: data?.data ?? data },
    { dedupeKey: `order-payment-verify|${orderId}` }
  );
  return data;
}

// Get all orders for the current user
export async function getUserOrders(
  page: number = 1,
  limit: number = 20,
  statuses: string[] = [],
  includeProducts: boolean = true,
  includeStores: boolean = true,
  includeAddresses: boolean = true,
  includeRider: boolean = true,
) {
  const authHeaders = await getAuthHeaders();
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  for (const status of statuses) {
    params.append('status', status);
  }
  
  if (includeProducts) params.append('include_products', 'true');
  if (includeStores) params.append('include_stores', 'true');
  if (includeAddresses) params.append('include_addresses', 'true');
  if (includeRider) params.append('include_rider', 'true');
  
  // Add cache-busting parameter to ensure fresh data
  params.append('_t', Date.now().toString());
  
  const response = await fetch(`${getBaseUrl()}/orders/?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders,
    cache: 'no-store' // Disable caching for real-time updates
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const orders = extractOrdersFromResponse(data);
  apiLog(
    'GET /orders/',
    `${response.status} · ${orders.length} orders`,
    { orders },
    { dedupeKey: `orders|${statuses.join(',') || 'all'}|${orders.length}` }
  );
  return data;
}

// Get specific order by ID
export async function getOrderById(orderId: string) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/orders/${orderId}`, {
    method: 'GET',
    headers: authHeaders
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch order: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  apiLog(
    `GET /orders/${orderId}`,
    `${response.status} · 1 order`,
    { order: data?.data ?? data },
    { dedupeKey: `order-detail|${orderId}` }
  );
  return data;
}

// Note: getOrderById function is defined later in the file (line 1339)

// Cancel an order
export async function cancelOrder(orderId: string, reason?: string) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ reason })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to cancel order: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  apiLog(
    `POST /orders/${orderId}/cancel`,
    `${response.status} · order cancelled`,
    { order: data?.data ?? data },
    { dedupeKey: `order-cancel|${orderId}` }
  );
  return data;
}

// ==================== ORDERS API FUNCTIONS ====================

// Get all orders for the current user
export async function getAllOrders() {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/orders/`, {
    method: 'GET',
    headers: authHeaders,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Get order by ID (admin/general access)
export async function getOrderByIdAdmin(orderId: string) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/orders/${orderId}`, {
    method: 'GET',
    headers: authHeaders,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 404) {
      throw new Error('Order not found');
    }
    throw new Error(`Failed to fetch order: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ==================== REORDER API FUNCTIONS ====================

// Reorder functionality - Create new cart from completed order
export async function createReorderCart(order: any) {
  
  try {
    // 1. Create new cart
    const cartName = `Cart from ${new Date(order.createdAt).toLocaleDateString()}`;
    const cartDescription = `Reorder from Order #${order.orderNumber || order.id}`;
    
    const newCart = await createCart({
      name: cartName,
      description: cartDescription
    });
    
    
    // 2. Fetch fresh product data and add items to cart
    const cartId = newCart.data?.id || newCart.id;
    const addedItems = [];
    
    for (const orderItem of order.items || []) {
      try {
        // Fetch fresh product data
        const freshProduct = await getProductById(orderItem.productId.toString());
        
        if (freshProduct) {
          // Add to cart with original quantity
          const cartItem = await addItemToCart(cartId, {
            product_id: freshProduct.id,
            quantity: orderItem.quantity
          });
          
          addedItems.push({
            product: freshProduct,
            quantity: orderItem.quantity,
            cartItem
          });
          
        } else {
        }
      } catch (error) {
        console.error(`❌ Failed to add product ${orderItem.productId} to reorder cart:`, error);
      }
    }
    
    return {
      cart: newCart,
      cartId,
      addedItems,
      skippedItems: (order.items || []).length - addedItems.length
    };
    
  } catch (error: any) {
    console.error('❌ Failed to create reorder cart:', error);
    throw new Error(`Failed to create reorder cart: ${error.message}`);
  }
}

// Add reorder items to existing cart
export async function addReorderItemsToExistingCart(cartId: number, order: any) {
  
  try {
    const addedItems = [];
    const skippedItems = [];
    
    for (const orderItem of order.items || []) {
      try {
        // Fetch fresh product data
        const freshProduct = await getProductById(orderItem.productId.toString());
        
        if (freshProduct) {
          // Check if item already exists in cart
          const cartDetails = await getCartDetails(cartId);
          const existingItem = cartDetails.data?.items?.find(
            (item: any) => item.product_id === freshProduct.id
          );
          
          if (existingItem) {
            // Update quantity (add to existing)
            const newQuantity = existingItem.quantity + orderItem.quantity;
            await updateCartItemQuantityByProductId(cartId, freshProduct.id, newQuantity);
          } else {
            // Add new item
            await addItemToCart(cartId, {
              product_id: freshProduct.id,
              quantity: orderItem.quantity
            });
          }
          
          addedItems.push({
            product: freshProduct,
            quantity: orderItem.quantity
          });
        } else {
          skippedItems.push({
            productId: orderItem.productId,
            reason: 'Product not found'
          });
        }
      } catch (error: any) {
        console.error(`❌ Failed to add product ${orderItem.productId}:`, error);
        skippedItems.push({
          productId: orderItem.productId,
          reason: error.message
        });
      }
    }
    
    return {
      addedItems,
      skippedItems
    };
    
  } catch (error: any) {
    console.error('❌ Failed to add reorder items to existing cart:', error);
    throw new Error(`Failed to add items to existing cart: ${error.message}`);
  }
}

// Check if user has existing cart
export async function checkUserHasExistingCart() {
  try {
    const carts = await getUserCarts();
    const hasOwnedCarts = carts.owned_carts && carts.owned_carts.length > 0;
    const hasSharedCarts = carts.shared_carts && carts.shared_carts.length > 0;
    
    return {
      hasCarts: hasOwnedCarts || hasSharedCarts,
      ownedCarts: carts.owned_carts || [],
      sharedCarts: carts.shared_carts || []
    };
  } catch (error) {
    console.error('❌ Failed to check existing carts:', error);
    return {
      hasCarts: false,
      ownedCarts: [],
      sharedCarts: []
    };
  }
}

// ==================== SEARCH API FUNCTIONS ====================

// Search products with dropdown or full mode
export async function searchProducts(
  query: string,
  mode: 'dropdown' | 'full' = 'dropdown',
  options: {
    limit?: number;
    page?: number;
    cursor?: string;
    includePricing?: boolean;
    includeCategories?: boolean;
    includeTags?: boolean;
    includeInventory?: boolean;
    categoryIds?: number[];
    minPrice?: number;
    maxPrice?: number;
    storeIds?: number[];
    latitude?: number;
    longitude?: number;
  } = {}
) {
  // Validate query
  if (!query || query.length < 2) {
    throw new Error('Search query must be at least 2 characters long');
  }

  const params = new URLSearchParams();
  params.append('q', query);
  params.append('mode', mode);
  
  // Only add limit if explicitly provided, otherwise use backend default
  if (options.limit) {
    params.append('limit', options.limit.toString());
  }
  
  // Add pagination parameters
  if (options.page) {
    params.append('page', options.page.toString());
  }
  if (options.cursor) {
    params.append('cursor', options.cursor);
  }
  
  // Add optional parameters
  if (options.includePricing !== undefined) {
    params.append('include_pricing', options.includePricing.toString());
  }
  if (options.includeCategories !== undefined) {
    params.append('include_categories', options.includeCategories.toString());
  }
  if (options.includeTags !== undefined) {
    params.append('include_tags', options.includeTags.toString());
  }
  if (options.includeInventory !== undefined) {
    params.append('include_inventory', options.includeInventory.toString());
  }
  if (options.categoryIds && options.categoryIds.length > 0) {
    options.categoryIds.forEach(id => params.append('category_ids', id.toString()));
  }
  if (options.minPrice !== undefined) {
    params.append('min_price', options.minPrice.toString());
  }
  if (options.maxPrice !== undefined) {
    params.append('max_price', options.maxPrice.toString());
  }
  if (options.storeIds && options.storeIds.length > 0) {
    options.storeIds.forEach(id => params.append('store_id', id.toString()));
  }
  if (options.latitude !== undefined) {
    params.append('latitude', options.latitude.toString());
  }
  if (options.longitude !== undefined) {
    params.append('longitude', options.longitude.toString());
  }

  // Backend search endpoint is `/products/search` (not `/search`).
  const url = `${getBaseUrl()}/products/search?${params.toString()}`;
  
  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...authHeaders
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Search API Error:", errorText);
    throw new Error(`Failed to search products: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const result = {
    products: data.data?.products || [],
    suggestions: data.data?.suggestions || [],
    total_results: data.data?.total_results || 0,
    search_metadata: data.data?.search_metadata || {},
  };

  apiLog('GET /products/search', `${response.status} · ${result.products.length} products · "${query}"`, {
    url: url.split('?')[0],
    query,
    mode,
    products: result.products,
    total_results: result.total_results,
  });

  return result;
}

// Track search click
export async function trackSearchClick(query: string, productId: number) {
  try {
    const authHeaders = await getAuthHeaders();
    // Backend click tracking endpoint is `/products/search/click`.
    const response = await fetch(`${getBaseUrl()}/products/search/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({
        query,
        product_id: productId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Search Click Tracking Error:", errorText);
      throw new Error(`Failed to track search click: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('Error tracking search click:', error);
    // Don't throw error for click tracking failures - it shouldn't break the user experience
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get user's search history
export async function getSearchHistory(limit: number = 10) {
  try {
    const authHeaders = await getAuthHeaders();
    
    // Check if user is authenticated
    if (!authHeaders['Authorization']) {
      // User is not authenticated, return empty array
      return [];
    }
    
    // Validate limit
    const validLimit = Math.min(Math.max(1, limit), 50);
    
    // Add cache-busting timestamp to ensure fresh data
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${getBaseUrl()}/users/me/search-history?limit=${validLimit}&${cacheBuster}`, {
      method: 'GET',
      cache: 'no-store', // Disable Next.js caching
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...authHeaders
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // User not authenticated, return empty array
        return [];
      }
      const errorText = await response.text();
      console.error("❌ Search History API Error:", errorText);
      throw new Error(`Failed to get search history: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // Backend returns { statusCode, message, data: [...] } format
    // Extract the data array from the response
    let historyArray: string[] = [];
    if (data && data.data && Array.isArray(data.data)) {
      historyArray = data.data;
    } else if (Array.isArray(data)) {
      historyArray = data;
    }
    
    // Filter out invalid entries (like API documentation text, empty strings, etc.)
    return historyArray.filter((item: string) => {
      if (!item || typeof item !== 'string') return false;
      const trimmed = item.trim();
      
      // Filter out empty or very short entries
      if (trimmed.length < 1) return false;
      
      // Filter out entries that look like API documentation or endpoints
      const lowerItem = trimmed.toLowerCase();
      if (
        lowerItem.includes('get /') || 
        lowerItem.includes('post /') || 
        lowerItem.includes('users/me/search-history') ||
        lowerItem.includes('search-history') ||
        lowerItem.includes('current user') ||
        lowerItem.startsWith('get ') ||
        lowerItem.startsWith('post ') ||
        trimmed.includes('GET /') ||
        trimmed.includes('POST /') ||
        trimmed.includes('/users/me/')
      ) {
        return false;
      }
      
      return true;
    });
  } catch (error) {
    console.error('Error getting search history:', error);
    // Return empty array on error to not break the user experience
    return [];
  }
}

// Promotion interface
export interface Promotion {
  id: number;
  is_active: boolean;
  promotion_type: 'banner' | 'popup' | 'search';
  priority: number;
  start_date: string;
  end_date: string;
  product_ids: number[];
  category_ids: number[];
  image_urls_web: string[];
  image_urls_mobile: string[];
  created_at: string;
  updated_at: string;
}

// Get random active promotions
export async function getActivePromotions(
  promotionType: 'banner' | 'popup' | 'search',
  options?: {
    productId?: number | null;
    categoryId?: number | null;
  }
): Promise<Promotion[]> {
  try {
    const params = new URLSearchParams();
    params.append('promotion_type', promotionType);
    
    if (options?.productId !== undefined && options.productId !== null) {
      params.append('product_id', options.productId.toString());
    }
    
    if (options?.categoryId !== undefined && options.categoryId !== null) {
      params.append('category_id', options.categoryId.toString());
    }
    
    // Explicitly do NOT send limit parameter - backend uses its default
    // Add cache-busting timestamp to ensure we get fresh random promotions each time
    params.append('_t', Date.now().toString());
    
    const authHeaders = await getAuthHeaders();
    const apiUrl = `${getBaseUrl()}/promotions/active/random?${params.toString()}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        ...authHeaders,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No promotions found, return empty array
        return [];
      }
      const errorText = await response.text();
      console.error("❌ Promotions API Error:", response.status, errorText);
      throw new Error(`Failed to get promotions: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();

    let promotions: unknown[] = [];
    if (responseData?.data && Array.isArray(responseData.data)) {
      promotions = responseData.data;
    } else if (Array.isArray(responseData)) {
      promotions = responseData;
    }

    apiLog(
      `GET /promotions/active/random`,
      `${response.status} · ${promotions.length} · ${promotionType}`,
      {
        url: apiUrl.split('&_t=')[0],
        promotionType,
        options,
        promotions,
      }
    );

    return promotions as Promotion[];
  } catch (error) {
    console.error('Error getting promotions:', error);
    // Return empty array on error to not break the user experience
    return [];
  }
}
