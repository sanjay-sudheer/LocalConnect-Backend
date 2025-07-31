const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const { errorHandler, notFound } = require('../../shared/middleware/errorHandler');
const { generalLimiter } = require('../../shared/middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for proper IP detection with port forwarding
app.set('trust proxy', true);

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected - Auth Service');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting conditionally (more lenient in development)
if (process.env.NODE_ENV === 'production') {
  app.use(generalLimiter);
} else {
  console.log('🔧 Development mode: Rate limiting disabled');
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Auth Service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint for testing request parsing
app.post('/debug', (req, res) => {
  console.log('📋 Debug endpoint hit');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Raw Body Length:', req.rawBody ? req.rawBody.length : 'N/A');
  
  res.json({
    success: true,
    message: 'Debug endpoint working',
    receivedBody: req.body,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api', authRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Auth Service Error:', err);
  
  // Handle specific error types
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      error: 'Request body parsing failed'
    });
  }
  
  if (err.code === 'ECONNABORTED' || err.code === 'ECONNRESET') {
    return res.status(408).json({
      success: false,
      message: 'Request timeout or connection reset',
      error: 'Please try again'
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  
  const server = app.listen(PORT, () => {
    console.log(`🔐 Auth Service running on port ${PORT}`);
  });
  
  // Set server timeouts
  server.keepAliveTimeout = 5000;
  server.headersTimeout = 6000;
  server.timeout = 10000;
};

startServer();
