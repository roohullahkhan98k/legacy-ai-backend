const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import feature routes
const aiInterviewRoutes = require('./aiInterviewEngine/routes/geminiRoutes');
const memoryGraphRoutes = require('./memoryGraphService/routes/memoryGraphRoutes');
const voiceCloningRoutes = require('./voiceCloningPlayback/routes/voiceCloningRoutes');
const avatarRoutes = require('./avatarService/routes/avatarRoutes');

// Routes
app.use('/api/ai-interview', aiInterviewRoutes);
app.use('/api/memory-graph', memoryGraphRoutes);
app.use('/api/voice-cloning', voiceCloningRoutes);
app.use('/api/avatar', avatarRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Features server is running',
    services: [
      'AI Interview Engine (WebSocket Active)',
      'Gemini AI API (Active)', 
      'Memory Graph Service (Ready for APIs)', 
      'Voice Cloning & Playback (Ready for APIs)',
      'Avatar Service (Ready for APIs)',
      'Multimedia Upload & Linking (Ready for APIs)'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

module.exports = app;
