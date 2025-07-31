const axios = require('axios');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    // Verify token with auth service
    const response = await axios.post(`${process.env.AUTH_SERVICE_URL}/api/verify-token`, {
      token
    });

    if (!response.data.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    req.user = response.data.data.decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};
