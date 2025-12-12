const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const adminAnalyticsController = require('../controllers/adminAnalyticsController');
const adminSubscriptionController = require('../controllers/adminSubscriptionController');
const { requireAuth } = require('../../../common/middleware/authMiddleware');
const { requireAdmin } = require('../../../common/middleware/adminMiddleware');

// All admin routes require authentication + admin role
router.use(requireAuth);
router.use(requireAdmin);

// User CRUD routes
router.get('/users', adminUserController.getAllUsers.bind(adminUserController));
router.get('/users/:id', adminUserController.getUserById.bind(adminUserController));
router.post('/users', adminUserController.createUser.bind(adminUserController));
router.put('/users/:id', adminUserController.updateUser.bind(adminUserController));
router.delete('/users/:id', adminUserController.deleteUser.bind(adminUserController));

// Subscription Management routes
router.get('/subscriptions', adminSubscriptionController.getAllSubscriptions.bind(adminSubscriptionController));
router.get('/subscriptions/:id', adminSubscriptionController.getSubscriptionById.bind(adminSubscriptionController));
router.get('/subscriptions/:id/check-downgrade', adminSubscriptionController.checkDowngrade.bind(adminSubscriptionController));
router.put('/subscriptions/:id', adminSubscriptionController.updateSubscription.bind(adminSubscriptionController));
router.delete('/subscriptions/:id', adminSubscriptionController.deleteSubscription.bind(adminSubscriptionController));
// Note: To get user's subscription, use GET /api/admin/users/:id which already includes subscription info

// Analytics routes
router.get('/analytics/dashboard', adminAnalyticsController.getDashboard.bind(adminAnalyticsController));
router.get('/analytics/packages', adminAnalyticsController.getPackageAnalytics.bind(adminAnalyticsController));
router.get('/analytics/usage', adminAnalyticsController.getUsageAnalytics.bind(adminAnalyticsController));
router.get('/analytics/users-activity', adminAnalyticsController.getUserActivity.bind(adminAnalyticsController));
router.get('/analytics/content', adminAnalyticsController.getContentAnalytics.bind(adminAnalyticsController));

module.exports = router;

