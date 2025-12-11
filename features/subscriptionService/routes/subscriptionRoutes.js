const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const usageController = require('../controllers/usageController');
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAuth } = require('../../../common/middleware/authMiddleware');
const { requireAdmin } = require('../../../common/middleware/adminMiddleware');

// Create separate router for webhook (needs raw body, mounted before JSON parser)
const webhookRouter = express.Router();
webhookRouter.post('/webhook', express.raw({ type: 'application/json' }), subscriptionController.webhook.bind(subscriptionController));

// Public route
router.get('/plans', subscriptionController.getPlans.bind(subscriptionController));

// Protected routes (require authentication)
router.get('/status', authenticateToken, subscriptionController.getStatus.bind(subscriptionController));
router.get('/billing', authenticateToken, subscriptionController.getBilling.bind(subscriptionController));
router.get('/usage', authenticateToken, usageController.getUsage.bind(usageController));
router.get('/check-downgrade', authenticateToken, subscriptionController.checkDowngrade.bind(subscriptionController));
router.post('/checkout', authenticateToken, subscriptionController.createCheckout.bind(subscriptionController));
router.post('/change-plan', authenticateToken, subscriptionController.changePlan.bind(subscriptionController));
router.post('/cancel', authenticateToken, subscriptionController.cancel.bind(subscriptionController));
router.post('/resume', authenticateToken, subscriptionController.resume.bind(subscriptionController));

// Admin routes (require admin role)
router.get('/admin/limits', requireAuth, requireAdmin, adminController.getAllLimits.bind(adminController));
router.put('/admin/limits', requireAuth, requireAdmin, adminController.updateLimit.bind(adminController));
router.put('/admin/limits/bulk', requireAuth, requireAdmin, adminController.updateLimitsBulk.bind(adminController));
router.post('/admin/limits/reset', requireAuth, requireAdmin, adminController.resetLimits.bind(adminController));

module.exports = router;
module.exports.webhookRouter = webhookRouter;

