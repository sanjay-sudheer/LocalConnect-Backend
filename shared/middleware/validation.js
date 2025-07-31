const { body, validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('role')
    .isIn(['customer', 'provider'])
    .withMessage('Role must be either customer or provider'),
  handleValidationErrors
];

// User login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Service creation validation
const validateService = [
  body('title')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Service title must be at least 3 characters long'),
  body('description')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters long'),
  body('category')
    .notEmpty()
    .withMessage('Category is required'),
  body('price')
    .isNumeric()
    .withMessage('Price must be a valid number'),
  body('location.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('location.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  handleValidationErrors
];

// Booking validation
const validateBooking = [
  body('serviceId')
    .isMongoId()
    .withMessage('Valid service ID is required'),
  body('providerId')
    .isMongoId()
    .withMessage('Valid provider ID is required'),
  body('scheduledDate')
    .isISO8601()
    .withMessage('Valid date is required'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  handleValidationErrors
];

// Review validation
const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Comment must be between 5 and 500 characters'),
  body('serviceId')
    .isMongoId()
    .withMessage('Valid service ID is required'),
  body('bookingId')
    .isMongoId()
    .withMessage('Valid booking ID is required'),
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateService,
  validateBooking,
  validateReview,
  handleValidationErrors
};
