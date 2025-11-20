const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../common/middleware/authMiddleware');

const ctrl = require('../controllers/pipelineController');

// Apply auth middleware
router.use(authenticateToken);

// Image -> Model
router.post('/image-to-model', ctrl.uploadImageMiddleware, ctrl.startImageToModel);
router.post('/image', ctrl.uploadImageMiddleware, ctrl.startImageToModel); // Alias for compatibility

// Audio -> Lipsync for an existing avatar
router.post('/:id/audio-to-lipsync', ctrl.uploadAudioMiddleware, ctrl.startAudioToLipsync);
router.post('/:id/audio', ctrl.uploadAudioMiddleware, ctrl.startAudioToLipsync); // Alias for compatibility

// Job status
router.get('/job/:jobId', ctrl.getJobStatus);
router.get('/jobs/:jobId', ctrl.getJobStatus); // Alias for compatibility

module.exports = router;


