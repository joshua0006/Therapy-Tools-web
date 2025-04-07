// API endpoint for sending PDF page images via email (CommonJS version)
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const { fromPath } = require('pdf2pic');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { doc, setDoc } = require('firebase/firestore');
const { app, db } = require('./firebase.cjs');

/**
 * Processes PDF pages and sends them via email
 * 
 * This endpoint:
 * 1. Downloads the PDF from the provided URL
 * 2. Converts selected pages to images using pdf2pic
 * 3. Sends the images as email attachments to the provided email address
 * 4. Creates a unique link for viewing selected pages online
 */
async function handler(req, res) {
  // Set CORS headers for preflight requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests for actual operations
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are supported.' });
  }

  // Create temporary directory for downloads and conversions
  const tempDir = path.join(os.tmpdir(), `pdf-email-${uuidv4()}`);
  const pdfPath = path.join(tempDir, 'document.pdf');
  let createdTempDir = false;
  
  try {
    const { email, productId, pdfUrl, pdfName, selectedPages, pageImages } = req.body;
    
    console.log('Received request:', {
      email,
      productId,
      pdfName,
      selectedPages,
      pdfUrlProvided: !!pdfUrl,
      imagesProvided: !!pageImages && Array.isArray(pageImages) && pageImages.length > 0
    });

    // Validate required parameters
    if (!email) {
      return res.status(400).json({ error: 'Missing email address' });
    }
    
    if (!selectedPages || !Array.isArray(selectedPages) || selectedPages.length === 0) {
      return res.status(400).json({ error: 'No pages selected' });
    }

    // Generate a unique ID for this selection
    const selectionId = uuidv4();
    
    // Create a secure access URL for viewing the pages
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const viewUrl = `${baseUrl}/view/${selectionId}`;
    
    // Store the selection information in Firebase
    try {
      await setDoc(doc(db, 'pageSelections', selectionId), {
        email,
        productId,
        pdfUrl,
        pdfName,
        selectedPages,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days expiration
        accessCount: 0
      });
      
      console.log(`Created page selection record with ID: ${selectionId}`);
    } catch (dbError) {
      console.error('Failed to store selection data:', dbError);
      // Continue with email sending even if DB storage fails
    }

    // Create temporary directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      createdTempDir = true;
      console.log(`Created temporary directory: ${tempDir}`);
    }

    let attachments = [];
    
    // If client sent pre-rendered page images, use those
    if (pageImages && Array.isArray(pageImages) && pageImages.length > 0) {
      console.log(`Using ${pageImages.length} pre-rendered page images from client`);
      
      // Convert from base64 to files and add as attachments
      for (let i = 0; i < pageImages.length; i++) {
        const pageNum = selectedPages[i] || i + 1;
        const imgData = pageImages[i];
        
        if (!imgData) continue;
        
        // Save base64 image to a file
        const imgPath = path.join(tempDir, `page-${pageNum}.png`);
        const base64Data = imgData.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(imgPath, Buffer.from(base64Data, 'base64'));
        
        // Add to attachments
        attachments.push({
          filename: `page-${pageNum}.png`,
          path: imgPath,
          cid: `page-${pageNum}@pdf` // Content ID for embedding in HTML
        });
      }
      
      console.log(`Created ${attachments.length} image attachments from client-provided images`);
    }
    // If PDF URL is provided but no pre-rendered images, download and convert the PDF
    else if (pdfUrl) {
      console.log(`Downloading PDF from: ${pdfUrl}`);
      
      // Download the PDF
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
      }
      
      const pdfBuffer = await pdfResponse.buffer();
      console.log(`PDF downloaded successfully: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
      
      fs.writeFileSync(pdfPath, pdfBuffer);
      console.log(`PDF saved to: ${pdfPath}`);
      
      // Set up PDF to PNG conversion
      const pdf2picOptions = {
        quality: 100,       // Increase quality to maximum
        density: 300,       // Increase DPI for higher resolution
        format: "png",
        width: 2000,        // Increase width for higher resolution
        height: 2000,       // Increase height for higher resolution
        savePath: tempDir
      };
      
      console.log(`Configuring PDF to image conversion with high-quality settings:`, pdf2picOptions);
      const converter = fromPath(pdfPath, pdf2picOptions);
      
      // Convert selected pages
      console.log(`Converting ${selectedPages.length} pages to images...`);
      
      for (const pageNum of selectedPages) {
        try {
          console.log(`Converting page ${pageNum}...`);
          const result = await converter.convert(pageNum);
          
          const imgPath = result.path;
          console.log(`Generated image: ${imgPath}`);
          
          // Add to attachments
          attachments.push({
            filename: `page-${pageNum}.png`,
            path: imgPath,
            cid: `page-${pageNum}@pdf` // Content ID for embedding in HTML
          });
        } catch (pageErr) {
          console.error(`Failed to convert page ${pageNum}:`, pageErr);
        }
      }
      
      console.log(`Successfully converted ${attachments.length} pages to images`);
    } else {
      console.log('No PDF URL or images provided, sending email without attachments');
    }
    
    // Configure email transporter with environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (smtpError) {
      console.error('❌ SMTP verification failed:', smtpError);
      return res.status(500).json({ 
        error: `Email server configuration error: ${smtpError.message}` 
      });
    }
    
    // Prepare plain text version with more details
    const plainTextContent = `
===============================================================
                YOUR SELECTED PDF PAGES
===============================================================

Hello!

We're sending you the pages you selected from "${pdfName || 'Document'}".

SELECTED PAGES: ${selectedPages.sort((a, b) => a - b).join(', ')}

---------------------------------------------------------------
                   VIEW PAGES ONLINE
---------------------------------------------------------------

We've created an online viewer where you can:

✓ View high-quality images of your selected pages
✓ Download individual pages as needed
✓ Access anytime for the next 7 days

>> VIEW YOUR PAGES ONLINE:
   ${viewUrl}

>> DOWNLOAD ALL PAGES DIRECTLY:
   ${viewUrl}?download=all

NOTE: These links will expire on ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}.

