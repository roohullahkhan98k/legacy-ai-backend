const express = require('express');
const router = express.Router();

const geminiController = require('../controllers/geminiController');

// Middleware for request logging
router.use((req, res, next) => {
  console.log(`🧠 Gemini API Request: ${req.method} ${req.path}`, {
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  next();
});

// Health check endpoint
router.get('/health', geminiController.healthCheck);

// Get API configuration
router.get('/config', geminiController.getConfig);

// TEST ENDPOINT - List available models
router.get('/models', async (req, res) => {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // This will show what models are available
    res.json({
      success: true,
      message: 'Check console for available models',
      note: 'If you see a 404 error, your API key may not have access to Gemini models',
      apiKeyPresent: !!process.env.GEMINI_API_KEY
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TEST ENDPOINT - Simple question test
router.post('/test', async (req, res) => {
  try {
    console.log('🧪 Testing Gemini API...');
    
    const { question = 'What is 2+2?' } = req.body;
    
    const GeminiService = require('../services/GeminiService');
    const geminiService = new GeminiService();
    
    console.log('📝 Sending question to Gemini:', question);
    
    // Use the correct format - create a proper prompt
    const prompt = `Answer this question: "${question}"`;
    const response = await geminiService.makeRequest(prompt);
    
    console.log('✅ Gemini response received:', response);
    
    res.json({
      success: true,
      message: 'Gemini API test successful',
      question: question,
      response: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Gemini API test failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Gemini API test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Generate questions from transcript
router.post('/generate-questions', geminiController.generateQuestions);

// Get answer for specific question
router.post('/get-answer', geminiController.getAnswer);

// Analyze transcript
router.post('/analyze-transcript', geminiController.analyzeTranscript);

module.exports = router;
