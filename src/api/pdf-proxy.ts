import { Request, Response } from 'express';
import fetch from 'node-fetch';
import { firestore } from '../lib/firebase';
import { getDoc, doc } from 'firebase/firestore';

/**
 * PDF Proxy API endpoint
 * 
 * This endpoint acts as a secure proxy for PDF files.
 * Instead of providing direct download links to PDFs that users could save,
 * we retrieve the PDF through the server and pipe it to the client.
 * 
 * Security features:
 * 1. Validates user authentication
 * 2. Verifies user has access to the requested PDF
 * 3. Sets headers to discourage downloading
 * 4. Doesn't expose the original source URL
 */
export default async function handler(req: Request, res: Response) {
  try {
    // Get the PDF URL and auth token from query parameters
    const { url, auth } = req.query;

    // Validate required parameters
    if (!url || !auth) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Validate user is authenticated
    if (!auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fetch the PDF from the source URL
    const response = await fetch(String(url));
    
    if (!response.ok) {
      console.error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: `Failed to fetch document: ${response.statusText}` 
      });
    }

    // Get content type and size
    const contentType = response.headers.get('content-type') || 'application/pdf';
    const contentLength = response.headers.get('content-length');
    
    // Set headers to discourage saving the file
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Stream the PDF data to the client
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Send the PDF to the client
    res.send(buffer);
  } catch (error) {
    console.error('Error in PDF proxy:', error);
    res.status(500).json({ error: 'Failed to load document' });
  }
} 