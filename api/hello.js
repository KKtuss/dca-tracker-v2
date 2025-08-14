// ULTRA SIMPLE TEST - NO CORS COMPLEXITY
export default function handler(req, res) {
  // Just return a simple response
  res.status(200).json({
    message: 'Hello World!',
    timestamp: new Date().toISOString(),
    method: req.method
  });
}
