/**
 * WooCommerce Cache Module
 * 
 * Implements caching for WooCommerce API responses:
 * - In-memory cache for products and categories
 * - Cache invalidation
 * - TTL (Time To Live) management
 * - Enhanced prefetching
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

interface Cache {
  products: Map<string, CacheItem<any>>;
  categories: CacheItem<any> | null;
  events: CacheItem<any> | null;
  news: CacheItem<any> | null;
  featuredProducts: CacheItem<any> | null;
}

// Increase cache duration for better performance
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes (increased from 5)
const PREFETCH_TTL = 15 * 60 * 1000; // 15 minutes for prefetched data

// Initialize cache
const cache: Cache = {
  products: new Map(),
  categories: null,
  events: null,
  news: null,
  featuredProducts: null,
};

/**
 * Check if a cache item is still valid
 */
function isValid<T>(item: CacheItem<T> | null | undefined, ttl = CACHE_TTL): boolean {
  if (!item) return false;
  return Date.now() - item.timestamp < ttl;
}

/**
 * Get cached data if valid, otherwise return null
 */
export function getCached(type: 'products' | 'categories' | 'events' | 'news' | 'featuredProducts', key = 'all'): any | null {
  // Check for direct cache types first
  if (type === 'categories') {
    return isValid(cache.categories) ? cache.categories?.data : null;
  } else if (type === 'events') {
    return isValid(cache.events) ? cache.events?.data : null;
  } else if (type === 'news') {
    return isValid(cache.news) ? cache.news?.data : null;
  } else if (type === 'featuredProducts') {
    return isValid(cache.featuredProducts) ? cache.featuredProducts?.data : null;
  }
  
  // For products
  const item = cache.products.get(key);
  return isValid(item) ? item?.data : null;
}

/**
 * Store data in cache
 */
export function setCache(
  type: 'products' | 'categories' | 'events' | 'news' | 'featuredProducts', 
  data: any, 
  key = 'all',
  isPrefetch = false
): void {
  const cacheItem = {
    data,
    timestamp: Date.now(),
  };

  if (type === 'categories') {
    cache.categories = cacheItem;
  } else if (type === 'events') {
    cache.events = cacheItem;
  } else if (type === 'news') {
    cache.news = cacheItem;
  } else if (type === 'featuredProducts') {
    cache.featuredProducts = cacheItem;
  } else {
    cache.products.set(key, cacheItem);
  }
  
  // Log successful cache update if not prefetching
  if (!isPrefetch) {
    console.log(`Cache updated for ${type}${key !== 'all' ? `:${key}` : ''}`);
  }
}

/**
 * Clear specific cache or all cache
 */
export function clearCache(type?: 'products' | 'categories' | 'events' | 'news' | 'featuredProducts'): void {
  if (!type || type === 'products') {
    cache.products.clear();
  }
  if (!type || type === 'categories') {
    cache.categories = null;
  }
  if (!type || type === 'events') {
    cache.events = null;
  }
  if (!type || type === 'news') {
    cache.news = null;
  }
  if (!type || type === 'featuredProducts') {
    cache.featuredProducts = null;
  }
  
  console.log(`Cache cleared: ${type || 'all'}`);
}

/**
 * Prefetch data for faster initial loads
 * This function should be called on app initialization
 */
export async function prefetchCriticalData(): Promise<void> {
  try {
    // Import fetchers dynamically to avoid circular dependencies
    const { fetchCategories } = await import('./products');
    const { fetchEvents, fetchNews } = await import('./events-news');
    
    // Start all fetches in parallel
    const promises = [
      // Only fetch if not already in cache
      !isValid(cache.categories, PREFETCH_TTL) ? 
        fetchCategories().then(data => setCache('categories', data, 'all', true)) : 
        Promise.resolve(),
        
      !isValid(cache.events, PREFETCH_TTL) ?
        fetchEvents().then(data => setCache('events', data, 'all', true)) :
        Promise.resolve(),
        
      !isValid(cache.news, PREFETCH_TTL) ?
        fetchNews().then(data => setCache('news', data, 'all', true)) :
        Promise.resolve(),
    ];
    
    // Wait for all fetches to complete
    await Promise.allSettled(promises);
    console.log('Critical data prefetched successfully');
  } catch (error) {
    console.warn('Error prefetching critical data:', error);
    // Don't throw - prefetching should not block app initialization
  }
}