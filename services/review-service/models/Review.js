const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Service'
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Booking',
    unique: true // One review per booking
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
    minlength: [5, 'Comment must be at least 5 characters'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  aspects: {
    punctuality: {
      type: Number,
      min: 1,
      max: 5
    },
    quality: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    professionalism: {
      type: Number,
      min: 1,
      max: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  images: [{
    url: String,
    caption: String
  }],
  helpful: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  response: {
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Response cannot exceed 1000 characters']
    },
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  isVerified: {
    type: Boolean,
    default: true // Since reviews are tied to completed bookings
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  flags: {
    inappropriate: {
      count: {
        type: Number,
        default: 0
      },
      users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    },
    spam: {
      count: {
        type: Number,
        default: 0
      },
      users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    }
  },
  metadata: {
    serviceTitle: String,
    serviceCategory: String,
    bookingDate: Date,
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
});

// Method to mark review as helpful
reviewSchema.methods.markHelpful = function(userId) {
  if (!this.helpful.users.includes(userId)) {
    this.helpful.users.push(userId);
    this.helpful.count += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to unmark review as helpful
reviewSchema.methods.unmarkHelpful = function(userId) {
  const index = this.helpful.users.indexOf(userId);
  if (index > -1) {
    this.helpful.users.splice(index, 1);
    this.helpful.count = Math.max(0, this.helpful.count - 1);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to flag review
reviewSchema.methods.flagReview = function(userId, flagType) {
  if (!this.flags[flagType].users.includes(userId)) {
    this.flags[flagType].users.push(userId);
    this.flags[flagType].count += 1;
    
    // Auto-hide if flagged by multiple users
    if (this.flags[flagType].count >= 5) {
      this.isVisible = false;
    }
    
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to calculate provider average rating
reviewSchema.statics.calculateProviderRating = async function(providerId) {
  const pipeline = [
    {
      $match: {
        providerId: new mongoose.Types.ObjectId(providerId),
        isVisible: true,
        isVerified: true
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  
  if (result.length === 0) {
    return {
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  const data = result[0];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  data.ratingDistribution.forEach(rating => {
    distribution[rating] = (distribution[rating] || 0) + 1;
  });

  return {
    average: Math.round(data.averageRating * 10) / 10,
    count: data.totalReviews,
    distribution
  };
};

// Static method to get recent reviews
reviewSchema.statics.getRecentReviews = function(limit = 10) {
  return this.find({
    isVisible: true,
    isVerified: true
  })
  .populate('customerId', 'name')
  .populate('providerId', 'name businessName')
  .populate('serviceId', 'title category')
  .sort({ createdAt: -1 })
  .limit(limit);
};

module.exports = mongoose.model('Review', reviewSchema);
