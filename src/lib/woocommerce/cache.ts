/**
 * WooCommerce Cache Module
 * 
 * Implements caching for WooCommerce API responses:
 * - In-memory cache for products and categories
 * - Cache invalidation
 * - TTL (Time To Live) management
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

interface Cache {
  products: Map<string, CacheItem<any>>;
  categories: CacheItem<any> | null;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache: Cache = {
  products: new Map(),
  categories: null,
};

/**
 * Check if a cache item is still valid
 */
function isValid<T>(item: CacheItem<T> | null | undefined): boolean {
  if (!item) return false;
  return Date.now() - item.timestamp < CACHE_TTL;
}

/**
 * Get cached data if valid, otherwise return null
 */
export function getCached(type: 'products' | 'categories', key = 'all'): any | null {
  if (type === 'categories') {
    return isValid(cache.categories) ? cache.categories?.data : null;
  }
  
  const item = cache.products.get(key);
  return isValid(item) ? item?.data : null;
}

/**
 * Store data in cache
 */
export function setCache(type: 'products' | 'categories', data: any, key = 'all'): void {
  const cacheItem = {
    data,
    timestamp: Date.now(),
  };

  if (type === 'categories') {
    cache.categories = cacheItem;
  } else {
    cache.products.set(key, cacheItem);
  }
}

/**
 * Clear specific cache or all cache
 */
export function clearCache(type?: 'products' | 'categories'): void {
  if (!type || type === 'products') {
    cache.products.clear();
  }
  if (!type || type === 'categories') {
    cache.categories = null;
  }
}