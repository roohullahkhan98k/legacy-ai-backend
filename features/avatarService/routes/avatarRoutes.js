const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../common/middleware/authMiddleware');

const ctrl = require('../controllers/avatarController');

// Apply auth middleware to all routes
router.use(authenticateToken);

// Avatar management
router.get('/', ctrl.listAvatars);
router.get('/:id', ctrl.getAvatar);
router.delete('/:id', ctrl.deleteAvatar);
router.post('/:id/metadata', ctrl.updateMetadata);

// Avatar creation and animation
router.post('/model', ctrl.uploadModelMiddleware, ctrl.createAvatar);
router.post('/:id/lipsync', ctrl.addLipsyncJson);
router.post('/:id/lipsync/upload', ctrl.uploadLipsyncMiddleware, ctrl.addLipsyncFile);
router.post('/:id/prepare-playback', ctrl.preparePlayback);

// Animation history and deletion
router.get('/user/:userId/history', ctrl.getAnimationHistory);
router.delete('/animation/:animationId', ctrl.deleteAnimation);

module.exports = router;


