const express = require('express');
const router = express.Router();
const { AuthController } = require('./authController');
const { handleProfilePictureUpload } = require('../middleware/upload');

const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 password reset requests per hour
  message: 'Too many password reset requests from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

// Only 2 APIs needed
router.post('/register', handleProfilePictureUpload, AuthController.register);
router.post('/login', AuthController.login);
router.post('/forgot-password', resetLimiter, AuthController.forgotPassword);
router.post('/reset-password/:token', resetLimiter, AuthController.resetPassword);

// Export routes
module.exports = {
  authRoutes: router
};

