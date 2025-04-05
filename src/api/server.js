// Express server for handling payment API endpoints
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import payment handlers
const stripeHandlers = require('./stripe-handlers');
const paypalHandlers = require('./paypal-handlers');
const paymentSuccessHandlers = require('./payment-success');
// Import PDF page email handler
const sendPdfPagesHandler = require('./send-pdf-pages');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Special middleware for Stripe webhooks (needs raw body)
app.use(
  '/api/webhook/stripe',
  bodyParser.raw({ type: 'application/json' }),
  (req, res, next) => {
    req.rawBody = req.body;
    next();
  }
);

// API routes
// Stripe endpoints
app.post('/api/create-payment-intent', stripeHandlers.createPaymentIntent);
app.post('/api/webhook/stripe', stripeHandlers.handleWebhookEvent);

// PayPal endpoints
app.post('/api/create-paypal-order', paypalHandlers.createOrder);
app.post('/api/capture-paypal-order', paypalHandlers.captureOrder);

// Verification endpoint
app.post('/api/verify-payment', paymentSuccessHandlers.verifyPaymentStatus);

// PDF pages email endpoint
app.post('/api/send-pdf-pages', sendPdfPagesHandler);


module.exports = app; 