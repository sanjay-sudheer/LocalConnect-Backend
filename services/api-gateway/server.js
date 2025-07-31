const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Trust proxy for port forwarding and tunneling
app.set('trust proxy', true);

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));
app.use(compression());

// Enhanced CORS configuration for port forwarding
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost on any port
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow port forwarded domains (VS Code Dev Tunnels, ngrok, etc.)
    if (origin.includes('.devtunnels.ms') || 
        origin.includes('.ngrok.io') || 
        origin.includes('.tunnel.dev') ||
        origin.includes('.loca.lt')) {
      return callback(null, true);
    }
    
    // Allow production domains (add your production URL here)
    const allowedOrigins = [
      'https://localconnect.com',
      'https://www.localconnect.com',
      'https://app.localconnect.com'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Default: allow the request (can be changed to reject in production)
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining', 
    'X-RateLimit-Reset'
  ]
}));

app.use(morgan('combined'));

// Don't parse bodies at gateway - let services handle it
// Body parsing causes issues with proxying

// Service URLs
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  services: process.env.SERVICES_SERVICE_URL || 'http://localhost:3002',
  booking: process.env.BOOKING_SERVICE_URL || 'http://localhost:3003',
  review: process.env.REVIEW_SERVICE_URL || 'http://localhost:3004',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005'
};

// Proxy configurations  
const proxyOptions = {
  changeOrigin: true,
  logLevel: 'info',
  timeout: 30000,
  
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 ${req.method} ${req.url}`);
  },
  
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ ${proxyRes.statusCode} ${req.url}`);
  },
  
  onError: (err, req, res) => {
    console.error('🚨 Proxy error:', err.code, err.message);
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        message: 'Service error',
        error: err.message
      });
    }
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Gateway is running',
    timestamp: new Date().toISOString(),
    services: Object.keys(services)
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'LocalConnect API Gateway',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      services: '/api/services/*',
      bookings: '/api/bookings/*',
      reviews: '/api/reviews/*',
      notifications: '/api/notifications/*'
    },
    cors: {
      enabled: true,
      allowCredentials: true,
      supportedOrigins: 'localhost, devtunnels.ms, ngrok.io, production domains'
    }
  });
});

// Handle preflight requests for all API routes
app.options('/api/*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  res.sendStatus(200);
});

// Route to Auth Service
app.use('/api/auth', createProxyMiddleware({
  target: services.auth,
  pathRewrite: {
    '^/api/auth': '/api'
  },
  ...proxyOptions
}));

// Route to Services Service
app.use('/api/services', createProxyMiddleware({
  target: services.services,
  pathRewrite: {
    '^/api/services': '/api'
  },
  ...proxyOptions
}));

// Route to Booking Service
app.use('/api/bookings', createProxyMiddleware({
  target: services.booking,
  pathRewrite: {
    '^/api/bookings': '/api'
  },
  ...proxyOptions
}));

// Route to Review Service
app.use('/api/reviews', createProxyMiddleware({
  target: services.review,
  pathRewrite: {
    '^/api/reviews': '/api'
  },
  ...proxyOptions
}));

// Route to Notification Service
app.use('/api/notifications', createProxyMiddleware({
  target: services.notification,
  pathRewrite: {
    '^/api/notifications': '/api'
  },
  ...proxyOptions
}));

// Debug route for CORS testing
app.all('/api/debug/cors', express.json(), (req, res) => {
  res.json({
    success: true,
    message: 'CORS test successful',
    request: {
      method: req.method,
      origin: req.headers.origin,
      userAgent: req.headers['user-agent'],
      headers: req.headers
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'GET /api',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/services',
      'POST /api/bookings',
      'GET /api/reviews',
      'POST /api/notifications/*'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});
