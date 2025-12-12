const Subscription = require('../../subscriptionService/models/Subscription');
const User = require('../../../common/models/User');
const { Op } = require('sequelize');
const { sequelize } = require('../../../common/database');

class AdminSubscriptionController {
  /**
   * GET /api/admin/subscriptions
   * Get all subscriptions with pagination and filters
   */
  async getAllSubscriptions(req, res) {
    try {
      const { page = 1, limit = 20, status = '', planType = '', search = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause
      const where = {};
      
      if (status) {
        where.status = status;
      }

      if (planType) {
        where.plan_type = planType;
      }

      // Get subscriptions
      const { count, rows: subscriptions } = await Subscription.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']]
      });

      // Get user info for subscriptions
      const userIds = [...new Set(subscriptions.map(s => s.user_id))];
      const users = await User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ['id', 'email', 'username', 'firstName', 'lastName']
      });
      const userMap = new Map(users.map(u => [u.id, u]));

      // If search provided, filter by user email/username
      let filteredSubscriptions = subscriptions;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredSubscriptions = subscriptions.filter(sub => {
          const user = userMap.get(sub.user_id);
          if (!user) return false;
          return user.email.toLowerCase().includes(searchLower) ||
                 user.username.toLowerCase().includes(searchLower) ||
                 (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
                 (user.lastName && user.lastName.toLowerCase().includes(searchLower));
        });
      }

      // Format response
      const subscriptionsWithUsers = filteredSubscriptions.map(sub => {
        const user = userMap.get(sub.user_id);
        return {
          ...sub.toJSON(),
          user: user ? {
            id: user.id,
            email: user.email,
            username: user.username,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
          } : null
        };
      });

      res.json({
        success: true,
        subscriptions: subscriptionsWithUsers,
        pagination: {
          total: search ? filteredSubscriptions.length : count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil((search ? filteredSubscriptions.length : count) / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('[Admin] Error getting subscriptions:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/admin/subscriptions/:id
   * Get single subscription by ID
   */
  async getSubscriptionById(req, res) {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findByPk(id);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
      }

      // Get user info
      const user = await User.findByPk(subscription.user_id, {
        attributes: { exclude: ['password'] }
      });

      res.json({
        success: true,
        subscription: {
          ...subscription.toJSON(),
          user: user ? user.toJSON() : null
        }
      });
    } catch (error) {
      console.error('[Admin] Error getting subscription:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/admin/subscriptions/:id
   * Update subscription (status, plan type, etc.)
   */
  async updateSubscription(req, res) {
    try {
      const { id } = req.params;
      const { status, plan_type, current_period_start, current_period_end, cancel_at_period_end } = req.body;

      const subscription = await Subscription.findByPk(id);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
      }

      // Validate status if provided
      if (status && !['active', 'inactive', 'trialing', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }

      // Validate plan type if provided
      if (plan_type && !['personal', 'premium', 'ultimate'].includes(plan_type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid plan type'
        });
      }

      // Update fields
      const updateData = {};
      if (status !== undefined) updateData.status = status;
      if (plan_type !== undefined) updateData.plan_type = plan_type;
      if (current_period_start !== undefined) updateData.current_period_start = current_period_start;
      if (current_period_end !== undefined) updateData.current_period_end = current_period_end;
      if (cancel_at_period_end !== undefined) updateData.cancel_at_period_end = cancel_at_period_end;

      await subscription.update(updateData);

      console.log(`[Admin] Subscription updated by ${req.user.id}:`, id);

      res.json({
        success: true,
        subscription: subscription.toJSON()
      });
    } catch (error) {
      console.error('[Admin] Error updating subscription:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/admin/subscriptions/:id
   * Delete subscription (use with caution - may need to handle Stripe)
   */
  async deleteSubscription(req, res) {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findByPk(id);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
      }

      // Note: In production, you might want to cancel the Stripe subscription first
      // For now, we'll just delete the database record
      await subscription.destroy();

      console.log(`[Admin] Subscription deleted by ${req.user.id}:`, id);

      res.json({
        success: true,
        message: 'Subscription deleted successfully'
      });
    } catch (error) {
      console.error('[Admin] Error deleting subscription:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Note: To get user's subscription info, use GET /api/admin/users/:id
  // That endpoint already returns subscription information in the user details
}

module.exports = new AdminSubscriptionController();

