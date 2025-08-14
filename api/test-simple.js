// FORCE REDEPLOY - CORS FIX v4 - WRITEHEAD APPROACH
export default function handler(req, res) {
  console.log('Simple test endpoint called:', {
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

  // Simple response
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  });
  
  res.end(JSON.stringify({
    message: 'Simple test working!',
    method: req.method,
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'unknown',
    cors: 'enabled'
  }));
}
