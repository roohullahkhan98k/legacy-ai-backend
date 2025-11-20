const MemoryNode = require('../models/MemoryNode');
const chromaService = require('./MemoryChromaService');
const { Op } = require('sequelize');

class MemoryService {
  /**
   * Create a new memory node
   */
  async createMemory(userId, memoryData) {
    try {
      const { nodeId, title, type, content, filePath, tags, connections, importance, metadata } = memoryData;

      // Create preview (first 200 chars)
      const contentPreview = content ? content.substring(0, 200) : null;

      const memory = await MemoryNode.create({
        user_id: userId,
        node_id: nodeId,
        title,
        type: type || 'text',
        content_preview: contentPreview,
        file_path: filePath,
        tags: tags || [],
        connections: connections || [],
        importance: importance || 0,
        metadata: metadata || {},
        access_count: 0
      });

      // Store in ChromaDB (async, don't wait)
      if (content) {
        chromaService.storeMemory({
          id: memory.id,
          nodeId: memory.node_id,
          userId: userId,
          title: memory.title,
          content: content,
          type: memory.type,
          tags: memory.tags,
          metadata: metadata
        }).then(() => {
          memory.update({ chroma_id: memory.id }).catch(err => 
            console.warn('Failed to update chroma_id:', err.message)
          );
        }).catch(err => 
          console.warn('ChromaDB storage failed:', err.message)
        );
      }

      return { success: true, memory };
    } catch (error) {
      throw new Error(`Failed to create memory: ${error.message}`);
    }
  }

  /**
   * Get memory by node ID
   */
  async getMemory(nodeId) {
    try {
      const memory = await MemoryNode.findOne({ where: { node_id: nodeId } });

      if (!memory) {
        throw new Error('Memory not found');
      }

      // Update access stats
      await memory.update({
        access_count: memory.access_count + 1,
        last_accessed_at: new Date()
      });

      return { success: true, memory };
    } catch (error) {
      throw new Error(`Failed to get memory: ${error.message}`);
    }
  }

  /**
   * Update memory
   */
  async updateMemory(nodeId, updates) {
    try {
      const memory = await MemoryNode.findOne({ where: { node_id: nodeId } });

      if (!memory) {
        throw new Error('Memory not found');
      }

      const { title, content, tags, connections, importance, metadata } = updates;

      const updateData = {};
      
      if (title) updateData.title = title;
      if (content) updateData.content_preview = content.substring(0, 200);
      if (tags) updateData.tags = tags;
      if (connections) updateData.connections = connections;
      if (importance !== undefined) updateData.importance = importance;
      if (metadata) updateData.metadata = { ...memory.metadata, ...metadata };

      await memory.update(updateData);

      // Update in ChromaDB if content or title changed
      if ((content || title) && memory.chroma_id) {
        chromaService.updateMemory(
          memory.chroma_id,
          content || memory.content_preview,
          title || memory.title
        ).catch(err => console.warn('ChromaDB update failed:', err.message));
      }

      return { success: true, memory };
    } catch (error) {
      throw new Error(`Failed to update memory: ${error.message}`);
    }
  }

  /**
   * Delete memory
   */
  async deleteMemory(nodeId) {
    try {
      const memory = await MemoryNode.findOne({ where: { node_id: nodeId } });

      if (!memory) {
        throw new Error('Memory not found');
      }

      // Delete from ChromaDB
      if (memory.chroma_id) {
        chromaService.deleteMemory(memory.chroma_id).catch(err =>
          console.warn('ChromaDB delete failed:', err.message)
        );
      }

      // Delete from PostgreSQL
      await memory.destroy();

      return { success: true, message: 'Memory deleted' };
    } catch (error) {
      throw new Error(`Failed to delete memory: ${error.message}`);
    }
  }

  /**
   * Get all memories for a user
   */
  async getUserMemories(userId, filters = {}) {
    try {
      const { type, tags, limit = 50, offset = 0 } = filters;

      const where = { user_id: userId };

      if (type) where.type = type;
      if (tags && tags.length > 0) {
        where.tags = { [Op.contains]: tags };
      }

      const memories = await MemoryNode.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset,
        attributes: [
          'id', 'node_id', 'title', 'type', 'content_preview',
          'tags', 'connections', 'importance', 'access_count',
          'last_accessed_at', 'created_at'
        ]
      });

