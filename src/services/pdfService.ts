// No need to import pdfjs directly anymore as we're handling it in pdfWorkerInitializer.ts

/**
 * Get the base URL of the current page
 */
const getBaseUrl = () => {
  return window.location.origin;
};

/**
 * Options for configuring the PDF document - updated for react-pdf v9.x
 */
export const pdfViewerOptions = {
  // Use consistent URLs that include the origin
  cMapUrl: `${getBaseUrl()}/pdf/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${getBaseUrl()}/pdf/standard_fonts/`,
  // Use our locally copied worker file
  workerSrc: `${getBaseUrl()}/pdf/pdf.worker.min.mjs`
};

// Track failed proxy attempts to enable fallback logic
let lastFailedProxy: string | null = null;

// Define an array of proxy services to try in order
const PROXY_SERVICES = [
  {
    id: 'corsproxy.io',
    url: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`
  },
  {
    id: 'cors.bridged.cc',
    url: (url: string) => `https://cors.bridged.cc/${url}`
  },
  {
    id: 'thingproxy',
    url: (url: string) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`
  }
];

/**
 * Fetch a PDF directly as binary data to bypass CORS
 * @param url The URL of the PDF to fetch
 * @returns Promise containing an ArrayBuffer of the PDF data
 */
export async function fetchPdfAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  console.log(`[pdfService] Fetching PDF from: ${url}`);
  
  // Try different methods to fetch the PDF
  const methods = [
    // Method 1: Direct fetch with credentials
    async () => {
      console.log("[pdfService] Trying direct fetch with credentials");
      return fetch(url, { 
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        headers: new Headers({
          'Accept': 'application/pdf'
        })
      });
    },
    
    // Method 2: Direct fetch without credentials
    async () => {
      console.log("[pdfService] Trying direct fetch without credentials");
      return fetch(url, { 
        method: 'GET',
        mode: 'cors',
        headers: new Headers({
          'Accept': 'application/pdf'
        })
      });
    },
    
    // Method 3: Try with a corsproxy.io
    async () => {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      console.log(`[pdfService] Trying corsproxy.io: ${proxyUrl}`);
      return fetch(proxyUrl, { 
        method: 'GET',
        headers: new Headers({
          'Accept': 'application/pdf'
        })
      });
    },
    
    // Method 4: Try with JSONP proxy (as last resort)
    async () => {
      const proxyUrl = `https://cors.bridged.cc/${url}`;
      console.log(`[pdfService] Trying cors.bridged.cc: ${proxyUrl}`);
      return fetch(proxyUrl, {
        method: 'GET',
        headers: new Headers({
          'Accept': 'application/pdf'
        })
      });
    }
  ];
  
  // Try each method in sequence until one works
  let lastError: Error | undefined;
  for (let i = 0; i < methods.length; i++) {
    try {
      const method = methods[i];
      console.log(`[pdfService] Trying fetch method ${i+1}/${methods.length}`);
      
      const response = await method();
      if (!response.ok) {
        console.warn(`[pdfService] Fetch attempt returned status ${response.status}`);
        continue;
      }
      
      console.log(`[pdfService] Successful response from method ${i+1}, getting array buffer`);
      
      // Get the array buffer
      const originalBuffer = await response.arrayBuffer();
      console.log(`[pdfService] Got ArrayBuffer of size: ${originalBuffer.byteLength} bytes`);
      
      // Create a fresh copy to prevent detachment issues
      try {
        // This is crucial to avoid "Cannot perform Construct on a detached ArrayBuffer" errors
        const bufferCopy = originalBuffer.slice(0);
        console.log(`[pdfService] Created buffer copy of size: ${bufferCopy.byteLength} bytes`);
        
        // Verify the copy is valid
        if (bufferCopy.byteLength === 0) {
          console.warn(`[pdfService] Warning: Zero-sized buffer copy created`);
          
          // Try a different approach to copy the buffer
          const uint8Array = new Uint8Array(originalBuffer);
          const secondBufferCopy = uint8Array.buffer.slice(0);
          
          if (secondBufferCopy.byteLength > 0) {
            console.log(`[pdfService] Alternative copy method successful: ${secondBufferCopy.byteLength} bytes`);
            return secondBufferCopy;
          } else {
            throw new Error('Failed to create valid buffer copy');
          }
        }
        
        // Success! Return the copied array buffer
        return bufferCopy;
      } catch (copyError) {
        console.error(`[pdfService] Error copying buffer:`, copyError);
        throw copyError;
      }
    } catch (err) {
      console.warn(`[pdfService] Fetch method ${i+1} failed:`, err);
      lastError = err as Error;
    }
  }
  
  // If all methods fail, throw a clear error with details
  const errorMessage = lastError?.message || 'Unknown error';
  console.error(`[pdfService] All fetch methods failed. Last error: ${errorMessage}`);
  throw new Error(`Failed to fetch PDF: ${errorMessage}. Please try again or check your connection.`);
}

/**
 * Convert a remote PDF URL to use a proxy if needed
 * @param url The original PDF URL
 * @returns Proxied URL if needed
 */
export function getProxiedPdfUrl(url: string): string {
  // Skip if already using a proxy
  if (url.includes('corsproxy.io') || url.includes('cors-anywhere') || 
      url.includes('thingproxy.freeboard.io') || url.includes('cors.bridged.cc')) {
    return url;
  }
  
  // Skip for data URLs
  if (url.startsWith('data:')) {
    return url;
  }
  
  // Add cache buster to prevent browser caching
  const urlWithTimestamp = addCacheBuster(url);
  
  // For external URLs that might have CORS issues, use a proxy
  if (isExternalUrl(urlWithTimestamp)) {
    // Choose the first proxy service that hasn't failed recently
    const proxyService = PROXY_SERVICES.find(proxy => proxy.id !== lastFailedProxy) || PROXY_SERVICES[0];
    return proxyService.url(urlWithTimestamp);
  }
  
  return urlWithTimestamp;
}

/**
 * Handle proxy failures and try alternative proxies
 * @param failedProxyUrl The proxy URL that failed
 * @param originalUrl The original URL without proxy
 * @returns A new proxy URL to try
 */
export function handleProxyFailure(failedProxyUrl: string, originalUrl: string): string {
  // Identify which proxy failed
  let failedProxyId = null;
  
  for (const proxy of PROXY_SERVICES) {
    if (failedProxyUrl.includes(proxy.id)) {
      failedProxyId = proxy.id;
      break;
    }
  }
  
  if (failedProxyId) {
    lastFailedProxy = failedProxyId;
    console.warn(`Proxy ${failedProxyId} failed, trying another proxy`);
    
    // Find the next proxy that isn't the one that just failed
    const nextProxy = PROXY_SERVICES.find(proxy => proxy.id !== failedProxyId);
    
    if (nextProxy) {
      return nextProxy.url(originalUrl);
    }
  }
  
  // If we can't identify the failed proxy or all proxies failed, reset and try the first one again
  lastFailedProxy = null;
  return PROXY_SERVICES[0].url(originalUrl);
}

/**
 * Add a timestamp to URL to prevent caching
 */
function addCacheBuster(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.append('t', Date.now().toString());
    return urlObj.toString();
  } catch (e) {
    // If URL parsing fails, just append timestamp
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
  }
}

/**
 * Check if a URL is external to the current origin
 */
function isExternalUrl(url: string): boolean {
  try {
    const currentOrigin = window.location.origin;
    const urlOrigin = new URL(url).origin;
    return currentOrigin !== urlOrigin;
  } catch (e) {
    return true;
  }
} 