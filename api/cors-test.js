// FORCE REDEPLOY - CORS FIX v4 - WRITEHEAD APPROACH
export default async function handler(req, res) {
  console.log('CORS test endpoint called:', {
    method: req.method,
    origin: req.headers.origin,
    headers: req.headers
  });

  // Handle preflight OPTIONS request FIRST
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

  // Handle actual request
  console.log('Handling', req.method, 'request');

  try {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json'
    });
    
    res.end(JSON.stringify({
      success: true,
      message: 'CORS test working!',
      timestamp: new Date().toISOString(),
      method: req.method,
      origin: req.headers.origin || 'unknown',
      cors: 'enabled'
    }));
  } catch (error) {
    console.error('Error in cors-test:', error);
    res.writeHead(500, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}
