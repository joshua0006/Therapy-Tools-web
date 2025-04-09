/**
 * Email Service
 * 
 * This service provides functionality to send emails.
 */

// First try Netlify functions, then fallback to local API server
const NETLIFY_FUNCTIONS_URL = '/.netlify/functions';
const LOCAL_API_URL = 'http://localhost:3002/api';

// Timeout for API requests to prevent UI hanging
const API_TIMEOUT = 28000; // 28 seconds (just under Netlify's 30s limit)

/**
 * Creates a promise that rejects after a specified timeout
 */
function timeoutPromise(ms: number, message: string) {
  return new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${message}`)), ms);
  });
}

/**
 * Fetches with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Checks if the API server is running and available
 * @returns A promise that resolves to a boolean indicating if the server is available
 */
export async function checkApiServerStatus(): Promise<boolean> {
  try {
    // Try Netlify functions first
    try {
      console.log('Checking Netlify functions availability...');
      const netlifyEndpoint = `${NETLIFY_FUNCTIONS_URL}/send-pdf-pages`;
      const response = await fetchWithTimeout(
        netlifyEndpoint, 
        {
          method: 'OPTIONS',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        5000 // 5 second timeout for OPTIONS request
      );
      
      if (response.ok) {
        console.log('✅ Netlify functions are available');
        return true;
      }
    } catch (error) {
      console.warn('❌ Netlify functions check failed, trying local API server', error);
    }
    
    // Try local API server as fallback
    console.log('Checking local API server availability...');
    const localEndpoint = `${LOCAL_API_URL}/send-pdf-pages`;
    const response = await fetchWithTimeout(
      localEndpoint,
      {
        method: 'OPTIONS',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      5000 // 5 second timeout
    );
    
    if (response.ok) {
      console.log('✅ Local API server is available');
      return true;
    }
    
    console.warn('❌ All server checks failed');
    return false;
  } catch (error) {
    console.warn('❌ API server check failed:', error);
    return false;
  }
}

/**
 * Determines the best available endpoint to use
 * @returns A promise that resolves to the API endpoint to use
 */
async function getApiEndpoint(): Promise<string> {
  try {
    // Try Netlify functions first
    try {
      const netlifyEndpoint = `${NETLIFY_FUNCTIONS_URL}/send-pdf-pages`;
      const response = await fetchWithTimeout(
        netlifyEndpoint,
        {
          method: 'OPTIONS',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        5000 // 5 second timeout
      );
      
      if (response.ok) {
        console.log('Using Netlify functions endpoint');
        return netlifyEndpoint;
      }
    } catch (error) {
      console.warn('Netlify functions not available');
    }
    
    // Try local API server as fallback
    const localEndpoint = `${LOCAL_API_URL}/send-pdf-pages`;
    const response = await fetchWithTimeout(
      localEndpoint,
      {
        method: 'OPTIONS',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      5000 // 5 second timeout
    );
    
    if (response.ok) {
      console.log('Using local API server endpoint');
      return localEndpoint;
    }
    
    // Default to Netlify functions as a last resort
    console.warn('All endpoint checks failed. Defaulting to Netlify functions.');
    return `${NETLIFY_FUNCTIONS_URL}/send-pdf-pages`;
  } catch (error) {
    console.warn('Endpoint determination failed:', error);
    return `${NETLIFY_FUNCTIONS_URL}/send-pdf-pages`;
  }
}

/**
 * Sends selected PDF pages via email
 * 
 * @param email - The recipient's email address
 * @param productId - The ID of the product
 * @param pdfUrl - The URL of the PDF
 * @param pdfName - The name of the PDF
 * @param selectedPages - Array of page numbers to send
 * @param pageImages - Array of base64-encoded page images to attach
 * @returns A promise that resolves when the email is sent
 */
export async function sendPdfPagesViaEmail(
  email: string,
  productId: string,
  pdfUrl?: string,
  pdfName?: string,
  selectedPages: number[] = [],
  pageImages: string[] = []
): Promise<{ success: boolean; message: string }> {
  try {
    // Log the request
    console.log('📧 Sending PDF pages via email...');
    console.log('Email:', email);
    console.log('Product:', productId);
    console.log('Pages:', selectedPages);
    console.log('Images provided:', pageImages ? 'Yes' : 'No');
    
    // Limit the number of images to prevent timeouts
    let optimizedPageImages: string[] = [];
    if (pageImages && pageImages.length > 0) {
      // Only include the first 3 images to prevent timeouts
      optimizedPageImages = pageImages.slice(0, 3);
      if (optimizedPageImages.length < pageImages.length) {
        console.log(`⚠️ Limited images from ${pageImages.length} to ${optimizedPageImages.length} to prevent timeouts`);
      }
    }
    
    // Dynamic endpoint determination
    const endpoint = await getApiEndpoint();
    console.log('Using endpoint:', endpoint);
    
    // Prepare the request payload
    const payload = {
      email,
      productId,
      pdfUrl,
      pdfName,
      selectedPages,
      pageImages: optimizedPageImages
    };
    
    // Send the email request with timeout protection
    const emailRequestPromise = fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      API_TIMEOUT
    );
    
    // Wait for the email request to complete or timeout
    console.log('Sending email request with timeout protection...');
    const response = await emailRequestPromise;
    
    // Handle the response
    const text = await response.text();
    console.log('API Response Status:', response.status);
    
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      console.error('Failed to parse API response:', error);
      // Check if it's a timeout error from netlify function
      if (text.includes('Task timed out after') && text.includes('TimeoutError')) {
        throw new Error('Email server took too long to respond. Please try again with fewer pages.');
      }
      throw new Error(`Invalid response from email server: ${text}`);
    }
    
    // Check if the request was successful
    if (!response.ok) {
      throw new Error(data?.error || data?.message || `Failed to send email (Status: ${response.status})`);
    }
    
    return {
      success: true,
      message: data.message || 'Email sent successfully'
    };
  } catch (error: unknown) {
    console.error('Error sending email:', error);
    
    // Provide better error messages based on error type
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return {
        success: false,
        message: 'Unable to connect to email server. Please ensure the API server is running.'
      };
    }
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        success: false,
        message: 'Email request timed out. Please try again with fewer pages.'
      };
    }
    
    // Handle timeout errors with a friendly message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error sending email';
    if (errorMessage.includes('timed out') || errorMessage.includes('timeout')) {
      return {
        success: false,
        message: 'Email server took too long to respond. Please try with fewer pages or try again later.'
      };
    }
    
    return {
      success: false,
      message: errorMessage
    };
  }
} 