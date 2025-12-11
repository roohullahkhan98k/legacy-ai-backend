const featureLimitService = require('../services/FeatureLimitService');

class UsageController {
  /**
   * Get current user's usage stats (for dashboard)
   * GET /api/subscription/usage
   */
  async getUsage(req, res) {
    try {
      const userId = req.user.id;
      const stats = await featureLimitService.getUserUsageStats(userId);

      res.json({
        success: true,
        ...stats
      });
    } catch (error) {
      console.error('[Usage] Error getting usage stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new UsageController();

