class GeminiController {
  constructor() {
    this.openAIService = null;
  }

  // Lazy load the OpenAIService
  getOpenAIService() {
    if (!this.openAIService) {
      const OpenAIService = require('../services/OpenAIService');
      this.openAIService = new OpenAIService();
    }
    return this.openAIService;
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
      const questions = await this.getOpenAIService().generateQuestions(transcript, maxQuestions, categories);
      
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        questions,
        metadata: {
          totalQuestions: questions.length,
          processingTime,
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
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
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
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
      const answer = await this.getOpenAIService().getAnswer(question, context, style);
      
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        ...answer,
        metadata: {
          processingTime,
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
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
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
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
      const analysis = await this.getOpenAIService().analyzeTranscript(transcript, analysisType);
      
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        ...analysis,
        metadata: {
          processingTime,
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
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
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
        }
      });
    }
  }

  // Health check for OpenAI API
  async healthCheck(req, res) {
    try {
      const testPrompt = 'Hello, this is a health check. Please respond with "OK" if you can read this.';
      const response = await this.getOpenAIService().makeRequest(testPrompt, { maxTokens: 10 });
      
      res.json({
        success: true,
        status: 'healthy',
        message: 'OpenAI API is working correctly',
        response: response.trim()
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        message: 'OpenAI API is not responding correctly'
      });
    }
  }

  // Get API configuration info
  async getConfig(req, res) {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    
    res.json({
      success: true,
      config: {
        hasApiKey,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        sdk: 'openai',
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
