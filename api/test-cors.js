export default async function handler(req, res) {
  console.log('CORS test endpoint called:', {
    method: req.method,
    origin: req.headers.origin,
    headers: req.headers
  });

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Origin, Accept',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'false',
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
      success: true,
      message: 'OPTIONS preflight successful',
      timestamp: new Date().toISOString(),
      method: 'OPTIONS',
      cors: 'enabled'
    }));
    return;
  }

  // Set CORS headers for all other requests
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Origin, Accept',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false',
    'Content-Type': 'application/json'
  });

  // Simple response to test CORS
  res.end(JSON.stringify({
    success: true,
    message: 'CORS test successful',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'unknown',
    method: req.method,
    cors: 'enabled'
  }));
}
