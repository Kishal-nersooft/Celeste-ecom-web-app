export const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://celeste-api-846811285865.asia-south1.run.app";
export const LOCAL_API_BASE_URL = "/api";

// Import product caching functions
import { getCachedProducts, setCachedProducts, hasCachedProducts } from './product-cache';

// Helper function to get the appropriate base URL for server vs client
function getBaseUrl() {
  if (typeof window === 'undefined') {
    // Server-side: use the external API directly to avoid port issues
    return API_BASE_URL;
  }
  // Client-side: use window.location.origin to dynamically get the current port
  return `${window.location.origin}${LOCAL_API_BASE_URL}`;
}

// Helper function to get authentication headers
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (typeof window === 'undefined') {
    // Server-side: no auth headers (server-side rendering doesn't have access to localStorage)
    return headers;
  }
  
  // Client-side: try to get Firebase user token
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
  console.warn('Unexpected response format from getUserAddresses:', responseData);
  return [];
}

export async function createUserAddress(addressData: {
  address: string;
  latitude: number;
  longitude: number;
  is_default?: boolean;
  name?: string;
}) {
  const authHeaders = await getAuthHeaders();
  console.log('🔐 Creating address with headers:', authHeaders);
  console.log('📝 Address data being sent:', addressData);
  
  const response = await fetch(`${getBaseUrl()}/users/me/addresses`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(addressData),
  });

  console.log('📡 Address creation response:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log('❌ Address creation error response:', errorText);
    
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 500) {
      // Try to register user first, then retry address creation
      console.log('🔄 Attempting user registration before address creation...');
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          const idToken = await user.getIdToken();
          await registerUser(idToken, user.displayName || 'User');
          console.log('✅ User registered successfully, retrying address creation...');
          
          // Retry address creation
          const retryResponse = await fetch(`${getBaseUrl()}/users/me/addresses`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(addressData),
          });
          
          if (retryResponse.ok) {
            return retryResponse.json();
          }
        }
      } catch (regError) {
        console.log('❌ User registration failed:', regError);
      }
      
      throw new Error('Backend service temporarily unavailable. Please try again later.');
    }
    throw new Error(`Failed to create address: ${response.status} ${response.statusText}`);
  }

  const responseData = await response.json();
  console.log('📦 Address creation response data:', responseData);
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
    },
    body: JSON.stringify({ idToken, name }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log('❌ User registration error response:', errorText);
    
    if (response.status === 422) {
      throw new Error('Invalid registration data');
    }
    throw new Error(`Failed to register user: ${response.status} ${response.statusText}`);
  }

  return response.json();
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

