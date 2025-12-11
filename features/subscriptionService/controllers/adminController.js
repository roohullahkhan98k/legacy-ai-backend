const FeatureLimit = require('../models/FeatureLimit');
const FeatureLimitService = require('../services/FeatureLimitService');

class AdminController {
  /**
   * Get all feature limits for all plans
   * GET /api/subscription/admin/limits
   */
  async getAllLimits(req, res) {
    try {
      const limits = await FeatureLimit.findAll({
        order: [['plan_type', 'ASC'], ['feature_name', 'ASC']]
      });

      // Group by plan type for easier frontend display
      const grouped = {
        personal: {},
        premium: {},
        ultimate: {}
      };

      limits.forEach(limit => {
        grouped[limit.plan_type] = grouped[limit.plan_type] || {};
        grouped[limit.plan_type][limit.feature_name] = {
          limit_value: limit.limit_value,
          limit_type: limit.limit_type,
          id: limit.id
        };
      });

      res.json({
        success: true,
        limits: grouped,
        raw: limits
      });
    } catch (error) {
      console.error('[Admin] Error getting limits:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update feature limit for a plan
   * PUT /api/subscription/admin/limits
   */
  async updateLimit(req, res) {
    try {
      const { planType, featureName, limitValue, limitType } = req.body;

      if (!planType || !featureName || limitValue === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: planType, featureName, limitValue'
        });
      }

      if (!['personal', 'premium', 'ultimate'].includes(planType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid planType. Must be: personal, premium, or ultimate'
        });
      }

      if (!['voice_clones', 'avatar_generations', 'memory_graph_operations', 'interview_sessions', 'multimedia_uploads'].includes(featureName)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid featureName'
        });
      }

      if (typeof limitValue !== 'number' || (limitValue < -1 || limitValue > 1000000)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid limitValue. Must be -1 (unlimited) or a number between 0 and 1000000'
        });
      }

      const [limit, created] = await FeatureLimit.findOrCreate({
        where: {
          plan_type: planType,
          feature_name: featureName
        },
        defaults: {
          plan_type: planType,
          feature_name: featureName,
          limit_value: limitValue,
          limit_type: limitType || 'monthly'
        }
      });

      if (!created) {
        await limit.update({
          limit_value: limitValue,
          limit_type: limitType || limit.limit_type
        });
      }

      console.log(`✅ [Admin] Updated limit: ${planType} - ${featureName} = ${limitValue}`);

      res.json({
        success: true,
        message: `Limit updated successfully`,
        limit: {
          plan_type: limit.plan_type,
          feature_name: limit.feature_name,
          limit_value: limit.limit_value,
          limit_type: limit.limit_type,
          id: limit.id
        }
      });
    } catch (error) {
      console.error('[Admin] Error updating limit:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update multiple limits at once
   * PUT /api/subscription/admin/limits/bulk
   */
  async updateLimitsBulk(req, res) {
    try {
      const { limits } = req.body;

      if (!Array.isArray(limits) || limits.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'limits must be a non-empty array'
        });
      }

      const results = [];
      const errors = [];

      for (const limitData of limits) {
        try {
          const { planType, featureName, limitValue, limitType } = limitData;

          if (!planType || !featureName || limitValue === undefined) {
            errors.push({
              planType,
              featureName,
              error: 'Missing required fields'
            });
            continue;
          }

          const [limit, created] = await FeatureLimit.findOrCreate({
            where: {
              plan_type: planType,
              feature_name: featureName
            },
            defaults: {
              plan_type: planType,
              feature_name: featureName,
              limit_value: limitValue,
              limit_type: limitType || 'monthly'
            }
          });

          if (!created) {
            await limit.update({
              limit_value: limitValue,
              limit_type: limitType || limit.limit_type
            });
          }

          results.push({
            plan_type: limit.plan_type,
            feature_name: limit.feature_name,
            limit_value: limit.limit_value,
            limit_type: limit.limit_type
          });
        } catch (error) {
          errors.push({
            planType: limitData.planType,
            featureName: limitData.featureName,
            error: error.message
          });
        }
      }

      console.log(`✅ [Admin] Bulk updated ${results.length} limits`);

      res.json({
        success: true,
        message: `Updated ${results.length} limit(s)`,
        updated: results,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('[Admin] Error bulk updating limits:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Reset limits to defaults
   * POST /api/subscription/admin/limits/reset
   */
  async resetLimits(req, res) {
    try {
      const featureLimitService = new FeatureLimitService();
      await featureLimitService.initializeDefaultLimits();

      const limits = await FeatureLimit.findAll({
        order: [['plan_type', 'ASC'], ['feature_name', 'ASC']]
      });

      res.json({
        success: true,
        message: 'Limits reset to defaults',
        limits
      });
    } catch (error) {
      console.error('[Admin] Error resetting limits:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new AdminController();

