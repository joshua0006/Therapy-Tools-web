/**
 * WooCommerce OAuth Utility
 * 
 * Provides OAuth 1.0a authentication for WooCommerce API requests:
 * - Generates OAuth headers
 * - Handles signature creation
 * - Manages authentication parameters
 */

import OAuth from 'oauth-1.0a';
import CryptoJS from 'crypto-js';

/**
 * Generate OAuth headers for WooCommerce API requests
 * 
 * @param url - Full WooCommerce API URL
 * @param method - HTTP method (GET, POST, etc.)
 * @param consumerKey - WooCommerce consumer key
 * @param consumerSecret - WooCommerce consumer secret
 * @returns Object containing the Authorization header
 */
export function getWooCommerceAuthHeaders(
  url: string,
  method: string,
  consumerKey: string,
  consumerSecret: string
): { Authorization: string } {
  // Initialize OAuth with the required configuration
  const oauth = new OAuth({
    consumer: {
      key: consumerKey,
      secret: consumerSecret
    },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString: string, key: string) {
      return CryptoJS.HmacSHA1(baseString, key).toString(CryptoJS.enc.Base64);
    }
  });

  // Request data for OAuth authorization
  const requestData = {
    url,
    method
  };

  // Generate the OAuth header
  return oauth.toHeader(oauth.authorize(requestData));
}