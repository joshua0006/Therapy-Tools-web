import OAuth from 'oauth-1.0a';
import CryptoJS from 'crypto-js';

// Simple test function to verify imports work
export function testOAuthImports(): boolean {
  try {
    // Test OAuth initialization
    const oauth = new OAuth({
      consumer: {
        key: 'test-key',
        secret: 'test-secret'
      },
      signature_method: 'HMAC-SHA1',
      hash_function(baseString: string, key: string) {
        return CryptoJS.HmacSHA1(baseString, key).toString(CryptoJS.enc.Base64);
      }
    });
    
    // Test generating an OAuth header
    const requestData = {
      url: 'https://example.com/api',
      method: 'GET'
    };
    
    const header = oauth.toHeader(oauth.authorize(requestData));
    console.log('OAuth test successful:', header);
    return true;
  } catch (error) {
    console.error('OAuth test failed:', error);
    return false;
  }
} 