const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const notificationRoutes = require('./routes/notifications');
const { errorHandler, notFound } = require('../../shared/middleware/errorHandler');
const { generalLimiter } = require('../../shared/middleware/rateLimit');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3005;

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected - Notification Service');
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

// Socket.IO for real-time notifications
io.on('connection', (socket) => {
  console.log('User connected to notifications:', socket.id);

  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their notification room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected from notifications:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Notification Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: ['email', 'sms', 'push', 'real-time']
  });
});

// Routes
app.use('/api', notificationRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🔔 Notification Service running on port ${PORT}`);
    console.log(`📡 WebSocket server ready for real-time notifications`);
  });
};

startServer();

// Export io for use in other modules
module.exports = { io };
