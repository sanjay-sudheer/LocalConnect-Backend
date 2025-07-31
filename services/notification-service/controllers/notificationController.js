const Notification = require('../models/Notification');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const pushService = require('../services/pushService');
const { successResponse, errorResponse, paginationResponse } = require('../../../shared/utils/responses');

// Create and send notification
const createNotification = async (req, res) => {
  try {
    const {
      recipientId,
      type,
      title,
      message,
      data,
      channels = { inApp: true },
      priority = 'normal',
      scheduledFor,
      expiresAt
    } = req.body;

    // Create notification
    const notification = new Notification({
      recipientId,
      senderId: req.user ? req.user.userId : null,
      type,
      title,
      message,
      data,
      priority,
      scheduledFor,
      expiresAt,
      metadata: {
        source: req.user ? 'user' : 'system',
        ...data
      }
    });

    await notification.save();

    // Send through requested channels
    if (scheduledFor && new Date(scheduledFor) > new Date()) {
      // Schedule for later
      // TODO: Implement job scheduling
    } else {
      await sendNotification(notification, channels);
    }

    successResponse(res, { notification }, 'Notification created successfully', 201);
  } catch (error) {
    console.error('Create notification error:', error);
    errorResponse(res, 'Failed to create notification', 500);
  }
};

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      isRead,
      priority
    } = req.query;

    const filter = {
      recipientId: req.user.userId,
      isArchived: false
    };

    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (priority) filter.priority = priority;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('senderId', 'name businessName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(filter),
      Notification.getUnreadCount(req.user.userId)
    ]);

    const response = {
      notifications,
      unreadCount,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalItems: totalCount,
        itemsPerPage: limitNum
      }
    };

    successResponse(res, response, 'Notifications retrieved successfully');
  } catch (error) {
    console.error('Get notifications error:', error);
    errorResponse(res, 'Failed to retrieve notifications', 500);
  }
};

// Get notification by ID
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id)
      .populate('senderId', 'name businessName')
      .populate('recipientId', 'name email');

    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }

    // Check authorization
    if (notification.recipientId._id.toString() !== req.user.userId && req.user.role !== 'admin') {
      return errorResponse(res, 'Access denied', 403);
    }

    successResponse(res, { notification }, 'Notification retrieved successfully');
  } catch (error) {
    console.error('Get notification error:', error);
    errorResponse(res, 'Failed to retrieve notification', 500);
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }

    // Check authorization
    if (notification.recipientId.toString() !== req.user.userId) {
      return errorResponse(res, 'Access denied', 403);
    }

    await notification.markAsRead();

    successResponse(res, { notification }, 'Notification marked as read');
  } catch (error) {
    console.error('Mark as read error:', error);
    errorResponse(res, 'Failed to mark notification as read', 500);
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user.userId);

    successResponse(res, null, 'All notifications marked as read');
  } catch (error) {
    console.error('Mark all as read error:', error);
    errorResponse(res, 'Failed to mark all notifications as read', 500);
  }
};

// Archive notification
const archiveNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }

    // Check authorization
    if (notification.recipientId.toString() !== req.user.userId) {
      return errorResponse(res, 'Access denied', 403);
    }

    await notification.archive();

    successResponse(res, null, 'Notification archived successfully');
  } catch (error) {
    console.error('Archive notification error:', error);
    errorResponse(res, 'Failed to archive notification', 500);
  }
};

// Get notification preferences
const getNotificationPreferences = async (req, res) => {
  try {
    // TODO: Implement user preferences model
    const defaultPreferences = {
      email: {
        bookingUpdates: true,
        reviews: true,
        marketing: false,
        reminders: true
      },
      sms: {
        bookingUpdates: true,
        reviews: false,
        marketing: false,
        reminders: true
      },
      push: {
        bookingUpdates: true,
        reviews: true,
        marketing: false,
        reminders: true
      }
    };

    successResponse(res, { preferences: defaultPreferences }, 'Notification preferences retrieved');
  } catch (error) {
    console.error('Get preferences error:', error);
    errorResponse(res, 'Failed to retrieve notification preferences', 500);
  }
};

// Update notification preferences
const updateNotificationPreferences = async (req, res) => {
  try {
    const { preferences } = req.body;

    // TODO: Implement user preferences update
    
    successResponse(res, { preferences }, 'Notification preferences updated successfully');
  } catch (error) {
    console.error('Update preferences error:', error);
    errorResponse(res, 'Failed to update notification preferences', 500);
  }
};

// Send notification through multiple channels
const sendNotification = async (notification, channels) => {
  try {
    const promises = [];

    if (channels.email) {
      promises.push(sendEmailNotification(notification));
    }

    if (channels.sms) {
      promises.push(sendSMSNotification(notification));
    }

    if (channels.push) {
      promises.push(sendPushNotification(notification));
    }

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Send notification error:', error);
  }
};

// Send email notification
const sendEmailNotification = async (notification) => {
  try {
    await emailService.sendNotificationEmail(notification);
    
    notification.channels.email.sent = true;
    notification.channels.email.sentAt = new Date();
    await notification.save();
  } catch (error) {
    console.error('Email notification error:', error);
    notification.channels.email.error = error.message;
    await notification.save();
  }
};

// Send SMS notification
const sendSMSNotification = async (notification) => {
  try {
    await smsService.sendNotificationSMS(notification);
    
    notification.channels.sms.sent = true;
    notification.channels.sms.sentAt = new Date();
    await notification.save();
  } catch (error) {
    console.error('SMS notification error:', error);
    notification.channels.sms.error = error.message;
    await notification.save();
  }
};

// Send push notification
const sendPushNotification = async (notification) => {
  try {
    await pushService.sendPushNotification(notification);
    
    notification.channels.push.sent = true;
    notification.channels.push.sentAt = new Date();
    await notification.save();
  } catch (error) {
    console.error('Push notification error:', error);
    notification.channels.push.error = error.message;
    await notification.save();
  }
};

// Bulk send notifications
const bulkSendNotifications = async (req, res) => {
  try {
    const { recipientIds, type, title, message, channels } = req.body;

    const notifications = [];
    for (const recipientId of recipientIds) {
      const notification = new Notification({
        recipientId,
        senderId: req.user.userId,
        type,
        title,
        message,
        priority: 'normal',
        metadata: {
          source: 'user'
        }
      });

      await notification.save();
      notifications.push(notification);

      // Send notification
      await sendNotification(notification, channels);
    }

    successResponse(res, { 
      notifications,
      count: notifications.length 
    }, 'Bulk notifications sent successfully');
  } catch (error) {
    console.error('Bulk send error:', error);
    errorResponse(res, 'Failed to send bulk notifications', 500);
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  bulkSendNotifications
};
