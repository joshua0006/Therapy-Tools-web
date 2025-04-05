// API endpoint for sending PDF page images via email
const express = require('express');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const pdf2pic = require('pdf2pic');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

/**
 * Processes PDF pages and sends them via email
 * 
 * This endpoint:
 * 1. Downloads the PDF from the provided URL
 * 2. Converts selected pages to images using pdf2pic
 * 3. Sends the images as email attachments to the provided email address
 */
async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are supported.' });
  }

  try {
    const { email, productId, pdfUrl, pdfName, selectedPages } = req.body;

    // Validate required parameters
    if (!email) {
      return res.status(400).json({ error: 'Missing email address' });
    }
    if (!pdfUrl) {
      return res.status(400).json({ error: 'Missing PDF URL' });
    }
    if (!selectedPages || !Array.isArray(selectedPages) || selectedPages.length === 0) {
      return res.status(400).json({ error: 'No pages selected' });
    }

    // Log the request
    console.log(`Processing PDF request for ${selectedPages.length} pages from ${pdfName || pdfUrl}`);
    console.log(`Selected pages: ${selectedPages.join(', ')}`);
    
    // Create a unique ID and temp directory for this job
    const jobId = uuidv4();
    const tempDir = path.join(os.tmpdir(), `pdf-pages-${jobId}`);
    
    // Create the temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Download the PDF
    console.log(`Downloading PDF from: ${pdfUrl}`);
    const response = await fetch(pdfUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      return res.status(500).json({ 
        error: `Failed to fetch PDF: ${response.statusText}` 
      });
    }
    
    // Save PDF to temp file
    const pdfBuffer = await response.buffer();
    const pdfFilePath = path.join(tempDir, 'document.pdf');
    fs.writeFileSync(pdfFilePath, pdfBuffer);
    
    // Set up pdf2pic converter
    const pdf2picOptions = {
      density: 150,           // Higher density = better quality
      savePath: tempDir,      // Save in temp directory
      saveFilename: "page",   // Base filename for output
      format: "png",          // Output format
      width: 800,             // Output width in pixels
      height: 1200,           // Output height in pixels (adjust for page proportions)
    };
    
    // Create converter for our file
    const converter = new pdf2pic.fromPath(pdfFilePath, pdf2picOptions);
    
    // Array to store paths to generated image files
    const imageFiles = [];
    
    // Convert each selected page to an image
    for (const pageNum of selectedPages) {
      console.log(`Converting page ${pageNum} to image...`);
      const pageResult = await converter.convert(pageNum);
      
      if (pageResult && pageResult.path) {
        imageFiles.push(pageResult.path);
        console.log(`Saved image for page ${pageNum} to ${pageResult.path}`);
      } else {
        console.warn(`Failed to convert page ${pageNum} to image`);
      }
    }
    
    if (imageFiles.length === 0) {
      throw new Error('Failed to convert any pages to images');
    }
    
    // Configure email transporter
    // Note: In production, use proper credentials and secure settings
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASS || 'password',
      },
    });
    
    // Prepare email attachments
    const attachments = imageFiles.map((filePath, index) => {
      const pageNum = selectedPages[index];
      return {
        filename: `${pdfName || 'document'}-page-${pageNum}.png`,
        path: filePath,
        contentType: 'image/png',
      };
    });
    
    // Prepare email content
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@therapytools.example.com',
      to: email,
      subject: `PDF Pages from ${pdfName || 'Document'}`,
      text: `Here are the ${selectedPages.length} page(s) you requested from "${pdfName || 'Document'}".\n\nPages: ${selectedPages.join(', ')}\n\nThank you for using our service!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Your Requested PDF Pages</h2>
          <p>Here are the ${selectedPages.length} page(s) you requested from <strong>"${pdfName || 'Document'}"</strong>.</p>
          <p><strong>Pages:</strong> ${selectedPages.join(', ')}</p>
          <p>The pages are attached as PNG images to this email.</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
          <p style="color: #6B7280; font-size: 14px;">Thank you for using our service!</p>
        </div>
      `,
      attachments: attachments,
    };
    
    // Send the email
    console.log(`Sending email to ${email} with ${attachments.length} attachments...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    
    // Clean up temp files
    console.log('Cleaning up temporary files...');
    imageFiles.forEach(file => {
      try {
        fs.unlinkSync(file);
      } catch (err) {
        console.warn(`Failed to delete temp file ${file}:`, err);
      }
    });
    
    // Try to remove the PDF file
    try {
      fs.unlinkSync(pdfFilePath);
    } catch (err) {
      console.warn(`Failed to delete temp PDF file:`, err);
    }
    
    // Try to remove the temp directory
    try {
      fs.rmdirSync(tempDir);
    } catch (err) {
      console.warn(`Failed to remove temp directory:`, err);
    }
    
    // Return success response
    return res.status(200).json({ 
      success: true, 
      message: `PDF pages sent successfully to ${email}`,
      details: {
        pages: selectedPages,
        totalImages: imageFiles.length
      }
    });
    
  } catch (error) {
    console.error('Error processing PDF pages:', error);
    return res.status(500).json({ 
      error: `Failed to process PDF pages: ${error.message}` 
    });
  }
}

module.exports = handler; 