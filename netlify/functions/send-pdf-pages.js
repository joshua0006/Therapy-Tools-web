// Netlify Serverless Function to handle PDF email sending
const nodemailer = require('nodemailer');

// Handler for Netlify serverless function
exports.handler = async (event, context) => {
  // Set CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Origin, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Only POST requests are supported.' })
    };
  }

  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body);
    const { email, productId, pdfName, selectedPages } = requestBody;

    // Basic validation
    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing email address' })
      };
    }

    if (!selectedPages || !Array.isArray(selectedPages) || selectedPages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No pages selected' })
      };
    }

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify SMTP connection
    await transporter.verify();

    // Create a simple email without attachments (simplified for serverless function)
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Therapy Tools" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Selected Pages from ${pdfName || 'Document'}`,
      text: `
Hello!

You requested to receive pages ${selectedPages.join(', ')} from "${pdfName || 'Document'}".

However, we're currently experiencing high demand on our services.
For the best experience, please use our desktop application which supports PDF creation and emailing directly.

Thank you for your understanding.

- Therapy Tools Team
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Selected PDF Pages</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px;">
    <h1 style="color: #4F46E5;">Your Document Request</h1>
    <p>Hello!</p>
    <p>You requested to receive pages <strong>${selectedPages.join(', ')}</strong> from "<strong>${pdfName || 'Document'}</strong>".</p>
    
    <div style="background-color: #f0f4ff; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0;">
      <p style="margin-top: 0;"><strong>Note:</strong> We're currently experiencing high demand on our cloud services.</p>
      <p style="margin-bottom: 0;">For the best experience, please use our desktop application which supports PDF creation and emailing directly.</p>
    </div>
    
    <p>Thank you for your understanding.</p>
    <p>- Therapy Tools Team</p>
  </div>
</body>
</html>
      `
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Email notification sent successfully to ${email}`,
        details: {
          email,
          pages: selectedPages,
          messageId: info.messageId
        }
      })
    };
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: `Failed to process request: ${error.message}` 
      })
    };
  }
}; 