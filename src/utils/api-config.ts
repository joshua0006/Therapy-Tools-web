/**
 * API Configuration Utility
 * 
 * This module centralizes API URL configuration and makes it environment-aware.
 * In production, the API would typically be at the same domain.
 * In development, we need to specify the full URL including the port.
 */

// Detect current hostname and port
const currentHost = window.location.hostname;
const currentPort = window.location.port;

// Get the base API URL from environment variables or use the default
const API_BASE_URL = 
  import.meta.env.VITE_API_SERVER_URL || 
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

/**
 * Gets the full API URL for a given endpoint
 * 
 * @param endpoint - The API endpoint path (e.g., '/send-pdf-pages')
 * @returns The full URL to the API endpoint
 */
export function getApiUrl(endpoint: string): string {
  // Ensure the endpoint starts with a slash
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // In development, use the full URL with port
  if (import.meta.env.DEV) {
    // Detect current hostname and port for more reliable CORS compatibility
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      return `${API_BASE_URL}/api${normalizedEndpoint}`;
    }
    return `${API_BASE_URL}/api${normalizedEndpoint}`;
  }
  
  // In production, use a relative URL
  return `/api${normalizedEndpoint}`;
}

/**
 * Helper function to create a standard fetch request to the API
 * 
 * @param endpoint - The API endpoint path
 * @param options - Fetch options
 * @returns The fetch Promise
 */
export function fetchApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
  // Log the API request for debugging
  console.log(`Making API request to: ${getApiUrl(endpoint)}`);
  
  return fetch(getApiUrl(endpoint), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Origin': window.location.origin,
      ...options.headers,
    },
    // Include credentials for CORS
    credentials: 'include',
  });
} 