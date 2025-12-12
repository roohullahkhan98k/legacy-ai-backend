const User = require('../../../common/models/User');
const Interview = require('../../aiInterviewEngine/models/Interview');
const MemoryNode = require('../../memoryGraphService/models/MemoryNode');
const { UserVoice, GeneratedAudio } = require('../../voiceCloningPlayback/models/VoiceCloning');
const { UserAvatar, AvatarAnimation } = require('../../avatarService/models/Avatar');
const Subscription = require('../../subscriptionService/models/Subscription');
const UserFeatureUsage = require('../../subscriptionService/models/UserFeatureUsage');
const { MultimediaFile, MultimediaMemoryNode, MultimediaLink } = require('../../multimediaUpload/models/Multimedia');
const { Op } = require('sequelize');
const { sequelize } = require('../../../common/database');

class AdminAnalyticsController {
  /**
   * GET /api/admin/analytics/dashboard
   * Get overall dashboard statistics
   */
  async getDashboard(req, res) {
    try {
      const { period = '30d' } = req.query; // 7d, 30d, 90d, 1y, all
      
      // Calculate date range
      const dateRange = this.getDateRange(period);
      
      // Total counts (all time)
      const [
        totalUsers,
        activeUsers,
        totalInterviews,
        completedInterviews,
        totalMemories,
        totalVoices,
        totalAvatars,
        totalMultimedia,
        totalSubscriptions,
        activeSubscriptions
      ] = await Promise.all([
        User.count(),
        User.count({ where: { isActive: true } }),
        Interview.count(),
        Interview.count({ where: { status: 'completed' } }),
        MemoryNode.count(),
        UserVoice.count(),
        UserAvatar.count(),
        MultimediaFile.count(),
        Subscription.count(),
        Subscription.count({ where: { status: 'active' } })
      ]);

      // Recent activity (within period)
      const [newUsers, newInterviews, newSubscriptions] = await Promise.all([
        User.count({ where: { created_at: { [Op.gte]: dateRange.start } } }),
        Interview.count({ where: { created_at: { [Op.gte]: dateRange.start } } }),
        Subscription.count({ where: { created_at: { [Op.gte]: dateRange.start } } })
      ]);

      // Subscription breakdown by plan
      const subscriptionsByPlan = await Subscription.findAll({
        attributes: [
          'plan_type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.literal("COUNT(CASE WHEN status = 'active' THEN 1 END)"), 'active_count']
        ],
        group: ['plan_type'],
        raw: true
      });

      const planBreakdown = {
        personal: { total: 0, active: 0 },
        premium: { total: 0, active: 0 },
        ultimate: { total: 0, active: 0 }
      };

      subscriptionsByPlan.forEach(plan => {
        if (planBreakdown[plan.plan_type]) {
          planBreakdown[plan.plan_type].total = parseInt(plan.count) || 0;
          planBreakdown[plan.plan_type].active = parseInt(plan.active_count) || 0;
        }
      });

      // User growth over time (for graph)
      const userGrowth = await this.getTimeSeriesData(User, dateRange.start, 'created_at');
      
      // Subscription growth over time
      const subscriptionGrowth = await this.getTimeSeriesData(Subscription, dateRange.start, 'created_at');

      // Feature usage summary
      const featureUsage = await UserFeatureUsage.findAll({
        attributes: [
          'feature_name',
          [sequelize.fn('SUM', sequelize.col('usage_count')), 'total_usage'],
          [sequelize.literal("COUNT(DISTINCT user_id)"), 'user_count']
        ],
        where: {
          period_start: { [Op.gte]: dateRange.start }
        },
        group: ['feature_name'],
        raw: true
      });

      const usageBreakdown = {};
      featureUsage.forEach(feature => {
        usageBreakdown[feature.feature_name] = {
          totalUsage: parseInt(feature.total_usage) || 0,
          activeUsers: parseInt(feature.user_count) || 0
        };
      });

      res.json({
        success: true,
        data: {
          overview: {
            totalUsers,
            activeUsers,
            newUsers,
            totalInterviews,
            completedInterviews,
            newInterviews,
            totalMemories,
            totalVoices,
            totalAvatars,
            totalMultimedia,
            totalSubscriptions,
            activeSubscriptions,
            newSubscriptions
          },
          subscriptions: {
            total: totalSubscriptions,
            active: activeSubscriptions,
            byPlan: planBreakdown,
            growth: subscriptionGrowth
          },
          userGrowth: userGrowth,
          featureUsage: usageBreakdown,
          period: period
        }
      });
    } catch (error) {
      console.error('[Admin] Error getting dashboard:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/admin/analytics/packages
   * Get detailed package/subscription analytics
   */
  async getPackageAnalytics(req, res) {
    try {
      const { period = '30d' } = req.query;
      const dateRange = this.getDateRange(period);

      // Get all subscriptions
      const subscriptions = await Subscription.findAll({
        order: [['created_at', 'DESC']],
        where: period !== 'all' ? {
          created_at: { [Op.gte]: dateRange.start }
        } : {}
      });

      // Get user info for subscriptions
      const userIds = [...new Set(subscriptions.map(s => s.user_id))];
      const users = await User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ['id', 'email', 'username', 'firstName', 'lastName']
      });
      const userMap = new Map(users.map(u => [u.id, u]));

      // Group by plan type
      const byPlan = {
        personal: [],
        premium: [],
        ultimate: []
      };

      subscriptions.forEach(sub => {
        const user = userMap.get(sub.user_id);
        const planData = {
          id: sub.id,
          userId: sub.user_id,
          user: user ? {
            email: user.email,
            username: user.username,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
          } : null,
          status: sub.status,
          planType: sub.plan_type,
          createdAt: sub.created_at,
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
          canceledAt: sub.canceled_at,
          cancelAtPeriodEnd: sub.cancel_at_period_end
        };

        if (byPlan[sub.plan_type]) {
          byPlan[sub.plan_type].push(planData);
        }
      });

      // Calculate statistics
      const stats = {
        total: subscriptions.length,
        byPlan: {
          personal: byPlan.personal.length,
          premium: byPlan.premium.length,
          ultimate: byPlan.ultimate.length
        },
        byStatus: {
          active: subscriptions.filter(s => s.status === 'active').length,
          inactive: subscriptions.filter(s => s.status === 'inactive').length,
          canceled: subscriptions.filter(s => s.status === 'canceled').length,
          trialing: subscriptions.filter(s => s.status === 'trialing').length,
          past_due: subscriptions.filter(s => s.status === 'past_due').length
        },
        recentPurchases: subscriptions
          .filter(s => s.status === 'active' || s.status === 'trialing')
          .slice(0, 10)
          .map(s => {
            const user = userMap.get(s.user_id);
            return {
              userId: s.user_id,
              user: user ? {
                email: user.email,
                username: user.username,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
              } : null,
              plan: s.plan_type,
              purchasedAt: s.created_at
            };
          })
      };

      // Subscription growth over time by plan
      const growthByPlan = {};
      for (const planType of ['personal', 'premium', 'ultimate']) {
        growthByPlan[planType] = await this.getTimeSeriesData(
          Subscription,
          dateRange.start,
          'created_at',
          { plan_type: planType }
        );
      }

      res.json({
        success: true,
        data: {
          subscriptions: byPlan,
          statistics: stats,
          growthByPlan: growthByPlan,
          period: period
        }
      });
    } catch (error) {
      console.error('[Admin] Error getting package analytics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/admin/analytics/usage
   * Get feature usage analytics
   */
  async getUsageAnalytics(req, res) {
    try {
      const { period = '30d' } = req.query;
      const dateRange = this.getDateRange(period);

      // Get all usage data
      const usage = await UserFeatureUsage.findAll({
        where: {
          period_start: { [Op.gte]: dateRange.start }
        },
        order: [['usage_count', 'DESC']]
      });

      // Get user info for usage records
      const userIds = [...new Set(usage.map(u => u.user_id))];
      const users = await User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ['id', 'email', 'username']
      });
      const userMap = new Map(users.map(u => [u.id, u]));

      // Group by feature
      const byFeature = {};
      usage.forEach(record => {
        if (!byFeature[record.feature_name]) {
          byFeature[record.feature_name] = [];
        }
        const user = userMap.get(record.user_id);
        byFeature[record.feature_name].push({
          userId: record.user_id,
          user: user ? {
            email: user.email,
            username: user.username
          } : null,
          usageCount: record.usage_count,
          periodStart: record.period_start,
          periodEnd: record.period_end
        });
      });

      // Calculate totals and top users
      const featureStats = {};
      Object.keys(byFeature).forEach(featureName => {
        const records = byFeature[featureName];
        const totalUsage = records.reduce((sum, r) => sum + (r.usageCount || 0), 0);
        const topUsers = records
          .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
          .slice(0, 10);

        featureStats[featureName] = {
          totalUsage,
          uniqueUsers: new Set(records.map(r => r.userId)).size,
          averageUsage: records.length > 0 ? totalUsage / records.length : 0,
          topUsers
        };
      });

      // Usage over time by feature
      const usageOverTime = {};
      for (const featureName of Object.keys(byFeature)) {
        const results = await UserFeatureUsage.findAll({
          attributes: [
            [sequelize.fn('DATE_TRUNC', 'day', sequelize.col('period_start')), 'date'],
            [sequelize.fn('SUM', sequelize.col('usage_count')), 'total']
          ],
          where: {
            feature_name: featureName,
            period_start: { [Op.gte]: dateRange.start }
          },
          group: [sequelize.fn('DATE_TRUNC', 'day', sequelize.col('period_start'))],
          order: [[sequelize.fn('DATE_TRUNC', 'day', sequelize.col('period_start')), 'ASC']],
          raw: true
        });
        
        usageOverTime[featureName] = results.map(r => ({
          date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
          total: parseInt(r.total) || 0
        }));
      }

      res.json({
        success: true,
        data: {
          byFeature,
          statistics: featureStats,
          usageOverTime,
          period: period
        }
      });
    } catch (error) {
      console.error('[Admin] Error getting usage analytics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/admin/analytics/users-activity
   * Get user activity analytics
   */
  async getUserActivity(req, res) {
    try {
      const { period = '30d' } = req.query;
      const dateRange = this.getDateRange(period);

      // Get most active users
      const [topUsersByInterviews, topUsersByMemories, topUsersByVoices, topUsersByAvatars, topUsersByMultimedia] = await Promise.all([
        Interview.findAll({
          attributes: [
            'user_id',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: {
            created_at: { [Op.gte]: dateRange.start },
            user_id: { [Op.ne]: null }
          },
          group: ['user_id'],
          order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
          limit: 10,
          raw: true
        }),
        MemoryNode.findAll({
          attributes: [
            'user_id',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: {
            created_at: { [Op.gte]: dateRange.start },
            user_id: { [Op.ne]: null }
          },
          group: ['user_id'],
          order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
          limit: 10,
          raw: true
        }),
        UserVoice.findAll({
          attributes: [
            'user_id',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: {
            created_at: { [Op.gte]: dateRange.start }
          },
          group: ['user_id'],
          order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
          limit: 10,
          raw: true
        }),
        UserAvatar.findAll({
          attributes: [
            'user_id',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: {
            created_at: { [Op.gte]: dateRange.start }
          },
          group: ['user_id'],
          order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
          limit: 10,
          raw: true
        }),
        MultimediaFile.findAll({
          attributes: [
            'user_id',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: {
            created_at: { [Op.gte]: dateRange.start }
          },
          group: ['user_id'],
          order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
          limit: 10,
          raw: true
        })
      ]);

      // Get user info for all top users
      const allUserIds = [
        ...topUsersByInterviews.map(r => r.user_id),
        ...topUsersByMemories.map(r => r.user_id),
        ...topUsersByVoices.map(r => r.user_id),
        ...topUsersByAvatars.map(r => r.user_id),
        ...topUsersByMultimedia.map(r => r.user_id)
      ];
      const uniqueUserIds = [...new Set(allUserIds.filter(id => id))];
      const users = await User.findAll({
        where: { id: { [Op.in]: uniqueUserIds } },
        attributes: ['id', 'email', 'username', 'firstName', 'lastName']
      });
      const userMap = new Map(users.map(u => [u.id, u]));

      // Format results
      const formatTopUsers = (results, type) => {
        return results.map(result => {
          const user = userMap.get(result.user_id);
          return {
            userId: result.user_id,
            user: user ? {
              id: user.id,
              email: user.email,
              username: user.username,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
            } : null,
            count: parseInt(result.count || 0),
            type
          };
        });
      };

      res.json({
        success: true,
        data: {
        topUsersByInterviews: formatTopUsers(topUsersByInterviews, 'interviews'),
        topUsersByMemories: formatTopUsers(topUsersByMemories, 'memories'),
        topUsersByVoices: formatTopUsers(topUsersByVoices, 'voices'),
        topUsersByAvatars: formatTopUsers(topUsersByAvatars, 'avatars'),
        topUsersByMultimedia: formatTopUsers(topUsersByMultimedia, 'multimedia'),
        period: period
        }
      });
    } catch (error) {
      console.error('[Admin] Error getting user activity:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/admin/analytics/content
   * Get content analytics (interviews, memories, voices, avatars, multimedia)
   */
  async getContentAnalytics(req, res) {
    try {
      const { period = '30d' } = req.query;
      const dateRange = this.getDateRange(period);

      // Content growth over time
      const [interviewsGrowth, memoriesGrowth, voicesGrowth, avatarsGrowth, multimediaGrowth] = await Promise.all([
        this.getTimeSeriesData(Interview, dateRange.start, 'created_at'),
        this.getTimeSeriesData(MemoryNode, dateRange.start, 'created_at'),
        this.getTimeSeriesData(UserVoice, dateRange.start, 'created_at'),
        this.getTimeSeriesData(UserAvatar, dateRange.start, 'created_at'),
        this.getTimeSeriesData(MultimediaFile, dateRange.start, 'created_at')
      ]);

      // Content statistics
      const stats = {
        interviews: {
          total: await Interview.count(),
          completed: await Interview.count({ where: { status: 'completed' } }),
          active: await Interview.count({ where: { status: 'active' } }),
          recent: await Interview.count({ where: { created_at: { [Op.gte]: dateRange.start } } }),
          growth: interviewsGrowth
        },
        memories: {
          total: await MemoryNode.count(),
          recent: await MemoryNode.count({ where: { created_at: { [Op.gte]: dateRange.start } } }),
          byCategory: {
            withPerson: await MemoryNode.count({ where: { person: { [Op.ne]: null } } }),
            withEvent: await MemoryNode.count({ where: { event: { [Op.ne]: null } } }),
            withTags: await MemoryNode.count({ 
              where: sequelize.literal("jsonb_array_length(tags) > 0")
            }),
            withMedia: await MemoryNode.count({ 
              where: sequelize.literal("jsonb_array_length(media) > 0")
            })
          },
          growth: memoriesGrowth
        },
        voices: {
          total: await UserVoice.count(),
          recent: await UserVoice.count({ where: { created_at: { [Op.gte]: dateRange.start } } }),
          growth: voicesGrowth
        },
        avatars: {
          total: await UserAvatar.count(),
          recent: await UserAvatar.count({ where: { created_at: { [Op.gte]: dateRange.start } } }),
          animations: await AvatarAnimation.count(),
          growth: avatarsGrowth
        },
        multimedia: {
          total: await MultimediaFile.count(),
          recent: await MultimediaFile.count({ where: { created_at: { [Op.gte]: dateRange.start } } }),
          byType: await MultimediaFile.findAll({
            attributes: [
              'file_type',
              [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
              [sequelize.fn('SUM', sequelize.col('file_size')), 'total_size']
            ],
            group: ['file_type'],
            raw: true
          }),
          nodes: await MultimediaMemoryNode.count(),
          links: await MultimediaLink.count(),
          growth: multimediaGrowth
        }
      };

      res.json({
        success: true,
        data: stats,
        period: period
      });
    } catch (error) {
      console.error('[Admin] Error getting content analytics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Helper method to get date range
  getDateRange(period) {
    const now = new Date();
    let start;

    switch (period) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(0); // All time
    }

    return { start, end: now };
  }

  // Helper method to get time series data for graphs
  async getTimeSeriesData(model, startDate, dateField, additionalWhere = {}) {
    try {
      const where = {
        [dateField]: { [Op.gte]: startDate },
        ...additionalWhere
      };

      const results = await model.findAll({
        attributes: [
          [sequelize.fn('DATE_TRUNC', 'day', sequelize.col(dateField)), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where,
        group: [sequelize.fn('DATE_TRUNC', 'day', sequelize.col(dateField))],
        order: [[sequelize.fn('DATE_TRUNC', 'day', sequelize.col(dateField)), 'ASC']],
        raw: true
      });

      return results.map(r => ({
        date: r.date.toISOString().split('T')[0],
        count: parseInt(r.count) || 0
      }));
    } catch (error) {
      console.error('Error getting time series data:', error);
      return [];
    }
  }
}

module.exports = new AdminAnalyticsController();

