// Netlify Serverless Function to handle PDF email sending
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;
let mockFirestore = null;

const initializeFirebase = () => {
  if (firebaseInitialized) {
    return admin.firestore();
  }
  
  // Check if we have the required Firebase credentials
  const hasCredentials = process.env.FIREBASE_PROJECT_ID && 
                         process.env.FIREBASE_PRIVATE_KEY && 
                         process.env.FIREBASE_CLIENT_EMAIL;

  if (!hasCredentials) {
    console.log('Firebase credentials not found. Using mock Firestore for development.');
    // Create a mock Firestore implementation for development/testing
    if (!mockFirestore) {
      const mockSessions = {};
      
      mockFirestore = {
        collection: () => ({
          doc: (id) => ({
            set: (data) => {
              console.log(`MOCK: Saving session data with ID ${id}`);
              mockSessions[id] = data;
              return Promise.resolve();
            },
            get: () => {
              const data = mockSessions[id];
              return Promise.resolve({
                exists: !!data,
                data: () => data
              });
            }
          })
        })
      };
    }
    
    return mockFirestore;
  }

  try {
    // Get service account credentials from environment variables
    const serviceAccount = {
      type: process.env.FIREBASE_TYPE || "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
      token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };

    // Initialize the app
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    
    firebaseInitialized = true;
    console.log('Firebase Admin SDK initialized successfully');
    return admin.firestore();
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    
    // Fallback to mock implementation
    console.log('Falling back to mock Firestore implementation.');
    if (!mockFirestore) {
      const mockSessions = {};
      
      mockFirestore = {
        collection: () => ({
          doc: (id) => ({
            set: (data) => {
              console.log(`MOCK: Saving session data with ID ${id}`);
              mockSessions[id] = data;
              return Promise.resolve();
            },
            get: () => {
              const data = mockSessions[id];
              return Promise.resolve({
                exists: !!data,
                data: () => data
              });
            }
          })
        })
      };
    }
    
    return mockFirestore;
  }
};

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
    console.log('Handling OPTIONS request');
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    console.log(`Rejecting ${event.httpMethod} request`);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Only POST requests are supported.' })
    };
  }

  try {
    console.log('Processing email request');
    
    // Parse the request body
    const requestBody = JSON.parse(event.body);
    const { email, productId, pdfUrl, pdfName, selectedPages } = requestBody;

    console.log('Request data:', { 
      email, 
      hasUrl: !!pdfUrl, 
      selectedPages,
    });

    // Basic validation
    if (!email) {
      console.log('Missing email address');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing email address' })
      };
    }

    if (!selectedPages || !Array.isArray(selectedPages) || selectedPages.length === 0) {
      console.log('No pages selected');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No pages selected' })
      };
    }

    if (!pdfUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing PDF URL' })
      };
    }

    // Generate a unique session ID
    const sessionId = uuidv4();
    
    // Create expiration timestamp (7 days from now)
    const now = Date.now();
    const expirationTime = now + (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
    
    // Create the viewing session data
    const sessionData = {
      sessionId,
      email,
      productId,
      pdfUrl,
      pdfName: pdfName || 'Document',
      selectedPages,
      createdAt: now,
      expiresAt: expirationTime,
      accessCount: 0,
      maxAccessCount: 10 // Limit views to 10 times
    };
    
    // Get base URL from request or environment variable
    const baseUrl = process.env.BASE_URL || 'https://therapytools.netlify.app';
    
    // Generate the viewing URL
    const viewingUrl = `${baseUrl}/guest-view/${sessionId}`;

    try {
      // Initialize Firebase and save session data
      const db = initializeFirebase();
      await db.collection('pdfSessions').doc(sessionId).set(sessionData);
      console.log(`Session data saved with ID: ${sessionId}`);
    } catch (dbError) {
      console.error('Error saving session data to Firestore:', dbError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: `Failed to save session data: ${dbError.message}` 
        })
      };
    }

    // Configure email transporter
    let transporter;
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('No SMTP credentials found, using test mode');
      // For testing - using ethereal.email
      const testAccount = await nodemailer.createTestAccount();
      
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      
      console.log('Created test account:', testAccount.user);
    } else {
      // Regular SMTP configuration
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        // Add timeout to prevent hanging connections
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 5000,    // 5 seconds
        socketTimeout: 10000      // 10 seconds
      });
    }

    // Create the email with a button to view the pages
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Therapy Tools" <${process.env.SMTP_USER || 'noreply@example.com'}>`,
      to: email,
      subject: `Your Selected Pages from ${pdfName || 'Document'}`,
      text: `
Hello!

Here are the pages ${selectedPages.join(', ')} you requested from "${pdfName || 'Document'}".

You can view your selected pages by clicking this link:
${viewingUrl}

This link will expire in 7 days and can be viewed up to 10 times.

Thank you for using Therapy Tools!
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Selected PDF Pages</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; }
    .header { color: #4F46E5; }
    .button { display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; 
              padding: 12px 24px; border-radius: 4px; font-weight: bold; margin: 20px 0; }
    .button:hover { background-color: #4338CA; }
    .info-box { background-color: #F3F4F6; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 14px; color: #6B7280; }
    .page-list { background-color: #EEF2FF; padding: 10px 15px; border-radius: 4px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="header">Your Document Request</h1>
    <p>Hello!</p>
    <p>Here are the pages you requested from <strong>${pdfName || 'Document'}</strong>:</p>
    
    <div class="page-list">
      <strong>Selected Pages:</strong> ${selectedPages.join(', ')}
    </div>
    
    <p>Click the button below to view your selected pages:</p>
    
    <a href="${viewingUrl}" class="button">View Selected Pages</a>
    
    <div class="info-box">
      <p><strong>Note:</strong> This link will expire in 7 days and can be viewed up to 10 times.</p>
      <p>For permanent access to this document, please subscribe to our services.</p>
    </div>
    
    <p class="footer">Thank you for using Therapy Tools!</p>
  </div>
</body>
</html>
      `
    };

    // Send the email
    console.log('Sending email with viewing link...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    
    // If using ethereal.email, provide the preview URL
    let previewUrl;
    if (info.messageId && info.messageId.includes('ethereal')) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('Preview URL:', previewUrl);
    }

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Email sent successfully to ${email}`,
        details: {
          email,
          pages: selectedPages,
          sessionId,
          viewingUrl,
          messageId: info.messageId,
          expiresAt: expirationTime,
          previewUrl
        }
      })
    };
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Create a user-friendly error message
    let errorMessage = 'Failed to send email';
    
    if (error.message.includes('timeout') || error.name === 'TimeoutError') {
      errorMessage = 'Email server response took too long. Please try again later.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Could not connect to email server. Please check your internet connection.';
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check the server credentials.';
    } else if (error.code === 'ESOCKET') {
      errorMessage = 'Network issue while connecting to email server. Please try again later.';
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: error.message
      })
    };
  }
}; 