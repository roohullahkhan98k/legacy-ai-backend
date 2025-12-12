const User = require('../../../common/models/User');
const Interview = require('../../aiInterviewEngine/models/Interview');
const MemoryNode = require('../../memoryGraphService/models/MemoryNode');
const { UserVoice, GeneratedAudio } = require('../../voiceCloningPlayback/models/VoiceCloning');
const { UserAvatar } = require('../../avatarService/models/Avatar');
const Subscription = require('../../subscriptionService/models/Subscription');
const UserFeatureUsage = require('../../subscriptionService/models/UserFeatureUsage');
const { MultimediaFile, MultimediaMemoryNode, MultimediaLink } = require('../../multimediaUpload/models/Multimedia');
const { Op } = require('sequelize');
const fs = require('fs').promises;
const path = require('path');

class AdminUserController {
  /**
   * GET /api/admin/users
   * Get all users with pagination and filters
   */
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 20, search = '', role = '', isActive = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause
      const where = {};
      
      if (search) {
        where[Op.or] = [
          { email: { [Op.iLike]: `%${search}%` } },
          { username: { [Op.iLike]: `%${search}%` } },
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (role) {
        where.role = role;
      }

      if (isActive !== '') {
        where.isActive = isActive === 'true';
      }

      const { count, rows: users } = await User.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']],
        attributes: { exclude: ['password'] } // Never return passwords
      });

      // Get subscriptions for all users in this page
      const userIds = users.map(u => u.id);
      const subscriptions = await Subscription.findAll({
        where: { user_id: { [Op.in]: userIds } },
        order: [['created_at', 'DESC']]
      });

      // Create subscription map (user_id -> subscription)
      const subscriptionMap = new Map();
      subscriptions.forEach(sub => {
        if (!subscriptionMap.has(sub.user_id)) {
          subscriptionMap.set(sub.user_id, sub);
        }
      });

      // Add subscription info to each user
      const usersWithSubscriptions = users.map(user => {
        const userData = user.toJSON();
        const subscription = subscriptionMap.get(user.id);
        userData.subscription = subscription ? {
          plan: subscription.plan_type,
          status: subscription.status,
          hasSubscription: true
        } : {
          hasSubscription: false,
          plan: null,
          status: null
        };
        return userData;
      });

