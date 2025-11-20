const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Ensure all upload directories exist on server startup
const { ensureUploadDirectories } = require('./common/utils/ensureUploadDirs');
ensureUploadDirectories();

console.log('🔍 Loading AI Prototype app...');
// Import AI Prototype app
const { startApp } = require('./app');
console.log('✅ AI Prototype app loaded successfully');

// Import Gemini routes directly
console.log('🔍 Loading Gemini routes directly...');
const geminiRoutes = require('./features/aiInterviewEngine/routes/geminiRoutes');
console.log('✅ Gemini routes loaded directly');

// Import AI Interview Socket and routes
const AIInterviewSocket = require('./features/aiInterviewEngine/aiInterviewSocket');
const interviewRoutes = require('./features/aiInterviewEngine/routes/interviewRoutes');
const chromaRoutes = require('./chromaDB/routes');
const memoryGraphRoutes = require('./features/memoryGraphService/routes/memoryGraphRoutes');
const voiceCloningRoutes = require('./features/voiceCloningPlayback/routes/voiceCloningRoutes');
const avatarRoutes = require('./features/avatarService/routes/avatarRoutes');
const avatarPipelineRoutes = require('./features/avatarService/routes/pipelineRoutes');
const multimediaRoutes = require('./features/multimediaUpload/routes');


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve uploads statically
app.use('/uploads', express.static(require('path').resolve(process.cwd(), 'uploads')));

// Test route to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// Mount Gemini routes directly
app.use('/api/gemini', geminiRoutes);
console.log('✅ Gemini routes mounted directly at /api/gemini');

// Initialize and use AI Prototype app
console.log('🔍 Initializing AI Prototype app...');
startApp().then((aiApp) => {
  console.log('📦 AI Prototype app received, mounting at /api...');
  app.use('/api', aiApp);
  console.log('✅ AI Prototype app mounted successfully at /api');
  console.log('🎯 Available routes:');
  console.log('   - POST /api/auth/register');
  console.log('   - POST /api/auth/login');
  console.log('   - GET /api/health');
}).catch((error) => {
  console.error('❌ Failed to initialize AI Prototype app:', error);
  console.log('⚠️  Continuing without AI Prototype app...');
  // Don't exit - let the server continue
});

// Mount Interview routes
app.use('/api/interview', interviewRoutes);

// Mount Chroma routes
app.use('/api/chroma', chromaRoutes);

// Mount Memory Graph routes
app.use('/api/memory-graph', memoryGraphRoutes);

// Mount Voice Cloning routes
app.use('/api/voice-cloning', voiceCloningRoutes);

// Mount Avatar routes
app.use('/api/avatar', avatarRoutes);
app.use('/api/avatar/pipeline', avatarPipelineRoutes);

// Mount Multimedia routes
app.use('/api/multimedia', multimediaRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const { sequelize } = require('./common/database');
    await sequelize.authenticate();
    
    console.log('✅ Health check: Database connection successful');
    
    res.json({ 
      status: 'OK', 
      message: 'Backend server is running',
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
      message: 'Backend server is running but database connection failed',
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

// Initialize AI Interview Socket
const aiInterviewSocket = new AIInterviewSocket();
aiInterviewSocket.initialize();

// WebSocket health check endpoint
app.get('/api/socket/status', (req, res) => {
  try {
    const socketStatus = {
      status: aiInterviewSocket.clientServer ? 'running' : 'stopped',
      port: aiInterviewSocket.CLIENT_PORT,
      activeConnections: aiInterviewSocket.clientServer ? aiInterviewSocket.clientServer.clients.size : 0,
      activeInterviews: aiInterviewSocket.activeInterviews ? aiInterviewSocket.activeInterviews.size : 0,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      websocket: socketStatus,
      message: socketStatus.status === 'running' 
        ? `WebSocket server is running on port ${socketStatus.port} with ${socketStatus.activeConnections} active connection(s)` 
        : 'WebSocket server is not running'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to check WebSocket status'
    });
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  aiInterviewSocket.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 AI Prototype server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test route: http://localhost:${PORT}/api/test`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`🧠 Gemini API: http://localhost:${PORT}/api/gemini/test`);
  console.log(`🔗 AI Interview: http://localhost:${PORT}/api/ai-interview`);
  console.log(`🧠 Memory Graph: http://localhost:${PORT}/api/memory-graph`);
  console.log(`🎤 Voice Cloning: http://localhost:${PORT}/api/voice-cloning`);
  console.log(`👤 Avatar Service: http://localhost:${PORT}/api/avatar`);
  console.log(`📁 Multimedia: http://localhost:${PORT}/api/multimedia`);
});

module.exports = app;

