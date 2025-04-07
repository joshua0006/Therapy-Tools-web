/**
 * Email Service
 * 
 * This service provides functionality to send emails.
 */

// Use environment variables for API URL or default to relative URL in production
const API_URL = import.meta.env.DEV 
  ? 'http://localhost:3002' 
  : '/.netlify/functions';

/**
 * Checks if the API server is running and available
 * @returns A promise that resolves to a boolean indicating if the server is available
 */
export async function checkApiServerStatus(): Promise<boolean> {
  try {
    const endpoint = import.meta.env.DEV
      ? `${API_URL}/api/send-pdf-pages`
      : `${API_URL}/send-pdf-pages`;
      
    const response = await fetch(endpoint, {
      method: 'OPTIONS',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.ok;
  } catch (error) {
    console.warn('API server check failed:', error);
    return false;
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
    console.log('Sending PDF pages via email...');
    console.log('Email:', email);
    console.log('Product:', productId);
    console.log('Pages:', selectedPages);
    console.log('Images provided:', pageImages.length > 0);
    
    // Check if the server is available first
    const isServerAvailable = await checkApiServerStatus();
    if (!isServerAvailable) {
      throw new TypeError('Failed to fetch: API server is not running or unavailable');
    }
    
    // Determine the correct endpoint based on environment
    const endpoint = import.meta.env.DEV
      ? `${API_URL}/api/send-pdf-pages`
      : `${API_URL}/send-pdf-pages`;
    
    // Send via the API server
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        productId,
        pdfUrl,
        pdfName,
        selectedPages,
        pageImages
      }),
    });
    
    // Handle the response properly
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      console.error('Failed to parse API response:', error);
      throw new Error('Invalid response from email server');
    }
    
    // Check if the request was successful
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Failed to send email');
    }
    
    return {
      success: true,
      message: data.message || 'Email sent successfully'
    };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Provide better error messages based on error type
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return {
        success: false,
        message: 'Unable to connect to email server. Please ensure the API server is running.'
      };
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending email'
    };
  }
} 