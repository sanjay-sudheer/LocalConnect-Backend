const twilio = require('twilio');
const axios = require('axios');

class SMSService {
  constructor() {
    // Only initialize Twilio if proper credentials are provided
    if (process.env.TWILIO_ACCOUNT_SID && 
        process.env.TWILIO_ACCOUNT_SID.startsWith('AC') &&
        process.env.TWILIO_AUTH_TOKEN && 
        process.env.TWILIO_AUTH_TOKEN !== 'your-twilio-auth-token') {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
      this.isConfigured = true;
    } else {
      console.log('⚠️  Twilio not configured - SMS notifications will be skipped');
      this.isConfigured = false;
    }
  }

  async sendNotificationSMS(notification) {
    try {
      if (!this.isConfigured) {
        console.log('📱 SMS notification skipped - Twilio not configured');
        return { 
          success: false, 
          message: 'Twilio not configured',
          skipped: true 
        };
      }

      // Get recipient phone from user service
      const recipientResponse = await axios.get(
        `${process.env.AUTH_SERVICE_URL}/api/users/${notification.recipientId}`
      );
      
      const recipient = recipientResponse.data.data.user;
      
      if (!recipient.phone) {
        throw new Error('Recipient phone number not found');
      }

      const message = this.formatSMSMessage(notification);

      await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: recipient.phone
      });

      console.log(`SMS sent to ${recipient.phone} for notification ${notification._id}`);
      
    } catch (error) {
      console.error('SMS sending error:', error);
      throw error;
    }
  }

  formatSMSMessage(notification) {
    const maxLength = 160;
    let message = `${notification.title}\n\n${notification.message}`;

    if (message.length > maxLength) {
      message = message.substring(0, maxLength - 3) + '...';
    }

    return message;
  }

  async sendBookingReminder(booking, recipient) {
    try {
      const message = `Reminder: You have a ${booking.serviceDetails.title} appointment tomorrow at ${booking.timeSlot.start}. Location: ${booking.location.address}`;

      await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: recipient.phone
      });

      console.log(`Booking reminder SMS sent to ${recipient.phone}`);
      
    } catch (error) {
      console.error('Booking reminder SMS error:', error);
      throw error;
    }
  }
}

module.exports = new SMSService();
