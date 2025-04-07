// Express server for handling payment API endpoints
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Import payment handlers
// Use * as ... syntax to handle both default and named exports
import * as stripeHandlers from './stripe-handlers.js';
import * as paypalHandlers from './paypal-handlers.js';
import * as paymentSuccessHandlers from './payment-success.js';
// Import PDF page email handler
import sendPdfPagesHandler from './send-pdf-pages.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration to allow requests from the Vite dev server
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));

// Special middleware for Stripe webhooks (needs raw body)
app.use(
  '/api/webhook/stripe',
  bodyParser.raw({ type: 'application/json' }),
  (req, res, next) => {
    req.rawBody = req.body;
    next();
  }
);

// Helper to access handlers regardless of export style (default or named)
const getHandler = (module, methodName) => {
  if (module[methodName]) return module[methodName]; // Named export
  if (module.default && module.default[methodName]) return module.default[methodName]; // Default export object
  return module.default || module; // Direct default export or the module itself
};

// API routes
// Stripe endpoints
app.post('/api/create-payment-intent', getHandler(stripeHandlers, 'createPaymentIntent'));
app.post('/api/webhook/stripe', getHandler(stripeHandlers, 'handleWebhookEvent'));

// PayPal endpoints
app.post('/api/create-paypal-order', getHandler(paypalHandlers, 'createOrder'));
app.post('/api/capture-paypal-order', getHandler(paypalHandlers, 'captureOrder'));

// Verification endpoint
app.post('/api/verify-payment', getHandler(paymentSuccessHandlers, 'verifyPaymentStatus'));

// PDF pages email endpoint
app.post('/api/send-pdf-pages', sendPdfPagesHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`----------------------------------------------------`);
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
  console.log(`📧 Email configured using: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  console.log(`----------------------------------------------------`);
});

export default app; 