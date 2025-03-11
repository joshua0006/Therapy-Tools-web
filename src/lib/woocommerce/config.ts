/**
 * WooCommerce Configuration Module
 * 
 * Provides centralized configuration and authentication for WooCommerce API
 * with enhanced security measures.
 */

import { getWooCommerceAuthHeaders } from './oauth';
import { getAuthToken, getUserFromToken } from '../auth/tokenService';

// Rate limiting configuration
const rateLimiter = {
  tokens: parseInt(import.meta.env.VITE_API_RATE_LIMIT || '100'),
  window: parseInt(import.meta.env.VITE_API_RATE_WINDOW || '900000'),
  requests: new Map<string, number[]>()
};

// Ensure config is properly defined as an object with all properties (even if from env variables)
const config = {
  url: import.meta.env.VITE_API_URL || '',
  consumerKey: import.meta.env.VITE_WOO_CONSUMER_KEY || '',
  consumerSecret: import.meta.env.VITE_WOO_CONSUMER_SECRET || '',
  version: import.meta.env.VITE_API_VERSION || 'wc/v3'
};

// Validate required environment variables
if (!config.url || !config.consumerKey || !config.consumerSecret) {
  throw new Error('Missing required API configuration. Please check your environment variables.');
}

/**
 * Check rate limiting for the current user/IP
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimiter.requests.get(userId) || [];
  
  // Remove old requests outside the window
  const validRequests = userRequests.filter(time => now - time < rateLimiter.window);
  
  if (validRequests.length >= rateLimiter.tokens) {
    return false;
  }
  
  validRequests.push(now);
  rateLimiter.requests.set(userId, validRequests);
  return true;
}

/**
 * Make an authenticated request to the WooCommerce API with enhanced security
 */
export async function makeWooRequest<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
  options: RequestInit = {}
): Promise<T> {
  // Check authentication
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  // Get user ID from token for rate limiting
  const user = getUserFromToken();
  const userId = user?.id || 'anonymous';
  
  // Check rate limit
  if (!checkRateLimit(userId)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  const url = new URL(`${config.url}/wp-json/${config.version}/${endpoint}`);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value.toString());
  });

  // Generate OAuth headers
  const requestData = {
    url: url.toString(),
    method: options.method || 'GET'
  };

  const oauthHeader = getWooCommerceAuthHeaders(
    requestData.url,
    requestData.method,
    config.consumerKey,
    config.consumerSecret
  );

  try {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...oauthHeader,
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(url.toString(), {
      ...options,
      headers,
      credentials: 'omit', // Prevent CORS issues
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || 
        `API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw new Error('Failed to complete request. Please try again later.');
  }
}

/**
 * Get API configuration (excluding sensitive data)
 */
export function getApiConfig() {
  return {
    url: config.url,
    version: config.version
  };
}

/**
 * Get WooCommerce configuration 
 */
// Ensure this export is placed before any function that might depend on it
export function getWooConfig() {
  return { 
    url: config.url,
    consumerKey: config.consumerKey,
    consumerSecret: config.consumerSecret,
    version: config.version
  };
}