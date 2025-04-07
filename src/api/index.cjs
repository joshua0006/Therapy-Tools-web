// API Server Entry Point (CommonJS version)
const app = require('./server.cjs');

const PORT = process.env.PORT || 3002;

// Start the server
app.listen(PORT, () => {
  console.log(`----------------------------------------------------`);
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
  console.log(`📧 Email configured using: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  console.log(`----------------------------------------------------`);
}); 