// ULTRA SIMPLE TEST - WITH CORS FIX
export default function handler(req, res) {
  console.log('Hello endpoint called:', {
    method: req.method,
    origin: req.headers.origin,
    headers: req.headers
  });

  // Handle OPTIONS FIRST
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'text/plain'
    });
    res.end('OK');
    return;
  }

  // Simple response with CORS headers
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  });
  
  res.end(JSON.stringify({
    message: 'Hello World!',
    timestamp: new Date().toISOString(),
    method: req.method,
    cors: 'enabled'
  }));
}
