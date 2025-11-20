const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../common/middleware/authMiddleware');
const multimediaController = require('../controllers/multimediaController');
const memoryNodeController = require('../controllers/memoryNodeController');
const linkingController = require('../controllers/linkingController');
const { uploadSingle, uploadMultiple, uploadAny } = require('../middleware/upload');

// Apply auth middleware
router.use(authenticateToken);

// Media upload routes
router.post('/upload/single', uploadSingle, multimediaController.uploadSingle.bind(multimediaController));
router.post('/upload/multiple', uploadMultiple, multimediaController.uploadMultiple.bind(multimediaController));

// Media availability route (must come before /media/:mediaId to avoid conflicts)
router.get('/media-availability/:mediaId', linkingController.checkMediaAvailability.bind(linkingController));

// Media CRUD routes
router.get('/media', multimediaController.getAllMedia.bind(multimediaController));
router.get('/media/:mediaId', multimediaController.getMediaById.bind(multimediaController));
router.get('/media/:mediaId/download', multimediaController.downloadMedia.bind(multimediaController));
router.put('/media/:mediaId', multimediaController.updateMediaMetadata.bind(multimediaController));
router.delete('/media/:mediaId', multimediaController.deleteMedia.bind(multimediaController));

// Media search routes
router.get('/search/media', multimediaController.searchMedia.bind(multimediaController));

// Memory Node CRUD routes
router.post('/nodes', memoryNodeController.createMemoryNode.bind(memoryNodeController));
router.get('/nodes', memoryNodeController.getAllMemoryNodes.bind(memoryNodeController));
router.get('/nodes/:nodeId', memoryNodeController.getMemoryNodeById.bind(memoryNodeController));
router.put('/nodes/:nodeId', memoryNodeController.updateMemoryNode.bind(memoryNodeController));
router.delete('/nodes/:nodeId', memoryNodeController.deleteMemoryNode.bind(memoryNodeController));

// Memory Node search routes
router.get('/search/nodes', memoryNodeController.searchMemoryNodes.bind(memoryNodeController));

// Analytics routes
router.get('/analytics/dashboard', multimediaController.getDashboardAnalytics.bind(multimediaController));
router.get('/analytics/media', multimediaController.getMediaAnalytics.bind(multimediaController));
router.get('/analytics/nodes', multimediaController.getNodeAnalytics.bind(multimediaController));

// Management page routes
router.get('/management/media', multimediaController.getMediaManagementPage.bind(multimediaController));
router.get('/management/nodes', memoryNodeController.getNodeManagementPage.bind(memoryNodeController));
router.get('/management/links', linkingController.getLinkManagementPage.bind(linkingController));

// Advanced search
router.post('/search/advanced', multimediaController.advancedSearch.bind(multimediaController));

// Bulk operations
router.post('/bulk/media', multimediaController.bulkMediaOperation.bind(multimediaController));
router.get('/bulk/actions', multimediaController.getBulkActions.bind(multimediaController));

// Utility routes
router.get('/health', multimediaController.healthCheck.bind(multimediaController));
router.get('/status', multimediaController.getSystemStatus.bind(multimediaController));
router.get('/export/media', multimediaController.exportMedia.bind(multimediaController));
router.post('/import/media', uploadAny, multimediaController.importMedia.bind(multimediaController));

// Mobile/Touch routes
router.get('/mobile/media', multimediaController.getMobileMedia.bind(multimediaController));
router.get('/mobile/nodes', memoryNodeController.getMobileNodes.bind(memoryNodeController));
router.post('/touch/media/:mediaId/quick-link', linkingController.quickLinkMedia.bind(linkingController));
router.post('/touch/nodes/:nodeId/quick-add-media', linkingController.quickAddMedia.bind(linkingController));

// Thumbnail and preview routes
router.get('/media/:mediaId/thumbnail', multimediaController.getThumbnail.bind(multimediaController));
router.get('/media/:mediaId/preview', multimediaController.getPreview.bind(multimediaController));

// Dedicated page routes
router.get('/media/:mediaId/page', multimediaController.getMediaDetailPage.bind(multimediaController));
router.get('/nodes/:nodeId/page', memoryNodeController.getNodeDetailPage.bind(memoryNodeController));
router.get('/links/page', linkingController.getLinkManagementPage.bind(linkingController));

// Bulk linking routes (must come before single linking routes to avoid conflicts)
router.post('/link/bulk/to/:nodeId', linkingController.bulkLinkMediaToNode.bind(linkingController));
router.post('/unlink/bulk/from/:nodeId', linkingController.bulkUnlinkMediaFromNode.bind(linkingController));

// Connection status routes (must come before single linking routes to avoid conflicts)
router.get('/connection-status/:mediaId/:nodeId', linkingController.getConnectionStatus.bind(linkingController));

// Single linking routes
router.post('/link/:mediaId/to/:nodeId', linkingController.linkMediaToNode.bind(linkingController));
router.delete('/link/:mediaId/from/:nodeId', linkingController.unlinkMediaFromNode.bind(linkingController));
router.get('/nodes/:nodeId/media', linkingController.getMediaForNode.bind(linkingController));
router.get('/media/:mediaId/nodes', linkingController.getNodesForMedia.bind(linkingController));

module.exports = router;
