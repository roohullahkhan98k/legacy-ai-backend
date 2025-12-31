const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getProfilePictureUrl } = require('../middleware/upload');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const { Op } = require('sequelize');


// JWT Configuration
const jwtConfig = {
  secret: process.env.JWT_SECRET || 'ai-prototype-super-secret-jwt-key-change-this-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'
};

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
    issuer: 'ai-prototype-app',
    audience: 'ai-prototype-users'
  });
};

// Generate refresh token
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.refreshExpiresIn,
    issuer: 'ai-prototype-app',
    audience: 'ai-prototype-refresh'
  });
};

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const { email, username, password, firstName, lastName } = req.body;
      const profilePictureFile = req.file;

      console.log('📝 Registration attempt:', { email, username, hasFile: !!profilePictureFile });
      if (profilePictureFile) {
        console.log('📁 File details:', {
          originalname: profilePictureFile.originalname,
          filename: profilePictureFile.filename,
          mimetype: profilePictureFile.mimetype,
          size: profilePictureFile.size
        });
      }

      // Validation
      if (!email || !username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email, username, and password are required'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Check if user already exists
      const existingUser = await User.findByEmailOrUsername(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email or username already exists'
        });
      }

      // Check if username is taken
      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          message: 'Username is already taken'
        });
      }

      // Create new user
      const userData = {
        email,
        username,
        password,
        firstName,
        lastName
      };

      // Add profile picture if uploaded
      if (profilePictureFile) {
        userData.avatar = getProfilePictureUrl(profilePictureFile.filename);
      }

      const user = await User.create(userData);

      // Generate tokens
      const tokenPayload = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      };

      const accessToken = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken({ id: user.id });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toJSON(),
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: '7d'
          }
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { identifier, password } = req.body;

      // Validation
      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email/username and password are required'
        });
      }

      // Find user by email or username
      const user = await User.findByEmailOrUsername(identifier);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email/username or password'
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Verify password
      const isPasswordValid = await user.validatePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email/username or password'
        });
      }

      // Update last login
      await user.update({ lastLogin: new Date() });

      // Generate tokens
      const tokenPayload = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      };

      const accessToken = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken({ id: user.id });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: '7d'
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  // Forgot Password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        // Security best practice: Don't reveal if user exists
        return res.status(200).json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        });
      }

      // Generate random token
      const resetToken = crypto.randomBytes(32).toString('hex');
      // Hash it for storage
      const resetPasswordTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Set expiration (1 hour)
      const resetPasswordExpires = Date.now() + 3600000;

      // Update user
      user.resetPasswordToken = resetPasswordTokenHash;
      user.resetPasswordExpires = resetPasswordExpires;
      await user.save();

      // Create reset URL
      // Assuming frontend is on standard Vite port or configured via env
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

      try {
        const displayName = user.username || user.firstName || 'User';
        await emailService.sendPasswordResetEmail(user.email, displayName, resetUrl);

        res.status(200).json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        });
      } catch (emailError) {
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        return res.status(500).json({
          success: false,
          message: 'Error sending email. Please try again later.'
        });
      }

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Something went wrong',
        error: error.message
      });
    }
  }

  // Reset Password
  async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Hash the token properly to compare with DB
      const resetPasswordTokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        where: {
          resetPasswordToken: resetPasswordTokenHash,
          resetPasswordExpires: { [Op.gt]: Date.now() } // Expires must be greater than now
        }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Password reset token is invalid or has expired'
        });
      }

      // Set new password
      user.password = password;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      // Log the user in directly? OR ask them to login. Flow usually asks to login.
      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. Please login with your new password.'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset failed',
        error: error.message
      });
    }
  }
}

// Export controller
module.exports = {
  AuthController: new AuthController()
};