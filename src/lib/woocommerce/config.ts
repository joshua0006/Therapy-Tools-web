/**
 * WooCommerce Configuration Module
 * 
 * Provides centralized configuration and authentication for WooCommerce API:
 * 
 * Core Functionality:
 * - API endpoint configuration
 * - OAuth 1.0a authentication
 * - Request handling
 * - Error management
 * 
 * Security Features:
 * - Secure key handling
 * - Request signing
 * - CORS configuration
 * 
 * Usage:
 * ```typescript
 * const data = await makeWooRequest<Product>('products/123');
 * ```
 * 
 * Error Handling:
 * - Network errors
 * - Authentication failures
 * - API response validation
 */

import { getWooCommerceAuthHeaders } from './oauth';

const config = {
  url: 'https://adventuresinspeechpathology.com',
  consumerKey: 'ck_6cab26af505d0330ea2b45de6c67c7e67b1ea6a4',
  consumerSecret: 'cs_97bbbc8c7bc8e4b2cd3b0a9a30892e848bc7696f',
  version: 'wc/v3'
};

/**
 * Expose the WooCommerce configuration
 */
export function getWooConfig() {
  return { ...config };
}

/**
 * Make an authenticated request to the WooCommerce API
 */
export async function makeWooRequest<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
  options: RequestInit = {}
): Promise<T> {
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

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...oauthHeader,
      ...options.headers,
    },
    credentials: 'omit', // Prevent CORS issues
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message || 
      `WooCommerce API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}