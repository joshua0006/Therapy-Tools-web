// Simple CORS Proxy for Development
// This helps with API requests during development

import cors_proxy from 'cors-anywhere';

// Create CORS Anywhere server
const host = process.env.HOST || '0.0.0.0';
const port = process.env.CORS_PORT || 8080;

cors_proxy
  .createServer({
    originWhitelist: [], // Allow all origins
    requireHeader: ['origin', 'x-requested-with'],
    removeHeaders: ['cookie', 'cookie2'],
    redirectSameOrigin: true,
    httpProxyOptions: {
      secure: false // Don't verify SSL certificates
    }
  })
  .listen(port, host, () => {
    console.log(`CORS Anywhere proxy running on ${host}:${port}`);
    console.log(`Example usage: http://localhost:${port}/https://example.com`);
  });

// Keep the script running
process.on('SIGINT', () => {
  console.log('CORS proxy shutting down...');
  process.exit();
}); 