---------------------------------------------------------------

Thank you for using our service!

If you have any questions, just reply to this email.
===============================================================
`;

    // Prepare email content with attachments if available
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Therapy Tools" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Selected Pages from ${pdfName || 'Document'}`,
      text: plainTextContent,
      html: `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Selected PDF Pages</title>
</head>
<body style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0; padding: 0; width: 100%; background-color: #f8f9fa;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="border: 0; width: 100%; margin: 0; padding: 0; background-color: #f8f9fa;">
    <tr>
      <td>
        <table role="presentation" cellpadding="0" cellspacing="0" style="border: 0; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
          <tr>
            <td style="background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <h1 style="color: #4F46E5; margin-top: 0; margin-bottom: 20px; font-size: 24px;">Your Selected PDF Pages</h1>
                    <p style="margin-top: 0; margin-bottom: 10px; color: #333333; font-size: 16px;">
                      Here are the pages you selected from <strong>"${pdfName || 'Document'}"</strong>:
                    </p>
                    <p style="margin-top: 0; margin-bottom: 25px; color: #333333; font-size: 16px;">
                      <strong>Pages:</strong> ${selectedPages.sort((a, b) => a - b).join(', ')}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Online Access Section -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px; background-color: #F3F4FD; border: 1px solid #D4D7FF; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="padding-bottom: 15px;">
                          <img src="https://img.icons8.com/color/48/000000/document-page.png" alt="Document Pages" style="width: 48px; height: 48px; display: block; margin: 0 auto 10px auto;">
                          <h2 style="color: #4F46E5; margin-top: 0; margin-bottom: 5px; font-size: 20px;">View Your Selected Pages Online</h2>
                          <p style="margin-top: 0; margin-bottom: 0; color: #4B5563; font-size: 15px;">Pages ${selectedPages.sort((a, b) => a - b).join(', ')} from "${pdfName || 'Document'}"</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px; background-color: white; border-radius: 6px; border: 1px solid #E5E7EB;">
                          <p style="margin-top: 0; margin-bottom: 10px; color: #374151;">
                            <strong>✓ View high-quality images of your selected pages</strong>
                          </p>
                          <p style="margin-top: 0; margin-bottom: 10px; color: #374151;">
                            <strong>✓ Download individual pages as needed</strong>
                          </p>
                          <p style="margin-top: 0; margin-bottom: 0; color: #374151;">
                            <strong>✓ Access anytime for the next 7 days</strong>
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 20px;">
                          <!-- Primary Button -->
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                            <tr>
                              <td style="background-color: #4F46E5; border-radius: 6px; text-align: center;">
                                <a href="${viewUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; color: #ffffff; font-weight: bold; font-size: 16px; text-decoration: none;">View Pages Online</a>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Secondary Button -->
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 15px auto 0 auto;">
                            <tr>
                              <td style="background-color: #10B981; border-radius: 6px; text-align: center;">
                                <a href="${viewUrl}?download=all" target="_blank" style="display: inline-block; padding: 10px 20px; color: #ffffff; font-weight: bold; font-size: 14px; text-decoration: none;">Download All Pages</a>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="color: #6B7280; font-size: 13px; margin-top: 15px; font-style: italic;">
                            This secure link will expire on ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 15px; border-top: 1px solid #E5E7EB; text-align: center;">
                          <p style="color: #4B5563; font-size: 14px; margin-top: 0; margin-bottom: 5px;">
                            If the buttons don't work, copy and paste this link into your browser:
                          </p>
                          <p style="word-break: break-all; color: #4F46E5; font-size: 13px; margin-top: 0; margin-bottom: 0;">
                            ${viewUrl}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Page Images Section -->
              ${attachments.length > 0 ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <h2 style="color: #4F46E5; margin-top: 0; margin-bottom: 20px; font-size: 20px;">High-Quality Page Images:</h2>
                    ${attachments.map((att, index) => `
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 25px;">
                      <tr>
                        <td>
                          <p style="margin-top: 0; margin-bottom: 10px; font-weight: bold; color: #333333;">Page ${selectedPages[index] || index + 1}</p>
                          <img src="cid:${att.cid}" alt="Page ${selectedPages[index] || index + 1}" style="max-width: 100%; display: block; border: 1px solid #E5E7EB; border-radius: 8px;">
                        </td>
                      </tr>
                    </table>
                    `).join('')}
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Footer -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; border-top: 1px solid #E5E7EB; padding-top: 20px;">
                <tr>
                  <td>
                    <p style="color: #6B7280; font-size: 14px; margin: 0;">Thank you for using our service!</p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      attachments: attachments
    };
    
    // Send the email
    console.log(`Sending email to ${email} with ${attachments.length} attachments...`);
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent: ${info.messageId}`);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      return res.status(500).json({ 
        error: `Failed to send email: ${emailError.message}` 
      });
    }
    
    // Return success response
    return res.status(200).json({ 
      success: true, 
      message: `Email sent successfully to ${email} with ${attachments.length} page images`,
      details: {
        email,
        pages: selectedPages,
        viewUrl,
        selectionId,
        sentAt: new Date().toISOString(),
        imagesAttached: attachments.length
      }
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ 
      error: `Failed to process request: ${error.message}` 
    });
  } finally {
    // Clean up temporary files
    if (createdTempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`Cleaned up temporary directory: ${tempDir}`);
      } catch (cleanupErr) {
        console.error('Error cleaning up temporary directory:', cleanupErr);
      }
    }
  }
}

module.exports = handler; 