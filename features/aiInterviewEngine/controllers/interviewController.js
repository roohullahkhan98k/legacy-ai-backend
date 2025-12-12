const interviewService = require('../services/InterviewService');

class InterviewController {
  // POST /api/interview/start
  async startInterview(req, res) {
    try {
      const { session_id } = req.body;
      const userId = req.user?.id; // Get from auth middleware

      console.log('[Interview] Start request:', { session_id, userId, hasUser: !!req.user });

      if (!session_id) {
        return res.status(400).json({ success: false, error: 'session_id required' });
      }

      // Check subscription and feature limit before starting interview
      if (userId) {
        const featureLimitService = require('../../subscriptionService/services/FeatureLimitService');
        const limitCheck = await featureLimitService.checkLimit(userId, 'interview_sessions');
        
        if (!limitCheck.allowed) {
          // Different response based on whether they need subscription or hit limit
          if (limitCheck.needsSubscription) {
            return res.status(403).json({
              success: false,
              error: 'Subscription required',
              message: 'You need an active subscription to start interviews. Please subscribe to continue.',
              hasSubscription: false,
              needsSubscription: true,
              redirectToPricing: true
            });
          } else if (limitCheck.limitReached) {
            return res.status(403).json({
              success: false,
              error: 'Limit reached',
              message: limitCheck.message || `You have reached your interview sessions limit (${limitCheck.limit}). Upgrade your plan to start more interviews.`,
              limit: limitCheck.limit,
              currentUsage: limitCheck.currentUsage,
              remaining: limitCheck.remaining,
              plan: limitCheck.plan,
              hasSubscription: true,
              limitReached: true,
              redirectToPricing: true
            });
          }
        }
      }

      const result = await interviewService.startInterview(session_id, userId);
      
      // Record usage ONLY if this is a NEW interview (not existing one)
      // This prevents double-counting when frontend retries or reconnects
      if (userId && result.success && result.isNew) {
        const featureLimitService = require('../../subscriptionService/services/FeatureLimitService');
        await featureLimitService.recordUsage(userId, 'interview_sessions', {
          session_id: session_id,
          interview_id: result.interview_id,
          started_at: new Date()
        });
        console.log('[Interview] Usage recorded for new interview:', result.interview_id);
      } else if (userId && result.success && !result.isNew) {
        console.log('[Interview] Skipping usage recording - interview already existed:', result.interview_id);
      }
      
      console.log('[Interview] Start success:', result);
      res.json(result);
    } catch (error) {
      console.error('[Interview] Start error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/interview/qa
  async addQA(req, res) {
    try {
      const { session_id, question, answer } = req.body;

      if (!session_id || !question || !answer) {
        return res.status(400).json({ 
          success: false, 
          error: 'session_id, question, and answer required' 
        });
      }

      const result = await interviewService.addQA(session_id, question, answer);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/interview/end
  async endInterview(req, res) {
    try {
      const { session_id, title } = req.body;

      if (!session_id) {
        return res.status(400).json({ success: false, error: 'session_id required' });
      }

      const result = await interviewService.endInterview(session_id, title);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // GET /api/interview/:sessionId
  async getInterview(req, res) {
    try {
      const { sessionId } = req.params;
      const result = await interviewService.getInterview(sessionId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // GET /api/interview/user/:userId
  async getUserInterviews(req, res) {
    try {
      const { userId } = req.params;
      const result = await interviewService.getUserInterviews(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/interview/search
  async searchSimilar(req, res) {
    try {
      const { query, limit = 5 } = req.body;

      if (!query) {
        return res.status(400).json({ success: false, error: 'query required' });
      }

      const result = await interviewService.searchSimilar(query, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // DELETE /api/interview/:sessionId
  async deleteInterview(req, res) {
    try {
      const { sessionId } = req.params;
      const result = await interviewService.deleteInterview(sessionId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new InterviewController();

