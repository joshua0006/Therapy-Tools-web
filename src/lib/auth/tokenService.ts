/**
 * Token Service
 * Handles JWT token management and authentication
 */

const TOKEN_KEY = 'auth_token';

/**
 * Get the authentication token from storage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Set the authentication token in storage
 */
export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove the authentication token from storage
 */
export function removeAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if the token is valid
 */
export function isTokenValid(token: string): boolean {
  try {
    if (!token) return false;
    
    // Decode the token (JWT structure: header.payload.signature)
    const [, payload] = token.split('.');
    if (!payload) return false;
    
    const decodedPayload = JSON.parse(atob(payload));
    const expirationTime = decodedPayload.exp * 1000; // Convert to milliseconds
    
    return Date.now() < expirationTime;
  } catch {
    return false;
  }
}

/**
 * Get user information from token
 */
export function getUserFromToken(): any | null {
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/**
 * Refresh the authentication token
 */
export async function refreshToken(): Promise<string | null> {
  const currentToken = getAuthToken();
  if (!currentToken) return null;
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const { token } = await response.json();
    setAuthToken(token);
    return token;
  } catch {
    removeAuthToken();
    return null;
  }
} 