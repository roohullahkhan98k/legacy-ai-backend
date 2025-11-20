const express = require('express');
const router = express.Router();

// Import all route modules
const multimediaRoutes = require('./multimediaRoutes');

// Mount routes
router.use('/', multimediaRoutes); // Routes are already defined with proper paths

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Multimedia Upload & Linking Service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API documentation route
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Multimedia Upload & Linking API Documentation',
    endpoints: {
      upload: {
        'POST /api/multimedia/upload/single': 'Upload a single media file',
        'POST /api/multimedia/upload/multiple': 'Upload multiple media files'
      },
      media: {
        'GET /api/multimedia/media': 'Get all media files',
        'GET /api/multimedia/media/:mediaId': 'Get media by ID',
        'GET /api/multimedia/media/:mediaId/download': 'Download media file',
        'PUT /api/multimedia/media/:mediaId': 'Update media metadata',
        'DELETE /api/multimedia/media/:mediaId': 'Delete media file'
      },
      search: {
        'GET /api/multimedia/search/media': 'Search media by metadata',
        'GET /api/multimedia/search/nodes': 'Search memory nodes'
      },
      nodes: {
        'POST /api/multimedia/nodes': 'Create a new memory node',
        'GET /api/multimedia/nodes': 'Get all memory nodes',
        'GET /api/multimedia/nodes/:nodeId': 'Get memory node by ID',
        'PUT /api/multimedia/nodes/:nodeId': 'Update memory node',
        'DELETE /api/multimedia/nodes/:nodeId': 'Delete memory node'
      },
      linking: {
        'POST /api/multimedia/link/:mediaId/to/:nodeId': 'Link media to memory node',
        'DELETE /api/multimedia/link/:mediaId/from/:nodeId': 'Unlink media from memory node',
        'GET /api/multimedia/nodes/:nodeId/media': 'Get all media linked to a node',
        'GET /api/multimedia/media/:mediaId/nodes': 'Get all nodes linked to media',
        'POST /api/multimedia/link/bulk/to/:nodeId': 'Bulk link multiple media to node',
        'POST /api/multimedia/unlink/bulk/from/:nodeId': 'Bulk unlink multiple media from node'
      }
    },
    examples: {
      uploadSingle: {
        method: 'POST',
        url: '/api/multimedia/upload/single',
        body: 'FormData with file field "media"',
        response: {
          success: true,
          data: {
            mediaId: 'media_1234567890_abc123',
            filename: '1234567890_abc123.jpg',
            originalName: 'photo.jpg',
            type: 'image',
            metadata: { /* extracted metadata */ }
          }
        }
      },
      createNode: {
        method: 'POST',
        url: '/api/multimedia/nodes',
        body: {
          title: 'Summer Vacation 2023',
          description: 'Photos from our family vacation',
          type: 'event'
        }
      },
      linkMedia: {
        method: 'POST',
        url: '/api/multimedia/link/media_123/to/node_456',
        body: {
          relationship: 'primary'
        }
      }
    }
  });
});

module.exports = router;
