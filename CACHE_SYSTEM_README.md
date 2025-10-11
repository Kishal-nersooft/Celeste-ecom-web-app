# Product Caching System

This document describes the local product caching system implemented to improve performance and reduce unnecessary API calls when users navigate between pages, categories, and other actions.

## Overview

The caching system stores product data locally in the browser's localStorage, preventing redundant API calls when users switch between pages or categories. Products are cached based on their query parameters and automatically expire after 5 minutes.

## Key Features

- **Local Storage Persistence**: Products are stored in localStorage and persist across page refreshes
- **Smart Cache Keys**: Cache entries are keyed by query parameters (category, store, location, etc.)
- **Automatic Expiration**: Cache entries expire after 5 minutes to ensure data freshness
- **Memory Management**: Maximum of 50 cache entries to prevent memory bloat
- **Cache Invalidation**: Smart invalidation when data changes
- **Development Tools**: Cache manager component for debugging

## Files Added/Modified

### New Files
- `lib/product-cache.ts` - Core caching system
- `lib/cache-invalidation.ts` - Cache invalidation utilities
- `components/CacheManager.tsx` - Debug component for cache management
- `test-cache-functionality.js` - Test script for cache functionality

### Modified Files
- `lib/api.ts` - Updated API functions to use caching
- `components/CacheRefreshButton.tsx` - Updated to work with new cache system
- `app/(client)/layout.tsx` - Added cache manager for development

## How It Works

### 1. Cache Storage
```typescript
// Products are cached with parameters as keys
const cacheParams = {
  categoryIds: [1, 2, 3],
  page: 1,
  pageSize: 100,
  onlyDiscounted: false,
  includeCategories: true,
  includePricing: true,
  includeInventory: true,
  storeIds: [1, 2, 3, 4],
  latitude: 40.7128,
  longitude: -74.006
};
```

### 2. Cache Flow
1. **API Call Requested**: Component calls `getProducts()` or similar function
2. **Cache Check**: System checks if valid cached data exists for the parameters
3. **Cache Hit**: If found, returns cached data immediately
4. **Cache Miss**: If not found or expired, makes API call
5. **Cache Store**: API response is stored in cache for future use

### 3. Cache Invalidation
- **Time-based**: Entries expire after 5 minutes
- **Manual**: Users can clear cache via refresh button
- **Data changes**: Cache is invalidated when products/categories change
- **Storage events**: Cache syncs across browser tabs

## Usage

### For Developers

#### Cache Manager (Development Only)
The cache manager appears as a floating button (📦) in the bottom-right corner during development. It provides:
- Cache statistics
- Manual cache clearing
- Debug information

#### Cache Invalidation
```typescript
import { invalidateAll, invalidateCategory, invalidateStore } from '@/lib/cache-invalidation';

// Clear all cache
invalidateAll();

// Clear cache for specific category
invalidateCategory(1);

// Clear cache for specific store
invalidateStore(1);
```

#### Cache Statistics
```typescript
import { getCacheStats } from '@/lib/product-cache';

const stats = getCacheStats();
console.log('Cache entries:', stats.size);
console.log('Cached queries:', stats.entries);
```

### For Users

#### Automatic Behavior
- Products are automatically cached when loaded
- Cache is used when navigating between pages
- Cache expires automatically after 5 minutes
- No user action required

#### Manual Refresh
- Use the "🔄 Refresh Data" button in the header to clear cache and reload data
- This forces fresh data from the server

## Configuration

### Cache Settings
```typescript
// In lib/product-cache.ts
const config: CacheConfig = {
  maxAge: 5 * 60 * 1000, // 5 minutes
  maxSize: 50 // Maximum 50 cache entries
};
```

### Environment Variables
- Cache manager only shows in development mode
- Production builds have caching enabled but no debug UI

## Performance Benefits

### Before Caching
- Every page navigation triggers API calls
- Category switching causes new API requests
- Store switching reloads all products
- Multiple API calls for same data

### After Caching
- First load caches products locally
- Subsequent navigation uses cached data
- Only expired or new queries hit the API
- Significantly reduced API calls and faster navigation

## Testing

### Manual Testing
1. Load the homepage and check console for "Using cached products" messages
2. Navigate between categories - should see cache hits
3. Use the cache manager to view statistics
4. Clear cache and verify fresh API calls

### Automated Testing
Run the test script in browser console:
```javascript
// Load the test script
import('./test-cache-functionality.js');

// Run all tests
testProductCache.runAllTests();
```

## Troubleshooting

### Common Issues

#### Cache Not Working
- Check browser console for errors
- Verify localStorage is available
- Check if cache is disabled in browser settings

#### Stale Data
- Cache expires after 5 minutes automatically
- Use refresh button to force fresh data
- Check if cache invalidation is working

#### Memory Issues
- Cache is limited to 50 entries maximum
- Old entries are automatically removed
- Clear cache manually if needed

### Debug Information
- Enable cache manager in development
- Check console logs for cache hit/miss messages
- Use browser dev tools to inspect localStorage

## Future Enhancements

### Potential Improvements
1. **Background Refresh**: Update cache in background before expiration
2. **Selective Invalidation**: More granular cache invalidation
3. **Cache Compression**: Compress stored data to save space
4. **Analytics**: Track cache hit rates and performance metrics
5. **Offline Support**: Serve cached data when offline

### Configuration Options
1. **Custom Expiration**: Per-category expiration times
2. **Cache Size Limits**: Configurable maximum cache size
3. **Priority Caching**: Cache important products longer
4. **User Preferences**: Allow users to control caching behavior

## Conclusion

The product caching system significantly improves user experience by reducing loading times and API calls. It's designed to be transparent to users while providing developers with tools to monitor and manage cache behavior. The system is production-ready and includes proper error handling, memory management, and debugging capabilities.
