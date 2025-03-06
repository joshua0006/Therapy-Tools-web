/**
 * WooCommerce Security Module
 * 
 * Handles security-related functionality:
 * - URL encoding and obfuscation
 * - PDF URL protection
 */

import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'your-secret-key';

/**
 * Encrypt a URL with AES
 */
function encryptUrl(url: string): string {
  return CryptoJS.AES.encrypt(url, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt an encrypted URL
 */
function decryptUrl(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Generate a secure, encrypted URL for PDF access
 */
export function generateSecureUrl(originalUrl: string): string {
  if (!originalUrl) return '';
  
  const payload = JSON.stringify({
    url: originalUrl,
    exp: Date.now() + (3600 * 1000), // 1 hour expiry
  });
  
  const encrypted = encryptUrl(payload);
  const encoded = btoa(encrypted);
  
  return `/api/pdf/${encoded}`;
}

/**
 * Verify and decode a secure URL
 */
export function verifySecureUrl(encoded: string): string {
  try {
    const encrypted = atob(encoded);
    const decrypted = decryptUrl(encrypted);
    const payload = JSON.parse(decrypted);
    
    if (Date.now() > payload.exp) {
      throw new Error('URL has expired');
    }
    
    return payload.url;
  } catch (error) {
    console.error('Error verifying secure URL:', error);
    throw new Error('Invalid or expired URL');
  }
}