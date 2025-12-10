const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateToken } = require('../../../common/middleware/authMiddleware');

// Webhook endpoint (no auth - Stripe signs it)
router.post('/webhook', express.raw({ type: 'application/json' }), subscriptionController.webhook.bind(subscriptionController));

// Public route
router.get('/plans', subscriptionController.getPlans.bind(subscriptionController));

// Protected routes (require authentication)
router.get('/status', authenticateToken, subscriptionController.getStatus.bind(subscriptionController));
router.post('/checkout', authenticateToken, subscriptionController.createCheckout.bind(subscriptionController));
router.post('/cancel', authenticateToken, subscriptionController.cancel.bind(subscriptionController));

module.exports = router;

