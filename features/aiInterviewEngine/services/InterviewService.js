const Interview = require('../models/Interview');
const chromaService = require('./InterviewChromaService');

class InterviewService {
  /**
   * Start a new interview session
   */
  async startInterview(sessionId, userId = null) {
    try {
      // Check if interview already exists for this session
      const existing = await Interview.findOne({ where: { session_id: sessionId } });
      if (existing) {
        console.log('✅ Interview already exists, returning existing:', existing.id);
        return { success: true, interview_id: existing.id, isNew: false };
      }

      const interview = await Interview.create({
        session_id: sessionId,
        user_id: userId,
        status: 'active',
        qa_pairs: [],
        total_qa: 0,
        started_at: new Date()
      });

      console.log('✅ New interview created:', interview.id);
      return { success: true, interview_id: interview.id, isNew: true };
    } catch (error) {
      throw new Error(`Failed to start interview: ${error.message}`);
    }
  }

  /**
   * Add Q&A pair to interview
   */
  async addQA(sessionId, question, answer) {
    try {
      const interview = await Interview.findOne({ where: { session_id: sessionId } });

      if (!interview) {
        throw new Error('Interview not found');
      }

      // Get current qa_pairs, make sure it's an array
      let qaPairs = Array.isArray(interview.qa_pairs) ? [...interview.qa_pairs] : [];
      
      // Add new Q&A
      qaPairs.push({
        question,
        answer,
        timestamp: new Date().toISOString()
      });

      // Update with explicit changed() call for JSONB
      interview.qa_pairs = qaPairs;
      interview.total_qa = qaPairs.length;
      interview.changed('qa_pairs', true); // Mark JSONB as changed
      await interview.save();

      // Store in ChromaDB for semantic search
      chromaService.storeQA(interview.id, question, answer).catch(err => 
        console.warn('ChromaDB storage failed:', err.message)
      );

      return { success: true, total_qa: qaPairs.length };
    } catch (error) {
      throw new Error(`Failed to add Q&A: ${error.message}`);
    }
  }

  /**
   * End interview and set title
   */
  async endInterview(sessionId, title = null) {
    try {
      const interview = await Interview.findOne({ where: { session_id: sessionId } });

      if (!interview) {
        throw new Error('Interview not found');
      }

      // Auto-generate title if not provided
      if (!title) {
        // Count user's interviews to generate title like "Interview 1", "Interview 2", etc.
        const userInterviewCount = await Interview.count({
          where: { user_id: interview.user_id }
        });
        title = `Interview ${userInterviewCount}`;
      }

      await interview.update({
        title,
        status: 'completed',
        ended_at: new Date()
      });

      return {
        success: true,
        interview: {
          id: interview.id,
          title: interview.title,
          total_qa: interview.total_qa,
          started_at: interview.started_at,
          ended_at: interview.ended_at,
          qa_pairs: interview.qa_pairs
        }
      };
    } catch (error) {
      throw new Error(`Failed to end interview: ${error.message}`);
    }
  }

  /**
   * Get interview by session ID
   */
  async getInterview(sessionId) {
    try {
      const interview = await Interview.findOne({ where: { session_id: sessionId } });

      if (!interview) {
        throw new Error('Interview not found');
      }

      return {
        success: true,
        interview: {
          id: interview.id,
          session_id: interview.session_id,
          title: interview.title,
          status: interview.status,
          total_qa: interview.total_qa,
          started_at: interview.started_at,
          ended_at: interview.ended_at,
          qa_pairs: interview.qa_pairs
        }
      };
    } catch (error) {
      throw new Error(`Failed to get interview: ${error.message}`);
    }
  }

  /**
   * Get all interviews for a user
   */
  async getUserInterviews(userId) {
    try {
      const interviews = await Interview.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        attributes: ['id', 'session_id', 'title', 'status', 'total_qa', 'started_at', 'ended_at', 'created_at']
      });

      return { success: true, interviews };
    } catch (error) {
      throw new Error(`Failed to get user interviews: ${error.message}`);
    }
  }

  /**
   * Search similar Q&A
   */
  async searchSimilar(query, limit = 5) {
    try {
      const results = await chromaService.searchSimilar(query, limit);
      return { success: true, ...results };
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Delete interview
   */
  async deleteInterview(sessionId) {
    try {
      const interview = await Interview.findOne({ where: { session_id: sessionId } });

      if (!interview) {
        throw new Error('Interview not found');
      }

      // Delete from ChromaDB
      await chromaService.deleteInterview(interview.id);

      // Delete from PostgreSQL
      await interview.destroy();

      return { success: true, message: 'Interview deleted' };
    } catch (error) {
      throw new Error(`Failed to delete interview: ${error.message}`);
    }
  }
}

module.exports = new InterviewService();

