const express = require('express');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verifyToken
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../../../shared/middleware/validation');
const { authLimiter } = require('../../../shared/middleware/rateLimit');

const router = express.Router();

// Development-friendly rate limiting
const developmentAuthLimiter = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return authLimiter(req, res, next);
  } else {
    // Skip rate limiting in development
    next();
  }
};

// Public routes
router.post('/register', developmentAuthLimiter, validateRegistration, register);
router.post('/login', developmentAuthLimiter, validateLogin, login);
router.post('/forgot-password', developmentAuthLimiter, forgotPassword);
router.post('/reset-password', developmentAuthLimiter, resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Internal service route (for other microservices)
router.post('/verify-token', verifyToken);

// Protected routes
router.use(authenticateToken);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

module.exports = router;
