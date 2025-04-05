import type { Request, Response } from 'express';
import fetch from 'node-fetch';

/**
 * PDF Proxy API endpoint
 * 
 * This endpoint acts as a secure proxy for PDF files to avoid CORS issues.
 * It fetches the PDF from the source URL and returns it to the client.
 */
export default async function handler(req: Request, res: Response) {
  try {
    // Get the PDF URL from query parameters
    const { url } = req.query;

    // Validate required parameters
    if (!url) {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }

    console.log(`Proxying PDF request for: ${url}`);

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
    
    // Set access control headers to allow CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Set headers for the PDF
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    
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