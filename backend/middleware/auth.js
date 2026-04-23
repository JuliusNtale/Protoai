const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7);

  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication token required' } });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { user_id: decoded.user_id, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}

function verifyInternalToken(req, res, next) {
  const token = req.headers['x-internal-token'];
  if (!token || token !== process.env.AI_SERVICE_TOKEN) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid internal service token' } });
  }
  next();
}

module.exports = { verifyToken, verifyInternalToken };
