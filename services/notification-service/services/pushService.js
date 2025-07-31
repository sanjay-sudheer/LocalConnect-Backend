const axios = require('axios');

class PushService {
  constructor() {
    // TODO: Initialize push notification service (Firebase, OneSignal, etc.)
    this.initialized = false;
  }

  async sendPushNotification(notification) {
    try {
      if (!this.initialized) {
        console.log('Push notification service not initialized');
        return;
      }

      // Get recipient device tokens from user service
      const recipientResponse = await axios.get(
        `${process.env.AUTH_SERVICE_URL}/api/users/${notification.recipientId}`
      );
      
      const recipient = recipientResponse.data.data.user;
      
      if (!recipient.deviceTokens || recipient.deviceTokens.length === 0) {
        throw new Error('No device tokens found for recipient');
      }

      const pushData = {
        title: notification.title,
        body: notification.message,
        data: notification.data,
        icon: this.getIconForNotificationType(notification.type),
        badge: await this.getUnreadCount(notification.recipientId)
      };

      // TODO: Send push notification to all device tokens
      console.log(`Push notification would be sent to ${recipient.deviceTokens.length} devices`);
      
    } catch (error) {
      console.error('Push notification error:', error);
      throw error;
    }
  }

  getIconForNotificationType(type) {
    const iconMap = {
      'booking_request': 'booking',
      'booking_confirmed': 'check',
      'booking_cancelled': 'cancel',
      'review_received': 'star',
      'payment_received': 'payment',
      'message': 'message'
    };

    return iconMap[type] || 'notification';
  }

  async getUnreadCount(userId) {
    try {
      const Notification = require('../models/Notification');
      return await Notification.getUnreadCount(userId);
    } catch (error) {
      return 0;
    }
  }
}

module.exports = new PushService();
