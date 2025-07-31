const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { successResponse, errorResponse } = require('../../../shared/utils/responses');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Register new user
const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, businessName, businessDescription, categories, location } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'User already exists with this email', 400);
    }

    // Create user data
    const userData = {
      name,
      email,
      password,
      role,
      phone,
      location
    };

    // Add provider-specific fields
    if (role === 'provider') {
      userData.businessName = businessName;
      userData.businessDescription = businessDescription;
      userData.categories = categories;
    }

    // Create user
    const user = new User(userData);
    
    // Generate verification token
    const verificationToken = user.generateVerificationToken();
    
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    // TODO: Send verification email
    // await sendVerificationEmail(user.email, verificationToken);

    successResponse(res, {
      user,
      token,
      message: 'Registration successful. Please check your email for verification.'
    }, 'User registered successfully', 201);

  } catch (error) {
    console.error('Registration error:', error);
    errorResponse(res, 'Registration failed', 500);
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse(res, 'Account has been deactivated', 401);
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    successResponse(res, {
      user,
      token
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    errorResponse(res, 'Login failed', 500);
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    successResponse(res, { user }, 'Profile retrieved successfully');
  } catch (error) {
    console.error('Get profile error:', error);
    errorResponse(res, 'Failed to retrieve profile', 500);
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, location, businessName, businessDescription, categories } = req.body;
    
    const updateData = {
      name,
      phone,
      location
    };

    // Add provider-specific fields if user is a provider
    const user = await User.findById(req.user.userId);
    if (user.role === 'provider') {
      updateData.businessName = businessName;
      updateData.businessDescription = businessDescription;
      updateData.categories = categories;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return errorResponse(res, 'User not found', 404);
    }

    successResponse(res, { user: updatedUser }, 'Profile updated successfully');
  } catch (error) {
    console.error('Update profile error:', error);
    errorResponse(res, 'Failed to update profile', 500);
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId).select('+password');
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return errorResponse(res, 'Current password is incorrect', 400);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    successResponse(res, null, 'Password changed successfully');
  } catch (error) {
    console.error('Change password error:', error);
    errorResponse(res, 'Failed to change password', 500);
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 'User not found with this email', 404);
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // TODO: Send password reset email
    // await sendPasswordResetEmail(user.email, resetToken);

    successResponse(res, null, 'Password reset email sent');
  } catch (error) {
    console.error('Forgot password error:', error);
    errorResponse(res, 'Failed to process password reset request', 500);
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return errorResponse(res, 'Invalid or expired reset token', 400);
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    successResponse(res, null, 'Password reset successful');
  } catch (error) {
    console.error('Reset password error:', error);
    errorResponse(res, 'Failed to reset password', 500);
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return errorResponse(res, 'Invalid or expired verification token', 400);
    }

    // Verify user
    user.verified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    successResponse(res, null, 'Email verified successfully');
  } catch (error) {
    console.error('Email verification error:', error);
    errorResponse(res, 'Failed to verify email', 500);
  }
};

// Verify JWT token (for other services)
const verifyToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return errorResponse(res, 'Token is required', 400);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return errorResponse(res, 'Invalid token or user not found', 401);
    }

    successResponse(res, { user, decoded }, 'Token verified successfully');
  } catch (error) {
    console.error('Token verification error:', error);
    errorResponse(res, 'Invalid token', 401);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verifyToken
};
