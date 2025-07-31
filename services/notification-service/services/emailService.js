const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    this.templates = new Map();
    this.loadTemplates();
  }

  loadTemplates() {
    const templatesDir = path.join(__dirname, '../templates');
    
    // Load email templates
    const templateFiles = [
      'booking-confirmation.hbs',
      'booking-reminder.hbs',
      'review-received.hbs',
      'password-reset.hbs',
      'welcome.hbs',
      'notification.hbs'
    ];

    templateFiles.forEach(file => {
      try {
        const templatePath = path.join(templatesDir, file);
        if (fs.existsSync(templatePath)) {
          const templateContent = fs.readFileSync(templatePath, 'utf8');
          const compiled = handlebars.compile(templateContent);
          this.templates.set(file.replace('.hbs', ''), compiled);
        }
      } catch (error) {
        console.error(`Error loading template ${file}:`, error);
      }
    });
  }

  async sendNotificationEmail(notification) {
    try {
      // Get recipient email from user service
      const recipientResponse = await axios.get(
        `${process.env.AUTH_SERVICE_URL}/api/users/${notification.recipientId}`
      );
      
      const recipient = recipientResponse.data.data.user;
      
      if (!recipient.email) {
        throw new Error('Recipient email not found');
      }

      // Get appropriate template
      const templateName = this.getTemplateForNotificationType(notification.type);
      const template = this.templates.get(templateName) || this.templates.get('notification');

      const html = template({
        title: notification.title,
        message: notification.message,
        recipientName: recipient.name,
        data: notification.data,
        year: new Date().getFullYear()
      });

      const mailOptions = {
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: recipient.email,
        subject: notification.title,
        html
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${recipient.email} for notification ${notification._id}`);
      
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(user) {
    try {
      const template = this.templates.get('welcome');
      
      const html = template({
        name: user.name,
        role: user.role,
        year: new Date().getFullYear()
      });

      const mailOptions = {
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: user.email,
        subject: 'Welcome to LocalConnect!',
        html
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${user.email}`);
      
    } catch (error) {
      console.error('Welcome email error:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(user, resetToken) {
    try {
      const template = this.templates.get('password-reset');
      
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      const html = template({
        name: user.name,
        resetUrl,
        year: new Date().getFullYear()
      });

      const mailOptions = {
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: user.email,
        subject: 'Reset Your Password - LocalConnect',
        html
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${user.email}`);
      
    } catch (error) {
      console.error('Password reset email error:', error);
      throw error;
    }
  }

  getTemplateForNotificationType(type) {
    const templateMap = {
      'booking_request': 'booking-confirmation',
      'booking_confirmed': 'booking-confirmation',
      'booking_reminder': 'booking-reminder',
      'review_received': 'review-received',
      'password_reset': 'password-reset'
    };

    return templateMap[type] || 'notification';
  }
}

module.exports = new EmailService();
