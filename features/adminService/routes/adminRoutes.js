const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
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

module.exports = router;

