const express = require('express');
const cors = require('cors');
const { testConnection, initializeDatabase } = require('./common/database');
const { authRoutes } = require('./common/auth/authRoutes');

const app = express();

// Initialize database connection
const initializeApp = async () => {
  console.log('🔌 Testing database connection...');
  try {
    await testConnection();
    console.log('✅ Database connection successful');
    console.log('🔄 Initializing database schema...');
    await initializeDatabase();
    console.log('✅ AI Prototype application initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize AI Prototype application:', error);
    console.log('⚠️  Continuing without database connection...');
    // Don't exit - let the app continue for auth routes
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import feature routes
const aiInterviewRoutes = require('./features/aiInterviewEngine/routes/geminiRoutes');
const memoryGraphRoutes = require('./features/memoryGraphService/routes/memoryGraphRoutes');
const voiceCloningRoutes = require('./features/voiceCloningPlayback/routes/voiceCloningRoutes');
const avatarRoutes = require('./features/avatarService/routes/avatarRoutes');
const pipelineRoutes = require('./features/avatarService/routes/pipelineRoutes');

// Routes
app.use('/auth', authRoutes);
console.log('✅ Auth routes mounted at /auth');
app.use('/ai-interview', aiInterviewRoutes);
app.use('/memory-graph', memoryGraphRoutes);
app.use('/voice-cloning', voiceCloningRoutes);
app.use('/avatar', avatarRoutes);
app.use('/avatar/pipeline', pipelineRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const { sequelize } = require('./common/database');
    await sequelize.authenticate();
    
    console.log('✅ Health check: Database connection successful');
    
    res.json({ 
      status: 'OK', 
      message: 'AI Prototype server is running',
      database: 'Connected',
      services: [
        'Authentication System (Active)',
        'AI Interview Engine (WebSocket Active)',
        'Gemini AI API (Active)', 
        'Memory Graph Service (Ready for APIs)', 
        'Voice Cloning & Playback (Ready for APIs)',
        'Avatar Service (Ready for APIs)',
        'Multimedia Upload & Linking (Ready for APIs)'
      ]
    });
  } catch (error) {
    console.log('❌ Health check: Database connection failed -', error.message);
    
    res.status(503).json({ 
      status: 'ERROR', 
      message: 'AI Prototype server is running but database connection failed',
      database: 'Disconnected',
      error: error.message,
      services: [
        'Authentication System (Limited)',
        'AI Interview Engine (WebSocket Active)',
        'Gemini AI API (Active)', 
        'Memory Graph Service (Limited)', 
        'Voice Cloning & Playback (Ready for APIs)',
        'Avatar Service (Ready for APIs)',
        'Multimedia Upload & Linking (Ready for APIs)'
      ]
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Initialize app and export
const startApp = async () => {
  console.log('🚀 Starting AI Prototype app initialization...');
  try {
    await initializeApp();
  } catch (error) {
    console.log('⚠️  Database initialization failed, but continuing with app...');
  }
  console.log('📦 Returning app with all routes mounted...');
  return app;
};

module.exports = { app, startApp };