      res.json({
        success: true,
        users: usersWithSubscriptions,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('[Admin] Error getting users:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/admin/users/:id
   * Get single user by ID with statistics
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get user statistics
      const [interviewsCount, memoriesCount, voicesCount, avatarsCount, subscription] = await Promise.all([
        Interview.count({ where: { user_id: id } }),
        MemoryNode.count({ where: { user_id: id } }),
        UserVoice.count({ where: { user_id: id } }),
        UserAvatar.count({ where: { user_id: id } }),
        Subscription.findOne({ where: { user_id: id }, order: [['created_at', 'DESC']] })
      ]);

      res.json({
        success: true,
        user,
        statistics: {
          interviews: interviewsCount,
          memories: memoriesCount,
          voices: voicesCount,
          avatars: avatarsCount,
          hasSubscription: !!subscription,
          subscription: subscription ? {
            plan: subscription.plan_type,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            stripe_subscription_id: subscription.stripe_subscription_id
          } : null
        }
      });
    } catch (error) {
      console.error('[Admin] Error getting user:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/admin/users
   * Create new user
   */
  async createUser(req, res) {
    try {
      const { email, username, password, firstName, lastName, role = 'user', isActive = true, isVerified = false } = req.body;

      // Validation
      if (!email || !username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email, username, and password are required'
        });
      }

      // Check if email or username already exists
      const existing = await User.findOne({
        where: {
          [Op.or]: [
            { email },
            { username }
          ]
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: existing.email === email ? 'Email already exists' : 'Username already exists'
        });
      }

      // Validate role
      if (!['user', 'admin', 'moderator'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role. Must be: user, admin, or moderator'
        });
      }

      // Create user (password will be hashed by User model hook)
      const user = await User.create({
        email,
        username,
        password, // Will be hashed automatically
        firstName,
        lastName,
        role,
        isActive,
        isVerified
      });

      console.log(`[Admin] User created by ${req.user.id}:`, user.id);

      res.status(201).json({
        success: true,
        user: user.toJSON() // This excludes password
      });
    } catch (error) {
      console.error('[Admin] Error creating user:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/admin/users/:id
   * Update user
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { email, username, password, firstName, lastName, role, isActive, isVerified, avatar } = req.body;

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Prevent admin from removing their own admin role
      if (req.user.id === id && role && role !== 'admin') {
        return res.status(400).json({
          success: false,
          error: 'You cannot remove your own admin role'
        });
      }

      // Check if email/username already exists (if changing)
      if (email || username) {
        const existing = await User.findOne({
          where: {
            id: { [Op.ne]: id },
            [Op.or]: [
              email ? { email } : {},
              username ? { username } : {}
            ].filter(obj => Object.keys(obj).length > 0)
          }
        });

        if (existing) {
          return res.status(400).json({
            success: false,
            error: existing.email === email ? 'Email already exists' : 'Username already exists'
          });
        }
      }

      // Validate role if provided
      if (role && !['user', 'admin', 'moderator'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role. Must be: user, admin, or moderator'
        });
      }

      // Update fields
      const updateData = {};
      if (email) updateData.email = email;
      if (username) updateData.username = username;
      if (password) updateData.password = password; // Will be hashed automatically
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isVerified !== undefined) updateData.isVerified = isVerified;
      if (avatar !== undefined) updateData.avatar = avatar;

      await user.update(updateData);

      console.log(`[Admin] User updated by ${req.user.id}:`, id);

      res.json({
        success: true,
        user: user.toJSON()
      });
    } catch (error) {
      console.error('[Admin] Error updating user:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/admin/users/:id
   * Delete user and ALL related data (CASCADE DELETE)
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Prevent admin from deleting themselves
      if (req.user.id === id) {
        return res.status(400).json({
          success: false,
          error: 'You cannot delete your own account'
        });
      }

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      console.log(`[Admin] Starting cascade delete for user ${id} by admin ${req.user.id}`);

      // Delete all related data
      const deleteResults = {
        interviews: 0,
        memories: 0,
        voices: 0,
        avatars: 0,
        subscriptions: 0,
        usage: 0
      };

      // 1. Delete interviews
      const interviews = await Interview.findAll({ where: { user_id: id } });
      for (const interview of interviews) {
        // Delete from ChromaDB if needed
        try {
          const chromaService = require('../../aiInterviewEngine/services/InterviewChromaService');
          await chromaService.deleteInterview(interview.id);
        } catch (err) {
          console.warn(`[Admin] Failed to delete interview from ChromaDB:`, err.message);
        }
      }
      deleteResults.interviews = await Interview.destroy({ where: { user_id: id } });

      // 2. Delete memory nodes
      const memories = await MemoryNode.findAll({ where: { user_id: id } });
      for (const memory of memories) {
        // Delete from ChromaDB if needed
        try {
          const chromaService = require('../../memoryGraphService/services/MemoryChromaService');
          await chromaService.deleteMemory(memory.id);
        } catch (err) {
          console.warn(`[Admin] Failed to delete memory from ChromaDB:`, err.message);
        }
      }
      deleteResults.memories = await MemoryNode.destroy({ where: { user_id: id } });

      // 3. Delete voice clones and generated audio
      deleteResults.voices = await UserVoice.destroy({ where: { user_id: id } });
      const generatedAudioCount = await GeneratedAudio.destroy({ where: { user_id: id } });
      deleteResults.generatedAudio = generatedAudioCount;

      // 4. Delete avatars
      const avatars = await UserAvatar.findAll({ where: { user_id: id } });
      for (const avatar of avatars) {
        // Delete avatar files if they exist
        try {
          if (avatar.model_path) {
            const modelPath = path.join(process.cwd(), avatar.model_path);
            await fs.unlink(modelPath).catch(() => {}); // Ignore if file doesn't exist
          }
          if (avatar.audio_path) {
            const audioPath = path.join(process.cwd(), avatar.audio_path);
            await fs.unlink(audioPath).catch(() => {});
          }
        } catch (err) {
          console.warn(`[Admin] Failed to delete avatar files:`, err.message);
        }
      }
      deleteResults.avatars = await UserAvatar.destroy({ where: { user_id: id } });

      // 5. Delete multimedia files and memory nodes
      const multimediaItems = await MultimediaFile.findAll({ where: { user_id: id } });
      for (const item of multimediaItems) {
        // Delete multimedia files if they exist
        try {
          if (item.file_path) {
            const filePath = path.join(process.cwd(), item.file_path);
            await fs.unlink(filePath).catch(() => {});
          }
        } catch (err) {
          console.warn(`[Admin] Failed to delete multimedia file:`, err.message);
        }
      }
      deleteResults.multimedia = await MultimediaFile.destroy({ where: { user_id: id } });
      deleteResults.multimediaNodes = await MultimediaMemoryNode.destroy({ where: { user_id: id } });
      deleteResults.multimediaLinks = await MultimediaLink.destroy({ where: { user_id: id } });

      // 6. Delete subscriptions (Stripe will handle webhook cleanup)
      deleteResults.subscriptions = await Subscription.destroy({ where: { user_id: id } });

      // 7. Delete feature usage records
      deleteResults.usage = await UserFeatureUsage.destroy({ where: { user_id: id } });

      // 8. Delete user profile picture if exists
      if (user.avatar && user.avatar.startsWith('/uploads/')) {
        try {
          const avatarPath = path.join(process.cwd(), user.avatar);
          await fs.unlink(avatarPath).catch(() => {}); // Ignore if file doesn't exist
        } catch (err) {
          console.warn(`[Admin] Failed to delete user avatar:`, err.message);
        }
      }

      // 9. Finally, delete the user
      await user.destroy();

      console.log(`[Admin] User ${id} deleted successfully. Deleted:`, deleteResults);

      res.json({
        success: true,
        message: 'User and all related data deleted successfully',
        deleted: {
          user: true,
          ...deleteResults
        }
      });
    } catch (error) {
      console.error('[Admin] Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new AdminUserController();

