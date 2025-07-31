const express = require('express');
const {
  createNotification,
  getUserNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  bulkSendNotifications
} = require('../controllers/notificationController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Public routes (no authentication required)
router.post('/test-email', testEmailRoute);
router.post('/welcome', sendWelcomeEmail);
router.post('/booking-confirmation', sendBookingConfirmation);
router.post('/booking-update', sendBookingUpdate);
router.post('/service-inquiry', sendServiceInquiry);
router.post('/review-notification', sendReviewNotification);

// Protected routes (authentication required)
router.use(authenticateToken);

// User notification routes
router.get('/', getUserNotifications);
router.get('/preferences', getNotificationPreferences);
router.put('/preferences', updateNotificationPreferences);
router.patch('/mark-all-read', markAllAsRead);
router.get('/:id', getNotificationById);
router.patch('/:id/read', markAsRead);
router.patch('/:id/archive', archiveNotification);

// Admin/System routes
router.post('/', authorizeRoles('admin', 'system'), createNotification);
router.post('/bulk', authorizeRoles('admin'), bulkSendNotifications);

// LocalConnect Email Functions

// Test email function
async function testEmailRoute(req, res) {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    const testEmail = {
      to,
      subject: '🧪 LocalConnect Email Test',
      html: generateTestEmailTemplate(),
      text: `LocalConnect Email Test Successful! Test time: ${new Date().toISOString()}`
    };

    const result = await emailService.sendEmail(testEmail);

    res.json({
      success: true,
      message: 'Test email sent successfully',
      data: {
        messageId: result.messageId,
        to: to,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
}

// Welcome email for new users
async function sendWelcomeEmail(req, res) {
  try {
    const { user } = req.body;
    
    if (!user || !user.email || !user.name) {
      return res.status(400).json({
        success: false,
        message: 'User details (email, name) are required'
      });
    }

    const welcomeEmail = {
      to: user.email,
      subject: `🎉 Welcome to LocalConnect, ${user.name}!`,
      html: generateWelcomeEmailTemplate(user),
      text: `Welcome to LocalConnect, ${user.name}! Start connecting with local service providers in your area.`
    };

    const result = await emailService.sendEmail(welcomeEmail);

    res.json({
      success: true,
      message: 'Welcome email sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Welcome email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send welcome email',
      error: error.message
    });
  }
}

// Booking confirmation email
async function sendBookingConfirmation(req, res) {
  try {
    const { booking, customer, provider, service } = req.body;
    
    if (!booking || !customer || !provider || !service) {
      return res.status(400).json({
        success: false,
        message: 'Booking details are required'
      });
    }

    // Send email to customer
    const customerEmail = {
      to: customer.email,
      subject: `📅 Booking Confirmed - ${service.title}`,
      html: generateBookingConfirmationTemplate(booking, customer, provider, service, 'customer'),
      text: `Your booking has been confirmed! Service: ${service.title}, Provider: ${provider.name}`
    };

    // Send email to provider
    const providerEmail = {
      to: provider.email,
      subject: `📋 New Booking Request - ${service.title}`,
      html: generateBookingConfirmationTemplate(booking, customer, provider, service, 'provider'),
      text: `New booking request from ${customer.name} for ${service.title}`
    };

    const customerResult = await emailService.sendEmail(customerEmail);
    const providerResult = await emailService.sendEmail(providerEmail);

    res.json({
      success: true,
      message: 'Booking confirmation emails sent successfully',
      data: {
        customer: customerResult,
        provider: providerResult
      }
    });
  } catch (error) {
    console.error('Booking confirmation email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send booking confirmation emails',
      error: error.message
    });
  }
}

// Booking status update email
async function sendBookingUpdate(req, res) {
  try {
    const { booking, user, status, message } = req.body;
    
    if (!booking || !user || !status) {
      return res.status(400).json({
        success: false,
        message: 'Booking update details are required'
      });
    }

    const updateEmail = {
      to: user.email,
      subject: `📱 Booking Update - ${booking.serviceTitle}`,
      html: generateBookingUpdateTemplate(booking, user, status, message),
      text: `Your booking for ${booking.serviceTitle} has been updated to: ${status}`
    };

    const result = await emailService.sendEmail(updateEmail);

    res.json({
      success: true,
      message: 'Booking update email sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Booking update email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send booking update email',
      error: error.message
    });
  }
}

// Service inquiry email
async function sendServiceInquiry(req, res) {
  try {
    const { inquiry, customer, provider, service } = req.body;
    
    if (!inquiry || !customer || !provider || !service) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry details are required'
      });
    }

    const inquiryEmail = {
      to: provider.email,
      subject: `❓ Service Inquiry - ${service.title}`,
      html: generateServiceInquiryTemplate(inquiry, customer, provider, service),
      text: `New inquiry from ${customer.name} about ${service.title}: ${inquiry.message}`
    };

    const result = await emailService.sendEmail(inquiryEmail);

    res.json({
      success: true,
      message: 'Service inquiry email sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Service inquiry email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send service inquiry email',
      error: error.message
    });
  }
}

