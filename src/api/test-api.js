// Simple test script for the API server
import http from 'http';

// Check if server is running on port 3002
function checkServerConnection() {
  console.log('Checking if server is running on port 3002...');
  
  const req = http.request({
    hostname: 'localhost',
    port: 3002,
    path: '/',
    method: 'GET',
    timeout: 5000 // 5 seconds timeout
  }, (res) => {
    console.log(`Server responded with status code: ${res.statusCode}`);
    console.log('✅ Server is running and accepting connections');
  });
  
  req.on('error', (error) => {
    console.error('❌ Error connecting to server:', error.message);
    console.log('Make sure the server is running on port 3002');
  });
  
  req.on('timeout', () => {
    console.error('❌ Request timed out');
    req.destroy();
  });
  
  req.end();
}

checkServerConnection(); 