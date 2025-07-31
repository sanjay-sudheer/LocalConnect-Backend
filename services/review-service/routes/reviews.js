const express = require('express');
const {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  addProviderResponse,
  markHelpful,
  flagReview,
  getProviderRating,
  getRecentReviews
} = require('../controllers/reviewController');
const { authenticateToken, authorizeRoles, optionalAuth } = require('../middleware/auth');
const { validateReview } = require('../../../shared/middleware/validation');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getReviews);
router.get('/recent', getRecentReviews);
router.get('/provider/:providerId/rating', getProviderRating);
router.get('/:id', getReviewById);

// Protected routes
router.use(authenticateToken);

// Customer routes
router.post('/', authorizeRoles('customer'), validateReview, createReview);
router.put('/:id', authorizeRoles('customer'), updateReview);
router.delete('/:id', deleteReview); // Can be deleted by author or admin

// Provider routes
router.post('/:id/response', authorizeRoles('provider'), addProviderResponse);

// General user routes
router.post('/:id/helpful', markHelpful);
router.post('/:id/flag', flagReview);

module.exports = router;
