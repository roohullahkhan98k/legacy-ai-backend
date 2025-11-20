class GeminiController {
  constructor() {
    this.geminiService = null;
  }

  // Lazy load the GeminiService
  getGeminiService() {
    if (!this.geminiService) {
      const GeminiService = require('../services/GeminiService');
      this.geminiService = new GeminiService();
    }
    return this.geminiService;
  }

  // Generate questions from transcript
  async generateQuestions(req, res) {
    const startTime = Date.now();
    
    try {
      const { transcript, maxQuestions = 5, categories = ['technical', 'behavioral', 'general'] } = req.body;
      
      // Validate input
      if (!transcript || typeof transcript !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Transcript is required and must be a string'
        });
      }

      if (transcript.length > 10000) {
        return res.status(400).json({
          success: false,
          error: 'Transcript too long (max 10,000 characters)'
        });
      }

      console.log('🧠 Generating questions from transcript...');
      const questions = await this.getGeminiService().generateQuestions(transcript, maxQuestions, categories);
      
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        questions,
        metadata: {
          totalQuestions: questions.length,
          processingTime,
          model: 'gemini-pro',
          transcriptLength: transcript.length
        }
      });
    } catch (error) {
      console.error('❌ Error generating questions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate questions',
        metadata: {
          processingTime: Date.now() - startTime,
          model: 'gemini-pro'
        }
      });
    }
  }

  // Get answer for specific question
  async getAnswer(req, res) {
    const startTime = Date.now();
    
    try {
      const { question, context, style = 'professional' } = req.body;
      
      // Validate input
      if (!question || typeof question !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Question is required and must be a string'
        });
      }

      const validStyles = ['professional', 'conversational', 'detailed', 'concise'];
      if (!validStyles.includes(style)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid style. Must be one of: professional, conversational, detailed, concise'
        });
      }

      console.log('🤖 Generating answer for question...');
      const answer = await this.getGeminiService().getAnswer(question, context, style);
      
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        ...answer,
        metadata: {
          processingTime,
          model: 'gemini-pro',
          style,
          questionLength: question.length,
          contextLength: context ? context.length : 0
        }
      });
    } catch (error) {
      console.error('❌ Error getting answer:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get answer',
        metadata: {
          processingTime: Date.now() - startTime,
          model: 'gemini-pro'
        }
      });
    }
  }

  // Analyze transcript
  async analyzeTranscript(req, res) {
    const startTime = Date.now();
    
    try {
      const { transcript, analysisType = 'summary' } = req.body;
      
      // Validate input
      if (!transcript || typeof transcript !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Transcript is required and must be a string'
        });
      }

      const validAnalysisTypes = ['summary', 'insights', 'suggestions'];
      if (!validAnalysisTypes.includes(analysisType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid analysis type. Must be one of: summary, insights, suggestions'
        });
      }

      console.log('📊 Analyzing transcript...');
      const analysis = await this.getGeminiService().analyzeTranscript(transcript, analysisType);
      
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        ...analysis,
        metadata: {
          processingTime,
          model: 'gemini-pro',
          analysisType,
          transcriptLength: transcript.length
        }
      });
    } catch (error) {
      console.error('❌ Error analyzing transcript:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to analyze transcript',
        metadata: {
          processingTime: Date.now() - startTime,
          model: 'gemini-pro'
        }
      });
    }
  }

  // Health check for Gemini API
  async healthCheck(req, res) {
    try {
      const testPrompt = 'Hello, this is a health check. Please respond with "OK" if you can read this.';
      const response = await this.getGeminiService().makeRequest(testPrompt, { maxTokens: 10 });
      
      res.json({
        success: true,
        status: 'healthy',
        message: 'Gemini API is working correctly',
        response: response.trim()
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        message: 'Gemini API is not responding correctly'
      });
    }
  }

  // Get API configuration info
  async getConfig(req, res) {
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    
    res.json({
      success: true,
      config: {
        hasApiKey,
        model: 'gemini-1.5-flash',
        sdk: '@google/generative-ai',
        features: [
          'question-generation',
          'answer-generation', 
          'transcript-analysis',
          'multiple-styles',
          'fallback-responses'
        ]
      }
    });
  }
}

module.exports = new GeminiController();
