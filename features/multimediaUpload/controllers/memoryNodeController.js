const { MultimediaFile, MultimediaMemoryNode, MultimediaLink } = require('../models/Multimedia');
const { randomUUID } = require('crypto');

class MemoryNodeController {
  constructor() {
    // Using PostgreSQL models instead of db.json
  }

  // Create a new memory node
  async createMemoryNode(req, res) {
    try {
      const { title, description, type, metadata = {} } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check subscription and feature limit before creating memory node (multimedia uploads are counted per node, not per photo)
      const featureLimitService = require('../../subscriptionService/services/FeatureLimitService');
      const limitCheck = await featureLimitService.checkLimit(userId, 'multimedia_uploads');
      
      if (!limitCheck.allowed) {
        // Different response based on whether they need subscription or hit limit
        if (limitCheck.needsSubscription) {
          return res.status(403).json({
            success: false,
            error: 'Subscription required',
            message: 'You need an active subscription to create memory nodes. Please subscribe to continue.',
            hasSubscription: false,
            needsSubscription: true,
            redirectToPricing: true
          });
        } else if (limitCheck.limitReached) {
          return res.status(403).json({
            success: false,
            error: 'Limit reached',
            message: limitCheck.message || `You have reached your multimedia upload limit (${limitCheck.limit} nodes per month). Upgrade your plan to create more memory nodes.`,
            limit: limitCheck.limit,
            currentUsage: limitCheck.currentUsage,
            remaining: limitCheck.remaining,
            plan: limitCheck.plan,
            hasSubscription: true,
            limitReached: true,
            redirectToPricing: true
          });
        }
      }

      const nodeId = `node_${Date.now()}_${randomUUID()}`;

      const node = await MultimediaMemoryNode.create({
        user_id: userId,
        node_id: nodeId,
        title: title,
        description: description || '',
        type: type || 'event',
        metadata: metadata
      });

      // Record usage after successful creation (1 per node, regardless of how many photos are linked)
      await featureLimitService.recordUsage(userId, 'multimedia_uploads', {
        node_id: node.node_id,
        node_title: title,
        created_at: new Date()
      });

      console.log('✅ [Multimedia] Memory node created:', { id: node.id, title: node.title, type: node.type, user: userId });

      res.status(201).json({
        success: true,
        message: 'Memory node created successfully',
        data: {
          id: node.id,
          nodeId: node.node_id,
          title: node.title,
          description: node.description,
          type: node.type,
          metadata: node.metadata,
          createdAt: node.created_at ? new Date(node.created_at).toISOString() : new Date().toISOString(),
          updatedAt: node.updated_at ? new Date(node.updated_at).toISOString() : new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Create memory node error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create memory node',
        error: error.message
      });
    }
  }

  // Get all memory nodes
  async getAllMemoryNodes(req, res) {
    try {
      const { page = 1, limit = 20, type, sortBy = 'createdAt', order = 'desc' } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Build where clause
      const where = { user_id: userId };
      if (type) {
        where.type = type;
      }

      // Get nodes from PostgreSQL
      const nodes = await MultimediaMemoryNode.findAll({
        where,
        order: [[sortBy === 'title' ? 'title' : 'created_at', order.toUpperCase()]],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        raw: true
      });

      // Count total
      const totalNodes = await MultimediaMemoryNode.count({ where });

      // Format response
      const formattedNodes = nodes.map(node => ({
        id: node.id,
        nodeId: node.node_id,
        title: node.title,
        description: node.description,
        type: node.type,
        metadata: node.metadata,
        createdAt: node.created_at ? new Date(node.created_at).toISOString() : new Date().toISOString(),
        updatedAt: node.updated_at ? new Date(node.updated_at).toISOString() : new Date().toISOString()
      }));

      res.json({
        success: true,
        data: {
          nodes: formattedNodes,
          count: formattedNodes.length,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalNodes / parseInt(limit)),
            totalItems: totalNodes,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all memory nodes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve memory nodes',
        error: error.message
      });
    }
  }

  // Get single memory node by ID
  async getMemoryNodeById(req, res) {
    try {
      const { nodeId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const node = await MultimediaMemoryNode.findOne({
        where: { id: nodeId, user_id: userId },
        raw: true
      });

      if (!node) {
        return res.status(404).json({
          success: false,
          message: 'Memory node not found'
        });
      }

      res.json({
        success: true,
        data: {
          id: node.id,
          nodeId: node.node_id,
          title: node.title,
          description: node.description,
          type: node.type,
          metadata: node.metadata,
          createdAt: node.created_at ? new Date(node.created_at).toISOString() : new Date().toISOString(),
          updatedAt: node.updated_at ? new Date(node.updated_at).toISOString() : new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get memory node by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve memory node',
        error: error.message
      });
    }
  }

  // Update memory node
  async updateMemoryNode(req, res) {
    try {
      const { nodeId } = req.params;
      const updates = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const node = await MultimediaMemoryNode.findOne({
        where: { id: nodeId, user_id: userId }
      });

      if (!node) {
        return res.status(404).json({
          success: false,
          message: 'Memory node not found'
        });
      }

      // Update fields
      if (updates.title) node.title = updates.title;
      if (updates.description !== undefined) node.description = updates.description;
      if (updates.type) node.type = updates.type;
      if (updates.metadata) node.metadata = { ...node.metadata, ...updates.metadata };

      await node.save();

      console.log('✅ [Multimedia] Memory node updated:', { id: node.id, title: node.title });

      res.json({
        success: true,
        message: 'Memory node updated successfully',
        data: {
          id: node.id,
          nodeId: node.node_id,
          title: node.title,
          description: node.description,
          type: node.type,
          metadata: node.metadata,
          createdAt: node.created_at ? new Date(node.created_at).toISOString() : new Date().toISOString(),
          updatedAt: node.updated_at ? new Date(node.updated_at).toISOString() : new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Update memory node error:', error);
      res.status(500).json({
        success: false,
        message: 'Update failed',
        error: error.message
      });
    }
  }

  // Delete memory node
  async deleteMemoryNode(req, res) {
    try {
      const { nodeId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const deleted = await MultimediaMemoryNode.destroy({
        where: { id: nodeId, user_id: userId }
      });

      if (deleted > 0) {
        console.log('✅ [Multimedia] Memory node deleted:', { id: nodeId });
        
        // Refund usage count
        const featureLimitService = require('../../subscriptionService/services/FeatureLimitService');
        await featureLimitService.refundUsage(userId, 'multimedia_uploads');
        
        res.json({
          success: true,
          message: 'Memory node deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Memory node not found'
        });
      }
    } catch (error) {
      console.error('Delete memory node error:', error);
      res.status(500).json({
        success: false,
        message: 'Delete failed',
        error: error.message
      });
    }
  }

  // Search memory nodes
  async searchMemoryNodes(req, res) {
    try {
      const { query, type } = req.query;
      const allNodes = this.model.getAllMemoryNodes();
      let results = Object.values(allNodes);

      // Filter by type if specified
      if (type) {
        results = results.filter(node => node.type === type);
      }

      // Filter by query if specified
      if (query) {
        const searchTerm = query.toLowerCase();
        results = results.filter(node => 
          node.title?.toLowerCase().includes(searchTerm) ||
          node.description?.toLowerCase().includes(searchTerm)
        );
      }

      res.json({
        success: true,
        data: {
          results,
          count: results.length,
          query: { query, type }
        }
      });
    } catch (error) {
      console.error('Search memory nodes error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed',
        error: error.message
      });
    }
  }

  // Management page methods
  async getNodeManagementPage(req, res) {
    try {
      const { view = 'list', filter, sortBy = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;
      const db = this.model.readDatabase();
      
      let nodes = Object.values(db.memoryNodes);
      
      // Apply filters
      if (filter === 'with_media') {
        nodes = nodes.filter(n => n.linkedMedia.length > 0);
      } else if (filter === 'empty') {
        nodes = nodes.filter(n => n.linkedMedia.length === 0);
      }
      
      // Apply sorting
      nodes.sort((a, b) => {
        const aVal = a[sortBy] || a.createdAt;
        const bVal = b[sortBy] || b.createdAt;
        return order === 'desc' ? new Date(bVal) - new Date(aVal) : new Date(aVal) - new Date(bVal);
      });
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedNodes = nodes.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        data: {
          nodes: paginatedNodes,
          filters: {
            types: ['event', 'person', 'timeline'],
            statuses: ['with_media', 'empty']
          },
          bulkActions: ['delete', 'merge', 'export', 'add_media'],
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(nodes.length / limit),
            totalItems: nodes.length,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Node management page error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get node management page',
        error: error.message
      });
    }
  }

  async getMobileNodes(req, res) {
    try {
      const { limit = 10 } = req.query;
      const db = this.model.readDatabase();
      
      const nodes = Object.values(db.memoryNodes)
        .slice(0, parseInt(limit))
        .map(node => ({
          id: node.id,
          title: node.title,
          type: node.type,
          mediaCount: node.linkedMedia.length,
          preview: node.linkedMedia.length > 0 ? node.linkedMedia[0] : null
        }));
      
      res.json({
        success: true,
        data: { nodes }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get mobile nodes',
        error: error.message
      });
    }
  }

  async getNodeDetailPage(req, res) {
    try {
      const { nodeId } = req.params;
      const node = this.model.getMemoryNode(nodeId);
      
      if (!node) {
        return res.status(404).json({
          success: false,
          message: 'Memory node not found'
        });
      }

      // Get linked media
      const linkedMedia = this.model.getMediaLinksForNode(nodeId);
      
      res.json({
        success: true,
        data: {
          node,
          linkedMedia,
          analytics: {
            totalViews: 0,
            totalDownloads: 0,
            lastAccessed: null,
            mediaTypes: {
              images: linkedMedia.filter(link => link.media.type === 'image').length,
              videos: linkedMedia.filter(link => link.media.type === 'video').length
            }
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get node detail page',
        error: error.message
      });
    }
  }
}

module.exports = new MemoryNodeController();
