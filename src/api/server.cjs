// Express server for handling API endpoints (CommonJS version)
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Create express app
const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));

// PDF pages email endpoint handler
const sendPdfPagesHandler = require('./send-pdf-pages.cjs');

// API routes
app.post('/api/send-pdf-pages', sendPdfPagesHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`----------------------------------------------------`);
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
  console.log(`📧 Email configured using: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  console.log(`----------------------------------------------------`);
});

module.exports = app; 