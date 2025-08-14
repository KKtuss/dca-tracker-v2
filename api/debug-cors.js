export default async function handler(req, res) {
  console.log('Debug CORS endpoint called:', {
    method: req.method,
    origin: req.headers.origin,
    headers: req.headers,
    url: req.url
  });

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  });

  // Return debug information
  res.end(JSON.stringify({
    success: true,
    message: 'Debug CORS endpoint working',
    timestamp: new Date().toISOString(),
    method: req.method,
    origin: req.headers.origin || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    cors: 'enabled',
    debug: {
      headers: req.headers,
      method: req.method,
      url: req.url
    }
  }));
}