// Review notification email
async function sendReviewNotification(req, res) {
  try {
    const { review, provider, customer, service } = req.body;
    
    if (!review || !provider || !customer || !service) {
      return res.status(400).json({
        success: false,
        message: 'Review details are required'
      });
    }

    const reviewEmail = {
      to: provider.email,
      subject: `⭐ New Review - ${service.title}`,
      html: generateReviewNotificationTemplate(review, provider, customer, service),
      text: `You received a ${review.rating}-star review from ${customer.name} for ${service.title}`
    };

    const result = await emailService.sendEmail(reviewEmail);

    res.json({
      success: true,
      message: 'Review notification email sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Review notification email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send review notification email',
      error: error.message
    });
  }
}

// Email Templates

function generateTestEmailTemplate() {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>LocalConnect Email Test</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .success-badge { background: #10B981; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 LocalConnect Email Test</h1>
            <p>Email system is working perfectly!</p>
          </div>
          <div class="content">
            <div class="success-badge">
              ✅ Your Gmail SMTP configuration is working perfectly!
            </div>
            <div class="info-box">
              <h3>📋 Configuration Details:</h3>
              <ul>
                <li><strong>SMTP Host:</strong> smtp.gmail.com</li>
                <li><strong>Port:</strong> 587 (STARTTLS)</li>
                <li><strong>From Email:</strong> ad.rainbowgardens@gmail.com</li>
                <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            <p>🚀 Your LocalConnect notification service is ready to send:</p>
            <ul>
              <li>Welcome emails for new users</li>
              <li>Booking confirmations and updates</li>
              <li>Service inquiries</li>
              <li>Review notifications</li>
              <li>Password reset emails</li>
            </ul>
          </div>
          <div class="footer">
            <p>© 2025 LocalConnect. Connecting you with local service providers.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateWelcomeEmailTemplate(user) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to LocalConnect</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .welcome-box { background: #f0f9ff; padding: 25px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .features { display: flex; flex-wrap: wrap; margin: 20px 0; }
          .feature { flex: 1; min-width: 200px; padding: 15px; margin: 5px; background: #f8f9fa; border-radius: 8px; }
          .cta-button { background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to LocalConnect!</h1>
            <p>Your gateway to local services</p>
          </div>
          <div class="content">
            <div class="welcome-box">
              <h2>Hello ${user.name}! 👋</h2>
              <p>Welcome to LocalConnect - the platform that connects you with trusted local service providers in your area.</p>
            </div>
            
            ${user.role === 'provider' ? `
              <h3>🛠️ As a Service Provider, you can:</h3>
              <div class="features">
                <div class="feature">
                  <h4>📝 Create Services</h4>
                  <p>List your services and showcase your expertise</p>
                </div>
                <div class="feature">
                  <h4>📅 Manage Bookings</h4>
                  <p>Handle appointments and communicate with customers</p>
                </div>
                <div class="feature">
                  <h4>⭐ Build Reputation</h4>
                  <p>Collect reviews and grow your business</p>
                </div>
              </div>
            ` : `
              <h3>🔍 As a Customer, you can:</h3>
              <div class="features">
                <div class="feature">
                  <h4>🔍 Find Services</h4>
                  <p>Search for local service providers in your area</p>
                </div>
                <div class="feature">
                  <h4>📱 Book Instantly</h4>
                  <p>Schedule appointments with trusted professionals</p>
                </div>
                <div class="feature">
                  <h4>⭐ Leave Reviews</h4>
                  <p>Share your experience and help others</p>
                </div>
              </div>
            `}
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="cta-button">
                Get Started Now 🚀
              </a>
            </div>
          </div>
          <div class="footer">
            <p>© 2025 LocalConnect. Connecting communities through local services.</p>
            <p>Need help? Contact us at support@localconnect.com</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateBookingConfirmationTemplate(booking, customer, provider, service, recipient) {
  const isCustomer = recipient === 'customer';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Booking ${isCustomer ? 'Confirmed' : 'Request'} - LocalConnect</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: ${isCustomer ? '#10B981' : '#3b82f6'}; color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .booking-card { background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 20px 0; border-left: 4px solid ${isCustomer ? '#10B981' : '#3b82f6'}; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
          .detail-label { font-weight: bold; color: #495057; }
          .status-badge { background: #fef3c7; color: #92400e; padding: 5px 15px; border-radius: 20px; font-size: 14px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isCustomer ? '📅 Booking Confirmed!' : '📋 New Booking Request'}</h1>
            <p>${isCustomer ? 'Your appointment has been scheduled' : 'You have a new service request'}</p>
          </div>
          <div class="content">
            <h2>Hello ${isCustomer ? customer.name : provider.name}! 👋</h2>
            
            <div class="booking-card">
              <h3>📋 Booking Details</h3>
              <div class="detail-row">
                <span class="detail-label">Booking ID:</span>
                <span>${booking.bookingNumber || booking._id}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Service:</span>
                <span>${service.title}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">${isCustomer ? 'Provider' : 'Customer'}:</span>
                <span>${isCustomer ? provider.name : customer.name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span>${new Date(booking.scheduledDate).toLocaleDateString()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span>${booking.scheduledTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span>${booking.duration} minutes</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span>$${booking.totalAmount}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="status-badge">${booking.status}</span>
              </div>
            </div>

            ${booking.notes ? `
              <div class="booking-card">
                <h3>📝 Special Notes</h3>
                <p>${booking.notes}</p>
              </div>
            ` : ''}

            <p>
              ${isCustomer 
                ? `The service provider will contact you shortly to confirm the details. You can manage your booking from your dashboard.`
                : `Please review the booking details and confirm your availability. You can update the booking status from your provider dashboard.`
              }
            </p>
          </div>
          <div class="footer">
            <p>© 2025 LocalConnect. Connecting communities through local services.</p>
            <p>Questions? Contact us at support@localconnect.com</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateBookingUpdateTemplate(booking, user, status, message) {
  const statusColors = {
    confirmed: '#10B981',
    'in-progress': '#3b82f6',
    completed: '#8b5cf6',
    cancelled: '#ef4444',
    rejected: '#f59e0b'
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Update - LocalConnect</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: ${statusColors[status] || '#6b7280'}; color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .update-card { background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 20px 0; border-left: 4px solid ${statusColors[status] || '#6b7280'}; }
          .status-badge { background: ${statusColors[status] || '#6b7280'}; color: white; padding: 8px 20px; border-radius: 25px; font-weight: bold; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📱 Booking Update</h1>
            <p>Your booking status has been updated</p>
          </div>
          <div class="content">
            <h2>Hello ${user.name}! 👋</h2>
            
            <div class="update-card">
              <h3>📋 Booking: ${booking.serviceTitle}</h3>
              <p><strong>Booking ID:</strong> ${booking.bookingNumber || booking._id}</p>
              <p><strong>New Status:</strong> <span class="status-badge">${status.toUpperCase()}</span></p>
              <p><strong>Date:</strong> ${new Date(booking.scheduledDate).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${booking.scheduledTime}</p>
              
              ${message ? `
                <div style="margin-top: 20px; padding: 15px; background: #e1f5fe; border-radius: 8px;">
                  <h4>💬 Message from ${status === 'cancelled' || status === 'rejected' ? 'Provider' : 'System'}:</h4>
                  <p>${message}</p>
                </div>
              ` : ''}
            </div>

            <p>You can view all your bookings and their current status in your LocalConnect dashboard.</p>
          </div>
          <div class="footer">
            <p>© 2025 LocalConnect. Connecting communities through local services.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateServiceInquiryTemplate(inquiry, customer, provider, service) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Service Inquiry - LocalConnect</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: #f59e0b; color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .inquiry-card { background: #fffbeb; padding: 25px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .customer-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❓ New Service Inquiry</h1>
            <p>A potential customer is interested in your service</p>
          </div>
          <div class="content">
            <h2>Hello ${provider.name}! 👋</h2>
            
            <div class="inquiry-card">
              <h3>📧 Inquiry Details</h3>
              <p><strong>Service:</strong> ${service.title}</p>
              <p><strong>Inquiry Date:</strong> ${new Date(inquiry.createdAt || Date.now()).toLocaleDateString()}</p>
              
              <div class="customer-info">
                <h4>👤 Customer Information</h4>
                <p><strong>Name:</strong> ${customer.name}</p>
                <p><strong>Email:</strong> ${customer.email}</p>
                ${customer.phone ? `<p><strong>Phone:</strong> ${customer.phone}</p>` : ''}
                ${customer.location ? `<p><strong>Location:</strong> ${customer.location.city}, ${customer.location.state}</p>` : ''}
              </div>

              <h4>💬 Customer Message:</h4>
              <div style="background: white; padding: 15px; border-radius: 8px; font-style: italic;">
                "${inquiry.message}"
              </div>

              ${inquiry.preferredDate ? `
                <p><strong>Preferred Date:</strong> ${new Date(inquiry.preferredDate).toLocaleDateString()}</p>
              ` : ''}
              
              ${inquiry.budget ? `
                <p><strong>Budget Range:</strong> $${inquiry.budget}</p>
              ` : ''}
            </div>

            <p>💡 <strong>Quick Response Tip:</strong> Customers who receive responses within 24 hours are 3x more likely to book!</p>
            
            <p>You can respond to this inquiry by contacting the customer directly or through your LocalConnect dashboard.</p>
          </div>
          <div class="footer">
            <p>© 2025 LocalConnect. Connecting communities through local services.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateReviewNotificationTemplate(review, provider, customer, service) {
  const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>New Review - LocalConnect</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: #8b5cf6; color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .review-card { background: #f3f4f6; padding: 25px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #8b5cf6; }
          .rating { font-size: 24px; margin: 15px 0; }
          .review-text { background: white; padding: 20px; border-radius: 8px; font-style: italic; margin: 15px 0; }
          .customer-info { background: #e5e7eb; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⭐ New Review Received!</h1>
            <p>A customer has left feedback for your service</p>
          </div>
          <div class="content">
            <h2>Hello ${provider.name}! 👋</h2>
            
            <div class="review-card">
              <h3>📝 Review for: ${service.title}</h3>
              
              <div class="rating">
                Rating: ${stars} (${review.rating}/5)
              </div>

              <div class="customer-info">
                <strong>👤 Reviewed by:</strong> ${customer.name}<br>
                <strong>📅 Review Date:</strong> ${new Date(review.createdAt || Date.now()).toLocaleDateString()}
              </div>

              ${review.comment ? `
                <h4>💬 Customer Feedback:</h4>
                <div class="review-text">
                  "${review.comment}"
                </div>
              ` : ''}

              ${review.rating >= 4 ? `
                <p style="color: #10B981; font-weight: bold;">🎉 Congratulations on the positive feedback!</p>
              ` : review.rating >= 3 ? `
                <p style="color: #f59e0b; font-weight: bold;">👍 Good work! Consider following up with the customer.</p>
              ` : `
                <p style="color: #ef4444; font-weight: bold;">📞 Consider reaching out to address any concerns.</p>
              `}
            </div>

            <p><strong>💡 Pro Tip:</strong> Responding to reviews shows future customers that you care about feedback and continuously improve your services.</p>
            
            <p>You can respond to this review from your LocalConnect dashboard.</p>
          </div>
          <div class="footer">
            <p>© 2025 LocalConnect. Connecting communities through local services.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

module.exports = router;