// Alternative: Dynamic port detection for server-side (if needed)
function getServerBaseUrl() {
  if (typeof window !== 'undefined') {
    // Client-side: use relative URL
    return LOCAL_API_BASE_URL;
  }
  
  // Server-side: try to get port from environment or use default
  const port = process.env.PORT || process.env.NEXT_PUBLIC_PORT || '3000';
  const host = process.env.HOST || 'localhost';
  
  // Use external API for server-side to avoid port conflicts
  return API_BASE_URL;
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
  const response = await fetch(`${getBaseUrl()}/categories?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store', // Disable Next.js caching
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...authHeaders
    }
  });
  
  // Only log once per session
  if (!(window as any).categoriesLogged) {
    console.log("getCategories response status:", response.status);
    console.log("getCategories response ok:", response.ok);
    (window as any).categoriesLogged = true;
  }
  
  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }
  const data = await response.json();
  
  // Only log once per session
  if (!(window as any).categoriesDataLogged) {
    console.log("getCategories parsed data:", data);
    (window as any).categoriesDataLogged = true;
  }
  
  return data.data || [];
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
      console.log("📦 API - Using cached products:", cachedProducts.length);
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
  
  const url = `${getBaseUrl()}/products?${params.toString()}`;
  console.log("🔍 API - Fetching products from server:", url.split('?')[0]);
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
  // Only log once per session
  if (!(window as any).productsLogged) {
    console.log("getProducts response status:", response.status);
    console.log("getProducts response ok:", response.ok);
    (window as any).productsLogged = true;
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error:", errorText);
    throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  
  // Only log once per session
  if (!(window as any).productsDataLogged) {
    console.log("getProducts parsed data:", data);
    (window as any).productsDataLogged = true;
  }
  
  let products = data.data?.products || [];
  
  // Cache the results (only on client side)
  if (typeof window !== 'undefined') {
    setCachedProducts(cacheParams, products);
  }
  
  // Debug: Log summary of products with discounts
  const discountedCount = products.filter((p: any) => p.pricing && p.pricing.discount_applied > 0).length;
  console.log(`📦 Fetched ${products.length} products (${discountedCount} with discounts)`);

  
  // Note: The backend API should return pricing data with include_pricing=true
  // If pricing is null, the backend needs to be configured to return pricing data
  // We don't make individual API calls for each product - that's inefficient
  
  return products;
}

// Get subcategories of a specific parent category
export async function getSubcategories(parentCategoryId: number) {
  const params = new URLSearchParams();
  params.append('parent_id', parentCategoryId.toString());
  params.append('subcategories_only', 'true');
  
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/categories?${params.toString()}`, {
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
  const response = await fetch(`${getBaseUrl()}/products?${params.toString()}`, {
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
  try {
    // First get all categories to find the subcategory
    const allCategories = await getCategories(true, false);
    const subcategory = allCategories.find((cat: any) => cat.id === subcategoryId);
    
    if (!subcategory || !subcategory.parent_category_id) {
      throw new Error("Subcategory not found or has no parent");
    }
    
    // Find the parent category
    const parentCategory = allCategories.find((cat: any) => cat.id === subcategory.parent_category_id);
    
    if (!parentCategory) {
      throw new Error("Parent category not found");
    }
    
    return parentCategory;
  } catch (error) {
    console.error("Error getting parent category from subcategory:", error);
    throw error;
  }
}

export async function revalidateAllProducts() {
  const response = await fetch(`${API_BASE_URL}/revalidate-products`, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
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
  longitude?: number
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
  
  console.log('🔍 getProductById - Requesting URL:', url);
  console.log('🔍 getProductById - Parameters:', params.toString());
  
  const authHeaders = await getAuthHeaders();
  console.log('🔍 getProductById - Auth headers:', authHeaders);
  
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
  
  console.log('🔍 getProductById - Response status:', response.status);
  console.log('🔍 getProductById - Response ok:', response.ok);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ getProductById - Error response:', errorText);
    throw new Error(`Failed to fetch product: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  let product = data.data;
  
  console.log('🔍 getProductById - Raw API response:', JSON.stringify(data, null, 2));
  console.log('🔍 getProductById - Product data:', JSON.stringify(product, null, 2));
  console.log('🔍 getProductById - Pricing data:', product?.pricing);
  
  // Note: The backend API should return pricing data with include_pricing=true
  // If pricing is null, the backend needs to be configured to return pricing data
  
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
  
  console.log("getStores response status:", response.status);
  console.log("getStores response ok:", response.ok);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Stores API Error:", errorText);
    throw new Error(`Failed to fetch stores: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log("getStores parsed data:", data);
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
      console.log("📦 API - Using cached all products:", cachedProducts.length);
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
    
    const url = `${getBaseUrl()}/products?${params.toString()}`;
    console.log("Fetching products from URL:", url);
    
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
    
    console.log(`Fetched ${products.length} products, total: ${allProducts.length}, hasMore: ${hasMore}`);
  }
  
  console.log(`getAllProducts - Total products fetched: ${allProducts.length}`);
  
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
  console.log(`🔄 Getting products with pricing (onlyDiscounted: ${onlyDiscounted})...`);
  
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

  console.log(`📦 Found ${products.length} products from backend`);
  
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
  
  console.log(`📊 Products with pricing: ${productsWithPricing.length}`);
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
  console.log(`🔥 Getting popular products (mode: ${mode})...`);
  
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
  console.log("🔍 API - Fetching popular products from:", url.split('?')[0]);
  
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
  
  // Log the full response structure for debugging
  console.log("📦 Popular products API response structure:", {
    hasProducts: !!data.products,
    hasDataProducts: !!data.data?.products,
    hasData: !!data.data,
    keys: Object.keys(data),
    responseSample: JSON.stringify(data).substring(0, 200)
  });
  
  // Handle different response structures
  let products: any[] = [];
  if (data.products && Array.isArray(data.products)) {
    products = data.products;
  } else if (data.data?.products && Array.isArray(data.data.products)) {
    products = data.data.products;
  } else if (Array.isArray(data)) {
    products = data;
  }
  
  console.log(`✅ Found ${products.length} popular products (mode: ${mode})`);
  
  if (products.length === 0) {
    console.warn("⚠️ No products returned for mode:", mode);
    console.warn("Response data:", JSON.stringify(data).substring(0, 500));
  }
  
  // Ensure products have pricing structure
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
  console.log(`🔄 Getting recent products...`);
  
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
  console.log("🔍 API - Fetching recent products from:", url.split('?')[0]);
  
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
  
  // Log the full response structure for debugging
  console.log("📦 Recent products API response structure:", {
    isArray: Array.isArray(data),
    keys: Array.isArray(data) ? 'array' : Object.keys(data),
    responseSample: JSON.stringify(data).substring(0, 200)
  });
  
  // Handle different response structures
  // API returns: {statusCode: 200, message: "Success", data: [...]}
  let products: any[] = [];
  if (Array.isArray(data)) {
    products = data;
  } else if (data.data && Array.isArray(data.data)) {
    // Response structure: {statusCode, message, data: [...]} - products are directly in data.data array
    products = data.data;
  } else if (data.products && Array.isArray(data.products)) {
    products = data.products;
  } else if (data.data?.products && Array.isArray(data.data.products)) {
    products = data.data.products;
  }
  
  console.log(`✅ Found ${products.length} recent products`);
  
  if (products.length === 0) {
    console.warn("⚠️ No recent products returned");
    console.warn("Response data structure:", {
      isArray: Array.isArray(data),
      hasData: !!data.data,
      dataIsArray: Array.isArray(data.data),
      dataLength: Array.isArray(data.data) ? data.data.length : 'N/A',
      keys: Object.keys(data)
    });
  }
  
  console.log(`✅ Found ${products.length} recent products`);
  
  if (products.length === 0) {
    console.warn("⚠️ No recent products returned");
    console.warn("Response data:", JSON.stringify(data).substring(0, 500));
  }
  
  // Ensure products have pricing structure
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

// Optimized function specifically for deals - use backend's only_discounted filtering
export async function getDiscountedProductsOptimized(
  pageSize: number = 50, // Smaller page size for deals
  storeIds?: number[],
  cursor?: string | null
) {
  console.log(`🎯 Getting discounted products (using backend filtering)...`);
  
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

  console.log(`✅ Found ${products.length} discounted products from backend`);
  
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
  
  const url = `${getBaseUrl()}/products?${params.toString()}`;
  console.log("🔍 API - Fetching products with cursor pagination:", url.split('?')[0]);
  
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
  console.log(`⚠️ Individual pricing enrichment disabled to prevent excessive API calls`);
  console.log(`📦 Using basic pricing structure for ${products.length} products`);
  
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
  console.log(`⚠️ Individual product pricing disabled to prevent excessive API calls`);
  console.log(`📦 Product ID: ${productId}, Tier: ${tierId}, Quantity: ${quantity}`);
  
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
  console.log('🛒 Creating cart with data:', cartData);
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
    console.log(`🔍 updateCartItemQuantityByProductId called: cartId=${cartId}, productId=${productId}, quantity=${quantity}`);
    
    // First get cart details to find the item ID for this product
    const cartDetails = await getCartDetails(cartId);
    const cartData = cartDetails?.data || cartDetails;
    const items = cartData?.items || [];
    
    console.log(`📦 Cart has ${items.length} items:`, items.map((i: any) => ({ id: i.id, product_id: i.product_id })));
    
    // Find the item with the matching product ID
    const cartItem = items.find((item: any) => item.product_id === productId);
    
    if (!cartItem) {
      console.log(`❌ Product ${productId} not found in cart ${cartId}`);
      return null; // Item not in cart
    }
    
    console.log(`✅ Found cart item: id=${cartItem.id}, product_id=${cartItem.product_id}`);
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
    console.log(`🔍 removeFromCart called: cartId=${cartId}, productId=${productId}, quantity=${quantity}`);
    
    const params = new URLSearchParams();
    if (quantity !== undefined) {
      params.append('quantity', quantity.toString());
    }
    
    const authHeaders = await getAuthHeaders();
    const url = `${getBaseUrl()}/users/me/carts/${cartId}/items/${productId}?${params.toString()}`;
    console.log(`🌐 DELETE request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: authHeaders
    });
    
    if (!response.ok) {
      throw new Error(`Failed to remove from cart: ${response.status} ${response.statusText}`);
    }
    
    console.log(`✅ Successfully removed item from cart`);
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

// Preview multi-cart order
export async function previewOrder(orderData: {
  cart_ids: number[];
  location: {
    mode: 'delivery' | 'pickup';
    address_id?: number | null;
    store_id?: number | null;
    delivery_service_level?: string;
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

  console.log('🔍 Preview order request data:', JSON.stringify(requestData, null, 2));

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
      console.log('🔄 Address not found, retrying without address...');
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
        console.log('✅ Preview order succeeded without address');
        return data;
      }
    }
    
    throw new Error(`Failed to preview order: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const data = await response.json();
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
  };
  delivery_charge?: number;
  service_charge?: number;
  tax?: number;
  subtotal?: number;
  total_amount?: number;
  split_order?: boolean;
  platform?: string;
}) {
  const authHeaders = await getAuthHeaders();
  console.log('📤 CREATE ORDER - Sending data:', JSON.stringify(orderData, null, 2));
  console.log('📤 CREATE ORDER - Headers:', authHeaders);
  
  const response = await fetch(`${getBaseUrl()}/users/me/checkout/order`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(orderData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.log('❌ Order creation error response:', errorText);
    console.log('❌ Order creation error status:', response.status);
    console.log('❌ Order creation error headers:', Object.fromEntries(response.headers.entries()));
    
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
  return data;
}

// ==================== INVENTORY CHECK API FUNCTIONS ====================

// Check inventory availability for products
export async function checkInventoryAvailability(productIds: number[], storeId?: number, latitude?: number, longitude?: number) {
  console.log('🚀🚀🚀 CHECKINVENTORYAVAILABILITY CALLED - NEW VERSION 🚀🚀🚀');
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
  console.log('🔍 Product IDs to check:', productIds);
  productIds.forEach(id => params.append('product_ids', id.toString()));
  
  const url = `${getBaseUrl()}/products?${params.toString()}&_t=${Date.now()}`;
  console.log('🔍 Checking inventory availability:', url);
  console.log('🔍 Full URL with params:', url);
  
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
  
  console.log('🔍 Raw inventory API response:', JSON.stringify(data, null, 2));
  console.log('🔍 All products returned by API:', allProducts.length);
  console.log('🔍 Filtered products (requested IDs only):', products.length);
  console.log('🔍 Requested product IDs:', productIds);
  console.log('🔍 Found product IDs:', products.map((p: any) => p.id));
  
  // Check availability for each product
  console.log('🚀 NEW INVENTORY CHECK LOGIC - Starting availability check...');
  const availability = products.map((product: any) => {
    console.log(`🔍 Product ${product.id} (${product.name}) inventory:`, product.inventory);
    
    // Handle inventory as array - find the first available store or use the first one
    const inventory = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
    
    console.log(`🔍 Product ${product.id} - First inventory item:`, inventory);
    console.log(`🔍 Product ${product.id} - in_stock:`, inventory?.in_stock);
    console.log(`🔍 Product ${product.id} - can_fulfill:`, inventory?.can_fulfill);
    console.log(`🔍 Product ${product.id} - quantity_available:`, inventory?.quantity_available);
    
    const isAvailable = inventory?.in_stock || inventory?.can_fulfill || false;
    console.log(`🔍 Product ${product.id} - Final availability:`, isAvailable);
    
    return {
      product_id: product.id,
      name: product.name,
      available: isAvailable,
      quantity_available: inventory?.quantity_available || 0,
      inventory_status: product.inventory
    };
  });
  
  console.log('📦 Inventory availability check results:', availability);
  console.log('🚀 NEW INVENTORY CHECK LOGIC - Completed availability check...');
  return availability;
}

// ==================== ORDER MANAGEMENT API FUNCTIONS ====================

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
  return data;
}

// Get all orders for the current user
export async function getUserOrders(page: number = 1, limit: number = 20, includeProducts: boolean = true, includeStores: boolean = true, includeAddresses: boolean = true) {
  const authHeaders = await getAuthHeaders();
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  if (includeProducts) params.append('include_products', 'true');
  if (includeStores) params.append('include_stores', 'true');
  if (includeAddresses) params.append('include_addresses', 'true');
  
  const response = await fetch(`${getBaseUrl()}/users/me/orders?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

// Get specific order by ID
export async function getOrderById(orderId: string) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/orders/${orderId}`, {
    method: 'GET',
    headers: authHeaders
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch order: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

// Note: getOrderById function is defined later in the file (line 1339)

// Cancel an order
export async function cancelOrder(orderId: string, reason?: string) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}/users/me/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ reason })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to cancel order: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
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
  console.log('🔄 Creating reorder cart for order:', order.id);
  
  try {
    // 1. Create new cart
    const cartName = `Cart from ${new Date(order.createdAt).toLocaleDateString()}`;
    const cartDescription = `Reorder from Order #${order.orderNumber || order.id}`;
    
    const newCart = await createCart({
      name: cartName,
      description: cartDescription
    });
    
    console.log('✅ New reorder cart created:', newCart);
    
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
          
          console.log(`✅ Added ${freshProduct.name} (qty: ${orderItem.quantity}) to reorder cart`);
        } else {
          console.warn(`⚠️ Product ${orderItem.productId} not found, skipping`);
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
  console.log('🔄 Adding reorder items to existing cart:', cartId);
  
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
            console.log(`✅ Updated quantity for ${freshProduct.name} to ${newQuantity}`);
          } else {
            // Add new item
            await addItemToCart(cartId, {
              product_id: freshProduct.id,
              quantity: orderItem.quantity
            });
            console.log(`✅ Added ${freshProduct.name} (qty: ${orderItem.quantity}) to existing cart`);
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

  const url = `${getBaseUrl()}/search?${params.toString()}`;
  console.log("🔍 Search API - Fetching search results:", url.split('?')[0]);
  
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
  console.log(`🔍 Search API - Found ${data.data?.products?.length || 0} products for query: "${query}"`);
  
  // Return the data in the expected format (matching backend response structure)
  return {
    products: data.data?.products || [],
    suggestions: data.data?.suggestions || [],
    total_results: data.data?.total_results || 0,
    search_metadata: data.data?.search_metadata || {}
  };
}

// Track search click
export async function trackSearchClick(query: string, productId: number) {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${getBaseUrl()}/search/click`, {
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
    console.log(`🔍 Search Click - Tracked click for product ${productId} with query: "${query}"`);
    
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
    console.log('🔍 Fetching fresh promotions from:', apiUrl.split('&_t=')[0]); // Log without timestamp
    
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
        console.log('ℹ️ No promotions found (404)');
        return [];
      }
      const errorText = await response.text();
      console.error("❌ Promotions API Error:", response.status, errorText);
      throw new Error(`Failed to get promotions: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log('📦 Promotions API Response:', responseData);
    
    // Handle the response format: { statusCode, message, data: [...] }
    if (responseData && responseData.data && Array.isArray(responseData.data)) {
      console.log('✅ Found promotions:', responseData.data.length);
      return responseData.data;
    } else if (Array.isArray(responseData)) {
      // Fallback: if response is directly an array
      console.log('✅ Found promotions (direct array):', responseData.length);
      return responseData;
    }
    
    console.warn("⚠️ Unexpected promotions API response format:", responseData);
    return [];
  } catch (error) {
    console.error('Error getting promotions:', error);
    // Return empty array on error to not break the user experience
    return [];
  }
}
