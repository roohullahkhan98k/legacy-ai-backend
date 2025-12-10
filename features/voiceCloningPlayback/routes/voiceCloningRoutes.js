const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../common/middleware/authMiddleware');
const VoiceCloningController = require('../controllers/voiceCloningController');

const controller = new VoiceCloningController();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Health check
router.get('/health', controller.healthCheck.bind(controller));

// Voice cloning - upload audio sample and clone voice
router.post('/clone', controller.cloneVoice.bind(controller));

// Generate speech from text using a voice
router.post('/generate-speech', controller.generateSpeech.bind(controller));
router.post('/generate', controller.generateSpeech.bind(controller)); // Alias for frontend compatibility

// Get all available voices
router.get('/voices', controller.getVoices.bind(controller));

// Get specific voice details
router.get('/voices/:voiceId', controller.getVoiceDetails.bind(controller));

// Delete a voice
router.delete('/voices/:voiceId', controller.deleteVoice.bind(controller));

// Play audio (returns audio URL for frontend playback)
router.post('/play', controller.playAudio.bind(controller));

// Test voice cloning with fake audio
router.get('/test', controller.testVoiceCloning.bind(controller));

// Get user's generated audio history
router.get('/user/audio-history', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ success: true, history: [], total: 0 });
    }

    const { limit = 20, offset = 0 } = req.query;
    
    const history = await GeneratedAudio.findAll({
      where: { user_id: userId },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: ['id', 'voice_id', 'voice_name', 'accent', 'text', 'audio_file_path', 'duration_seconds', 'file_size_bytes', 'created_at', 'metadata']
    });

    const total = await GeneratedAudio.count({ where: { user_id: userId } });

    res.json({
      success: true,
      history,
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/user/audio-history/:id', controller.deleteGeneratedAudio.bind(controller));

// Get user's custom voices only
router.get('/user/custom-voices', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ success: true, voices: [] });
    }

    const userVoices = await UserVoice.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      raw: true // Get plain objects with snake_case fields
    });

    // Map to frontend-friendly format
    const voices = userVoices.map(v => ({
      voice_id: v.voice_id,
      voice_name: v.voice_name,
      description: v.metadata?.description || '',
      sample_file_path: v.sample_file_path,
      created_at: v.createdAt || v.created_at || new Date().toISOString(),
      updated_at: v.updatedAt || v.updated_at || new Date().toISOString()
    }));

    res.json({
      success: true,
      voices
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const { UserVoice, GeneratedAudio } = require('../models/VoiceCloning');

module.exports = router;