      const total = await MemoryNode.count({ where });

      return { success: true, memories, total };
    } catch (error) {
      throw new Error(`Failed to get user memories: ${error.message}`);
    }
  }

  /**
   * Search memories semantically
   */
  async searchMemories(userId, query, limit = 10) {
    try {
      const results = await chromaService.searchMemories(query, userId, limit);

      // Get full memory data from PostgreSQL
      if (results.results.length > 0) {
        const nodeIds = results.results.map(r => r.node_id);
        const memories = await MemoryNode.findAll({
          where: { node_id: { [Op.in]: nodeIds } },
          attributes: [
            'id', 'node_id', 'title', 'type', 'content_preview',
            'tags', 'importance', 'created_at'
          ]
        });

        // Merge distance scores (lower is better)
        const memoriesWithDistance = memories.map(mem => {
          const result = results.results.find(r => r.node_id === mem.node_id);
          return {
            ...mem.toJSON(),
            distance: result ? result.distance : 999
          };
        });

        // Sort by distance (lower = more similar)
        memoriesWithDistance.sort((a, b) => a.distance - b.distance);

        return { success: true, results: memoriesWithDistance };
      }

      return { success: true, results: [] };
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Find similar memories
   */
  async findSimilar(nodeId, limit = 5) {
    try {
      const memory = await MemoryNode.findOne({ where: { node_id: nodeId } });

      if (!memory || !memory.chroma_id) {
        return { success: true, results: [] };
      }

      const results = await chromaService.findSimilar(memory.chroma_id, limit);

      // Get full memory data
      if (results.results.length > 0) {
        const nodeIds = results.results.map(r => r.node_id);
        const memories = await MemoryNode.findAll({
          where: { node_id: { [Op.in]: nodeIds } }
        });

        return { success: true, results: memories };
      }

      return { success: true, results: [] };
    } catch (error) {
      throw new Error(`Find similar failed: ${error.message}`);
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(userId) {
    try {
      const total = await MemoryNode.count({ where: { user_id: userId } });
      
      const byType = await MemoryNode.findAll({
        where: { user_id: userId },
        attributes: [
          'type',
          [MemoryNode.sequelize.fn('COUNT', MemoryNode.sequelize.col('id')), 'count']
        ],
        group: ['type']
      });

      const mostAccessed = await MemoryNode.findAll({
        where: { user_id: userId },
        order: [['access_count', 'DESC']],
        limit: 5,
        attributes: ['node_id', 'title', 'access_count']
      });

      return {
        success: true,
        stats: {
          total,
          by_type: byType.map(t => ({ type: t.type, count: t.get('count') })),
          most_accessed: mostAccessed
        }
      };
    } catch (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }

  /**
   * Add connection between memories
   */
  async addConnection(nodeId, targetNodeId) {
    try {
      const memory = await MemoryNode.findOne({ where: { node_id: nodeId } });

      if (!memory) {
        throw new Error('Memory not found');
      }

      let connections = Array.isArray(memory.connections) ? [...memory.connections] : [];
      
      if (!connections.includes(targetNodeId)) {
        connections.push(targetNodeId);
        memory.connections = connections;
        memory.changed('connections', true);
        await memory.save();
      }

      return { success: true, connections: memory.connections };
    } catch (error) {
      throw new Error(`Failed to add connection: ${error.message}`);
    }
  }

  /**
   * Remove connection
   */
  async removeConnection(nodeId, targetNodeId) {
    try {
      const memory = await MemoryNode.findOne({ where: { node_id: nodeId } });

      if (!memory) {
        throw new Error('Memory not found');
      }

      let connections = Array.isArray(memory.connections) ? [...memory.connections] : [];
      connections = connections.filter(id => id !== targetNodeId);
      
      memory.connections = connections;
      memory.changed('connections', true);
      await memory.save();

      return { success: true, connections: memory.connections };
    } catch (error) {
      throw new Error(`Failed to remove connection: ${error.message}`);
    }
  }
}

module.exports = new MemoryService();

