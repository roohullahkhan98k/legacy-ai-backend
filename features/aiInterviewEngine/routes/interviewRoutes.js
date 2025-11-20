const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviewController');
const { authenticateToken } = require('../../../common/middleware/authMiddleware');

// Apply auth middleware to all routes (optional auth - attaches user if token present)
router.use(authenticateToken);

// Start interview
router.post('/start', interviewController.startInterview);

// Add Q&A pair
router.post('/qa', interviewController.addQA);

// End interview
router.post('/end', interviewController.endInterview);

// Get interview by session ID
router.get('/:sessionId', interviewController.getInterview);

// Get user's interviews
router.get('/user/:userId', interviewController.getUserInterviews);

// Search similar Q&A
router.post('/search', interviewController.searchSimilar);

// Delete interview
router.delete('/:sessionId', interviewController.deleteInterview);

module.exports = router;

