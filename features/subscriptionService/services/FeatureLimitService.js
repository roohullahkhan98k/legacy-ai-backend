const FeatureLimit = require('../models/FeatureLimit');
const UserFeatureUsage = require('../models/UserFeatureUsage');
const Subscription = require('../models/Subscription');
const { Op } = require('sequelize');

class FeatureLimitService {
  /**
   * Get current month period (start and end dates)
   */
  getCurrentPeriod() {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { periodStart, periodEnd };
  }

  /**
   * Get user's subscription plan
   */
  async getUserPlan(userId) {
    const subscription = await Subscription.findOne({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });

    if (!subscription) {
      console.log(`[FeatureLimit] No subscription found for user ${userId} - returning free`);
      return 'free';
    }

    console.log(`[FeatureLimit] Found subscription for user ${userId}: plan=${subscription.plan_type}, status=${subscription.status}, cancel_at_period_end=${subscription.cancel_at_period_end}`);

    // Check if subscription is active
    // If cancel_at_period_end is true, user still has access until period ends (status should still be 'active' from Stripe)
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      console.log(`[FeatureLimit] User ${userId} has active subscription: ${subscription.plan_type}`);
      return subscription.plan_type;
    }

    // If subscription exists but status is not active, log it for debugging
    console.log(`[FeatureLimit] User ${userId} has subscription but status is '${subscription.status}' - returning free`);
    return 'free';
  }

  /**
   * Get feature limit for a plan
   */
  async getFeatureLimit(planType, featureName) {
    // Handle 'free' plan without querying database (not in ENUM)
    if (planType === 'free') {
      const defaults = {
        voice_clones: 0,
        avatar_generations: 0,
        memory_graph_operations: 0,
        interview_sessions: 0,
        multimedia_uploads: 0
      };
      return { limit_value: defaults[featureName] ?? 0, limit_type: 'monthly' };
    }

    // Query database for paid plans
    const limit = await FeatureLimit.findOne({
      where: {
        plan_type: planType,
        feature_name: featureName
      }
    });

    if (!limit) {
      // Default limits if not configured in database
      const defaults = {
        personal: { voice_clones: 1, avatar_generations: 1, memory_graph_operations: 1, interview_sessions: 1, multimedia_uploads: 1 },
        premium: { voice_clones: 20, avatar_generations: 20, memory_graph_operations: 200, interview_sessions: 50, multimedia_uploads: 100 },
        ultimate: { voice_clones: -1, avatar_generations: -1, memory_graph_operations: -1, interview_sessions: -1, multimedia_uploads: -1 }
      };

      const defaultLimit = defaults[planType]?.[featureName] ?? 0;
      return { limit_value: defaultLimit, limit_type: 'monthly' };
    }

    return limit;
  }

  /**
   * Get user's current usage for a feature
   */
  async getUserUsage(userId, featureName) {
    const { periodStart, periodEnd } = this.getCurrentPeriod();

    const usage = await UserFeatureUsage.findOne({
      where: {
        user_id: userId,
        feature_name: featureName,
        period_start: {
          [Op.gte]: periodStart
        },
        period_end: {
          [Op.lte]: periodEnd
        }
      }
    });

    return usage ? usage.usage_count : 0;
  }

  /**
   * Check if user can use a feature (returns { allowed, remaining, limit, currentUsage, hasSubscription, needsSubscription, limitReached })
   */
  async checkLimit(userId, featureName) {
    try {
      const planType = await this.getUserPlan(userId);
      
      // Check if user has active subscription
      const hasSubscription = planType !== 'free';
      
      // If no subscription, block access
      if (!hasSubscription) {
        return {
          allowed: false,
          remaining: 0,
          limit: 0,
          currentUsage: 0,
          plan: 'free',
          hasSubscription: false,
          needsSubscription: true,
          limitReached: false,
          message: 'Subscription required to use this feature'
        };
      }
      
      const limit = await this.getFeatureLimit(planType, featureName);
      const currentUsage = await this.getUserUsage(userId, featureName);

      // -1 means unlimited
      if (limit.limit_value === -1) {
        return {
          allowed: true,
          remaining: -1, // unlimited
          limit: -1,
          currentUsage: currentUsage,
          plan: planType,
          hasSubscription: true,
          needsSubscription: false,
          limitReached: false
        };
      }

      const remaining = Math.max(0, limit.limit_value - currentUsage);
      const allowed = currentUsage < limit.limit_value;
      const limitReached = !allowed;

      return {
        allowed,
        remaining,
        limit: limit.limit_value,
        currentUsage,
        plan: planType,
        hasSubscription: true,
        needsSubscription: false,
        limitReached: limitReached,
        message: limitReached ? `You have reached your ${featureName} limit (${limit.limit_value}). Upgrade your plan to continue.` : null
      };
    } catch (error) {
      console.error(`[FeatureLimit] Error checking limit for user ${userId}, feature ${featureName}:`, error);
      // Fail closed - block usage if there's an error (safer)
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        currentUsage: 0,
        plan: 'free',
        hasSubscription: false,
        needsSubscription: true,
        limitReached: false,
        error: error.message
      };
    }
  }

  /**
   * Record feature usage (increment count)
   */
  async recordUsage(userId, featureName, metadata = {}) {
    try {
      const { periodStart, periodEnd } = this.getCurrentPeriod();

      // Find or create usage record
      const [usage, created] = await UserFeatureUsage.findOrCreate({
        where: {
          user_id: userId,
          feature_name: featureName,
          period_start: periodStart,
          period_end: periodEnd
        },
        defaults: {
          user_id: userId,
          feature_name: featureName,
          usage_count: 1,
          period_start: periodStart,
          period_end: periodEnd,
          metadata: metadata
        }
      });

      if (!created) {
        // Increment existing usage
        await usage.update({
          usage_count: usage.usage_count + 1,
          metadata: { ...usage.metadata, ...metadata }
        });
      }

      return usage;
    } catch (error) {
      console.error(`[FeatureLimit] Error recording usage for user ${userId}, feature ${featureName}:`, error);
      throw error;
    }
  }

  /**
   * Refund feature usage (decrement count) when item is deleted
   * Note: Interview sessions are NOT refunded as they're counted when started
   */
  async refundUsage(userId, featureName) {
    try {
      // Don't refund interview sessions - they're counted when started, not when deleted
      if (featureName === 'interview_sessions') {
        console.log(`[FeatureLimit] Skipping refund for ${featureName} - not refundable`);
        return;
      }

      const { periodStart, periodEnd } = this.getCurrentPeriod();

      // Find usage record for current period
      const usage = await UserFeatureUsage.findOne({
        where: {
          user_id: userId,
          feature_name: featureName,
          period_start: periodStart,
          period_end: periodEnd
        }
      });

      if (usage && usage.usage_count > 0) {
        // Decrement usage count (don't go below 0)
        await usage.update({
          usage_count: Math.max(0, usage.usage_count - 1)
        });
        console.log(`✅ [FeatureLimit] Refunded 1 usage for user ${userId}, feature ${featureName}. New count: ${usage.usage_count - 1}`);
      } else {
        console.log(`⚠️  [FeatureLimit] No usage record found to refund for user ${userId}, feature ${featureName}`);
      }

      return usage;
    } catch (error) {
      console.error(`[FeatureLimit] Error refunding usage for user ${userId}, feature ${featureName}:`, error);
      // Don't throw - refund failure shouldn't block deletion
    }
  }

  /**
   * Handle plan change - adjust usage based on new plan limits
   * When user switches plans mid-month, calculate remaining based on new plan minus what was used
   */
  async handlePlanChange(userId, oldPlan, newPlan) {
    try {
      const { periodStart, periodEnd } = this.getCurrentPeriod();
      const features = ['voice_clones', 'avatar_generations', 'memory_graph_operations', 'interview_sessions', 'multimedia_uploads'];

      for (const featureName of features) {
        // Get current usage
        const currentUsage = await this.getUserUsage(userId, featureName);
        
        // Get new plan limit
        const newLimit = await this.getFeatureLimit(newPlan, featureName);
        
        // If new plan has unlimited, no adjustment needed
        if (newLimit.limit_value === -1) {
          continue;
        }

        // If user used more than new plan allows, cap it at the new limit
        // But don't reduce their usage - they already used it
        // The limit check will prevent further usage
        // This ensures they get what they paid for in the new plan, minus what they already used

        // Find usage record
        const usage = await UserFeatureUsage.findOne({
          where: {
            user_id: userId,
            feature_name: featureName,
            period_start: periodStart,
            period_end: periodEnd
          }
        });

        if (usage) {
          // Update metadata to track plan change
          await usage.update({
            metadata: {
              ...usage.metadata,
              plan_changes: [
                ...(usage.metadata.plan_changes || []),
                {
                  from: oldPlan,
                  to: newPlan,
                  changed_at: new Date(),
                  usage_at_change: currentUsage,
                  new_limit: newLimit.limit_value
                }
              ]
            }
          });
        }
      }

      console.log(`✅ [FeatureLimit] Plan change handled for user ${userId}: ${oldPlan} -> ${newPlan}`);
    } catch (error) {
      console.error(`[FeatureLimit] Error handling plan change for user ${userId}:`, error);
    }
  }

  /**
   * Get all usage stats for a user (for dashboard)
   */
  async getUserUsageStats(userId) {
    try {
      const planType = await this.getUserPlan(userId);
      const features = ['voice_clones', 'avatar_generations', 'memory_graph_operations', 'interview_sessions', 'multimedia_uploads'];
      const stats = {};

      for (const featureName of features) {
        const limit = await this.getFeatureLimit(planType, featureName);
        const currentUsage = await this.getUserUsage(userId, featureName);
        const remaining = limit.limit_value === -1 ? -1 : Math.max(0, limit.limit_value - currentUsage);

        stats[featureName] = {
          limit: limit.limit_value,
          currentUsage,
          remaining,
          isUnlimited: limit.limit_value === -1,
          percentage: limit.limit_value === -1 ? 0 : Math.min(100, Math.round((currentUsage / limit.limit_value) * 100))
        };
      }

      return {
        plan: planType,
        stats
      };
    } catch (error) {
      console.error(`[FeatureLimit] Error getting usage stats for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Initialize default limits (run once on startup)
   */
  async initializeDefaultLimits() {
    try {
      const defaults = [
        // Personal plan
        { plan_type: 'personal', feature_name: 'voice_clones', limit_value: 1, limit_type: 'monthly' },
        { plan_type: 'personal', feature_name: 'avatar_generations', limit_value: 1, limit_type: 'monthly' },
        { plan_type: 'personal', feature_name: 'memory_graph_operations', limit_value: 1, limit_type: 'monthly' },
        { plan_type: 'personal', feature_name: 'interview_sessions', limit_value: 1, limit_type: 'monthly' },
        { plan_type: 'personal', feature_name: 'multimedia_uploads', limit_value: 1, limit_type: 'monthly' },
        
        // Premium plan
        { plan_type: 'premium', feature_name: 'voice_clones', limit_value: 20, limit_type: 'monthly' },
        { plan_type: 'premium', feature_name: 'avatar_generations', limit_value: 20, limit_type: 'monthly' },
        { plan_type: 'premium', feature_name: 'memory_graph_operations', limit_value: 200, limit_type: 'monthly' },
        { plan_type: 'premium', feature_name: 'interview_sessions', limit_value: 50, limit_type: 'monthly' },
        { plan_type: 'premium', feature_name: 'multimedia_uploads', limit_value: 100, limit_type: 'monthly' },
        
        // Ultimate plan
        { plan_type: 'ultimate', feature_name: 'voice_clones', limit_value: -1, limit_type: 'monthly' },
        { plan_type: 'ultimate', feature_name: 'avatar_generations', limit_value: -1, limit_type: 'monthly' },
        { plan_type: 'ultimate', feature_name: 'memory_graph_operations', limit_value: -1, limit_type: 'monthly' },
        { plan_type: 'ultimate', feature_name: 'interview_sessions', limit_value: -1, limit_type: 'monthly' },
        { plan_type: 'ultimate', feature_name: 'multimedia_uploads', limit_value: -1, limit_type: 'monthly' }
      ];

      for (const defaultLimit of defaults) {
        const [limit, created] = await FeatureLimit.findOrCreate({
          where: {
            plan_type: defaultLimit.plan_type,
            feature_name: defaultLimit.feature_name
          },
          defaults: defaultLimit
        });
        
        // Update existing record if it was found (not created)
        if (!created) {
          await limit.update({
            limit_value: defaultLimit.limit_value,
            limit_type: defaultLimit.limit_type
          });
        }
      }

      console.log('✅ [FeatureLimit] Default limits initialized');
    } catch (error) {
      console.error('[FeatureLimit] Error initializing default limits:', error);
    }
  }
}

module.exports = new FeatureLimitService();

