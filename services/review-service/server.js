const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const reviewRoutes = require('./routes/reviews');
const { errorHandler, notFound } = require('../../shared/middleware/errorHandler');
const { generalLimiter } = require('../../shared/middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3004;

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected - Review Service');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(generalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Review Service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api', reviewRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`⭐ Review Service running on port ${PORT}`);
  });
};

startServer();
