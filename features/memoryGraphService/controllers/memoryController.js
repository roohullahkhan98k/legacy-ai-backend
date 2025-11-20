const memoryService = require('../services/MemoryService');

class MemoryController {
  // POST /api/memory/create
  async createMemory(req, res) {
    try {
      const { user_id, node_id, title, type, content, file_path, tags, connections, importance, metadata } = req.body;

      if (!user_id || !node_id || !title) {
        return res.status(400).json({
          success: false,
          error: 'user_id, node_id, and title are required'
        });
      }

      const result = await memoryService.createMemory(user_id, {
        nodeId: node_id,
        title,
        type,
        content,
        filePath: file_path,
        tags,
        connections,
        importance,
        metadata
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // GET /api/memory/:nodeId
  async getMemory(req, res) {
    try {
      const { nodeId } = req.params;
      const result = await memoryService.getMemory(nodeId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // PUT /api/memory/:nodeId
  async updateMemory(req, res) {
    try {
      const { nodeId } = req.params;
      const updates = req.body;

      const result = await memoryService.updateMemory(nodeId, updates);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // DELETE /api/memory/:nodeId
  async deleteMemory(req, res) {
    try {
      const { nodeId } = req.params;
      const result = await memoryService.deleteMemory(nodeId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // GET /api/memory/user/:userId
  async getUserMemories(req, res) {
    try {
      const { userId } = req.params;
      const { type, tags, limit, offset } = req.query;

      const filters = {
        type,
        tags: tags ? tags.split(',') : undefined,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      };

      const result = await memoryService.getUserMemories(userId, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/memory/search
  async searchMemories(req, res) {
    try {
      const { user_id, query, limit = 10 } = req.body;

      if (!user_id || !query) {
        return res.status(400).json({
          success: false,
          error: 'user_id and query are required'
        });
      }

      const result = await memoryService.searchMemories(user_id, query, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // GET /api/memory/:nodeId/similar
  async findSimilar(req, res) {
    try {
      const { nodeId } = req.params;
      const { limit = 5 } = req.query;

      const result = await memoryService.findSimilar(nodeId, parseInt(limit));
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // GET /api/memory/stats/:userId
  async getStats(req, res) {
    try {
      const { userId } = req.params;
      const result = await memoryService.getStats(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/memory/:nodeId/connect
  async addConnection(req, res) {
    try {
      const { nodeId } = req.params;
      const { target_node_id } = req.body;

      if (!target_node_id) {
        return res.status(400).json({
          success: false,
          error: 'target_node_id is required'
        });
      }

      const result = await memoryService.addConnection(nodeId, target_node_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // DELETE /api/memory/:nodeId/connect/:targetNodeId
  async removeConnection(req, res) {
    try {
      const { nodeId, targetNodeId } = req.params;
      const result = await memoryService.removeConnection(nodeId, targetNodeId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new MemoryController();

