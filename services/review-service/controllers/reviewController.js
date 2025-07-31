const Review = require('../models/Review');
const { successResponse, errorResponse, paginationResponse } = require('../../../shared/utils/responses');
const axios = require('axios');

// Create a new review
const createReview = async (req, res) => {
  try {
    const {
      serviceId,
      bookingId,
      rating,
      comment,
      aspects,
      images
    } = req.body;

    // Verify booking exists and user can review it
    const bookingResponse = await axios.get(
      `${process.env.BOOKING_SERVICE_URL}/api/${bookingId}`,
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );

    if (!bookingResponse.data.success) {
      return errorResponse(res, 'Booking not found', 404);
    }

    const booking = bookingResponse.data.data.booking;

    // Verify user is the customer of this booking
    if (booking.customerId._id !== req.user.userId) {
      return errorResponse(res, 'You can only review your own bookings', 403);
    }

    // Verify booking is completed
    if (booking.status !== 'completed') {
      return errorResponse(res, 'You can only review completed bookings', 400);
    }

    // Check if review already exists for this booking
    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
      return errorResponse(res, 'Review already exists for this booking', 400);
    }

    // Get service details
    const serviceResponse = await axios.get(`${process.env.SERVICES_SERVICE_URL}/api/services/${serviceId}`);
    const service = serviceResponse.data.data.service;

    // Create review
    const reviewData = {
      customerId: req.user.userId,
      providerId: booking.providerId._id,
      serviceId,
      bookingId,
      rating,
      comment,
      aspects,
      images: images || [],
      metadata: {
        serviceTitle: service.title,
        serviceCategory: service.category,
        bookingDate: booking.scheduledDate,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    };

    const review = new Review(reviewData);
    await review.save();

    // Update provider and service ratings
    await updateProviderRating(booking.providerId._id);
    await updateServiceRating(serviceId);

    const populatedReview = await Review.findById(review._id)
      .populate('customerId', 'name')
      .populate('providerId', 'name businessName')
      .populate('serviceId', 'title category');

    successResponse(res, { review: populatedReview }, 'Review created successfully', 201);
  } catch (error) {
    console.error('Create review error:', error);
    errorResponse(res, 'Failed to create review', 500);
  }
};

// Get reviews with filters
const getReviews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      providerId,
      serviceId,
      customerId,
      rating,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {
      isVisible: true,
      isVerified: true
    };

    if (providerId) filter.providerId = providerId;
    if (serviceId) filter.serviceId = serviceId;
    if (customerId) filter.customerId = customerId;
    if (rating) filter.rating = parseInt(rating);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [reviews, totalCount] = await Promise.all([
      Review.find(filter)
        .populate('customerId', 'name profileImage')
        .populate('providerId', 'name businessName')
        .populate('serviceId', 'title category')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments(filter)
    ]);

    paginationResponse(res, reviews, totalCount, pageNum, limitNum, 'Reviews retrieved successfully');
  } catch (error) {
    console.error('Get reviews error:', error);
    errorResponse(res, 'Failed to retrieve reviews', 500);
  }
};

// Get review by ID
const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id)
      .populate('customerId', 'name profileImage')
      .populate('providerId', 'name businessName')
      .populate('serviceId', 'title category description');

    if (!review) {
      return errorResponse(res, 'Review not found', 404);
    }

    if (!review.isVisible) {
      return errorResponse(res, 'Review is not visible', 404);
    }

    successResponse(res, { review }, 'Review retrieved successfully');
  } catch (error) {
    console.error('Get review error:', error);
    errorResponse(res, 'Failed to retrieve review', 500);
  }
};

// Update review (only by the author)
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, aspects } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return errorResponse(res, 'Review not found', 404);
    }

    // Check if user is the author
    if (review.customerId.toString() !== req.user.userId) {
      return errorResponse(res, 'You can only update your own reviews', 403);
    }

    // Update review
    const updates = { rating, comment };
    if (aspects) updates.aspects = aspects;

    const updatedReview = await Review.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('customerId', 'name')
     .populate('providerId', 'name businessName')
     .populate('serviceId', 'title category');

    // Update provider and service ratings
    await updateProviderRating(review.providerId);
    await updateServiceRating(review.serviceId);

    successResponse(res, { review: updatedReview }, 'Review updated successfully');
  } catch (error) {
    console.error('Update review error:', error);
    errorResponse(res, 'Failed to update review', 500);
  }
};

