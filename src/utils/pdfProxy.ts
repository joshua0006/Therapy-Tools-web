import { getStorage, ref, getDownloadURL } from 'firebase/storage';

export async function getProxiedPdfUrl(url: string): Promise<string> {
  try {
    // If no URL provided, throw error
    if (!url) {
      throw new Error('No URL provided');
    }



    // If it's a WordPress URL, return it with cache buster
    if (url.includes('wp-content/uploads')) {
      // For WordPress URLs, try setting up a CORS proxy if needed
      // First try with a cache buster to avoid caching issues
      const directUrl = new URL(url);
      directUrl.searchParams.append('t', Date.now().toString());
      
      try {
        // Try a HEAD request to see if we can access the URL directly
        const response = await fetch(directUrl.toString(), { 
          method: 'HEAD',
          mode: 'no-cors' 
        });
      
        // If the response is OK, return the direct URL
        return directUrl.toString();
      } catch (error) {
       
        
        // If we can't access the URL directly, try with a CORS proxy
        // This is a fallback approach and assumes the PDF is publicly accessible
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        return proxyUrl;
      }
    }

    // If it's a Firebase Storage URL, get a fresh download URL
    if (url.includes('firebasestorage.googleapis.com')) {
      const storage = getStorage();
      
      // Extract the path from the URL
      const path = url.split('/o/')[1]?.split('?')[0];
      if (!path) {
        throw new Error('Invalid Firebase Storage URL');
      }
      
      // Decode the path and remove any leading/trailing slashes
      const decodedPath = decodeURIComponent(path).replace(/^\/+|\/+$/g, '');
      
      // Get a fresh download URL
      const fileRef = ref(storage, decodedPath);
      const downloadUrl = await getDownloadURL(fileRef);
      
      // Add cache control
      const urlWithParams = new URL(downloadUrl);
      urlWithParams.searchParams.append('t', Date.now().toString());
      
      return urlWithParams.toString();
    }
    
    // For other URLs, return as is with cache buster
    const urlObj = new URL(url);
    urlObj.searchParams.append('t', Date.now().toString());
    return urlObj.toString();
  } catch (error) {
    console.error('Error getting proxied PDF URL:', error);
    throw error;
  }
} 