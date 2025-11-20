const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'ai-prototype-super-secret-jwt-key-change-this-in-production';

// Verify JWT token and attach user to request
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // No token provided - continue without user (anonymous)
    req.user = null;
    return next();
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      // Invalid token - continue without user
      console.warn('⚠️ Invalid token:', err.message);
      req.user = null;
      return next();
    }

    // Valid token - attach user to request
    console.log('✅ Auth: User authenticated -', user.username, 'ID:', user.id);
    req.user = user;
    next();
  });
};

// Require authentication - return 401 if no valid token
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }

    req.user = user;
    next();
  });
};

module.exports = {
  authenticateToken,
  requireAuth
};