// Delete review (soft delete)
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return errorResponse(res, 'Review not found', 404);
    }

    // Check if user is the author or admin
    if (review.customerId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return errorResponse(res, 'Access denied', 403);
    }

    // Soft delete by making it invisible
    review.isVisible = false;
    await review.save();

    // Update provider and service ratings
    await updateProviderRating(review.providerId);
    await updateServiceRating(review.serviceId);

    successResponse(res, null, 'Review deleted successfully');
  } catch (error) {
    console.error('Delete review error:', error);
    errorResponse(res, 'Failed to delete review', 500);
  }
};

// Add provider response to review
const addProviderResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return errorResponse(res, 'Review not found', 404);
    }

    // Check if user is the provider
    if (review.providerId.toString() !== req.user.userId) {
      return errorResponse(res, 'You can only respond to reviews for your services', 403);
    }

    // Add response
    review.response = {
      comment,
      respondedAt: new Date(),
      respondedBy: req.user.userId
    };

    await review.save();

    const updatedReview = await Review.findById(id)
      .populate('customerId', 'name')
      .populate('providerId', 'name businessName')
      .populate('serviceId', 'title category');

    successResponse(res, { review: updatedReview }, 'Response added successfully');
  } catch (error) {
    console.error('Add provider response error:', error);
    errorResponse(res, 'Failed to add response', 500);
  }
};

// Mark review as helpful
const markHelpful = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return errorResponse(res, 'Review not found', 404);
    }

    await review.markHelpful(req.user.userId);

    successResponse(res, { helpfulCount: review.helpful.count }, 'Review marked as helpful');
  } catch (error) {
    console.error('Mark helpful error:', error);
    errorResponse(res, 'Failed to mark review as helpful', 500);
  }
};

// Flag review
const flagReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { flagType, reason } = req.body;

    if (!['inappropriate', 'spam'].includes(flagType)) {
      return errorResponse(res, 'Invalid flag type', 400);
    }

    const review = await Review.findById(id);
    if (!review) {
      return errorResponse(res, 'Review not found', 404);
    }

    await review.flagReview(req.user.userId, flagType);

    successResponse(res, null, 'Review flagged successfully');
  } catch (error) {
    console.error('Flag review error:', error);
    errorResponse(res, 'Failed to flag review', 500);
  }
};

// Get provider rating summary
const getProviderRating = async (req, res) => {
  try {
    const { providerId } = req.params;

    const ratingData = await Review.calculateProviderRating(providerId);

    successResponse(res, { rating: ratingData }, 'Provider rating retrieved successfully');
  } catch (error) {
    console.error('Get provider rating error:', error);
    errorResponse(res, 'Failed to retrieve provider rating', 500);
  }
};

// Get recent reviews
const getRecentReviews = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const reviews = await Review.getRecentReviews(parseInt(limit));

    successResponse(res, { reviews }, 'Recent reviews retrieved successfully');
  } catch (error) {
    console.error('Get recent reviews error:', error);
    errorResponse(res, 'Failed to retrieve recent reviews', 500);
  }
};

// Helper function to update provider rating
const updateProviderRating = async (providerId) => {
  try {
    const ratingData = await Review.calculateProviderRating(providerId);
    
    // Update user rating in auth service
    await axios.put(`${process.env.AUTH_SERVICE_URL}/api/users/${providerId}/rating`, {
      average: ratingData.average,
      count: ratingData.count
    });
  } catch (error) {
    console.error('Error updating provider rating:', error);
  }
};

// Helper function to update service rating
const updateServiceRating = async (serviceId) => {
  try {
    const reviews = await Review.find({
      serviceId,
      isVisible: true,
      isVerified: true
    });

    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      // Update service rating in services service
      await axios.put(`${process.env.SERVICES_SERVICE_URL}/api/services/${serviceId}/rating`, {
        average: Math.round(averageRating * 10) / 10,
        count: reviews.length
      });
    }
  } catch (error) {
    console.error('Error updating service rating:', error);
  }
};

module.exports = {
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
};
