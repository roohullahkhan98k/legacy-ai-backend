const User = require('../models/User');

/**
 * Middleware to require admin role
 * Must be used after authenticateToken or requireAuth
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Fetch user from database to get current role
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        message: 'You do not have permission to access this resource'
      });
    }

    // Attach full user object to request
    req.adminUser = user;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error checking admin permissions'
    });
  }
};

module.exports = { requireAdmin };

