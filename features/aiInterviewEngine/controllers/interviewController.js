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

      const result = await interviewService.startInterview(session_id, userId);
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

