const express = require('express');
const router = express.Router();
const { AuthController } = require('./authController');
const { handleProfilePictureUpload } = require('../middleware/upload');

// Only 2 APIs needed
router.post('/register', handleProfilePictureUpload, AuthController.register);
router.post('/login', AuthController.login);

// Export routes
module.exports = {
  authRoutes: router
};

