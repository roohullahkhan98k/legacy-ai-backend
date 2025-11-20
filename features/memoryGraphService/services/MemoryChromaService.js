const { ChromaClient } = require('chromadb');

class MemoryChromaService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.collectionName = 'memory_graph';
  }

  async initialize() {
    try {
      this.client = new ChromaClient({
        path: process.env.CHROMA_URL || 'http://localhost:8000'
      });

      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { description: 'Memory Graph nodes with semantic search' }
      });

      console.log('✅ Memory Graph ChromaDB initialized');
    } catch (error) {
      console.warn('⚠️ ChromaDB not available:', error.message);
    }
  }

  async storeMemory(memoryData) {
    if (!this.collection) await this.initialize();
    if (!this.collection) return; // Skip if ChromaDB not available

    const { id, title, content, type, tags, userId, nodeId, metadata = {} } = memoryData;

    try {
      // Combine title and content for better search
      const searchText = `${title}\n\n${content || ''}`;

      await this.collection.add({
        ids: [id],
        documents: [searchText],
        metadatas: [{
          node_id: nodeId,
          user_id: userId,
          title: title,
          type: type,
          tags: JSON.stringify(tags || []),
          timestamp: new Date().toISOString(),
          ...metadata
        }]
      });
    } catch (error) {
      console.warn('⚠️ Failed to store in ChromaDB:', error.message);
    }
  }

  async searchMemories(query, userId, limit = 10) {
    if (!this.collection) await this.initialize();
    if (!this.collection) return { results: [] };

    try {
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: limit,
        where: { user_id: userId }
      });

      return {
        results: results.ids[0].map((id, i) => ({
          id: id,
          node_id: results.metadatas[0][i].node_id,
          title: results.metadatas[0][i].title,
          type: results.metadatas[0][i].type,
          tags: JSON.parse(results.metadatas[0][i].tags || '[]'),
          distance: results.distances[0][i] || 0  // Lower is better
        }))
      };
    } catch (error) {
      console.warn('⚠️ Search failed:', error.message);
      return { results: [] };
    }
  }

  async updateMemory(chromaId, content, title) {
    if (!this.collection) await this.initialize();
    if (!this.collection) return;

    try {
      const existing = await this.collection.get({ ids: [chromaId] });
      
      if (!existing.ids.length) return;

      const searchText = `${title}\n\n${content || ''}`;
      const metadata = existing.metadatas[0];

      await this.collection.update({
        ids: [chromaId],
        documents: [searchText],
        metadatas: [{
          ...metadata,
          title: title,
          updated_at: new Date().toISOString()
        }]
      });
    } catch (error) {
      console.warn('⚠️ Update in ChromaDB failed:', error.message);
    }
  }

  async deleteMemory(chromaId) {
    if (!this.collection) return;

    try {
      await this.collection.delete({ ids: [chromaId] });
    } catch (error) {
      console.warn('⚠️ Delete from ChromaDB failed:', error.message);
    }
  }

  async deleteUserMemories(userId) {
    if (!this.collection) return;

    try {
      const results = await this.collection.get({
        where: { user_id: userId }
      });

      if (results.ids.length > 0) {
        await this.collection.delete({ ids: results.ids });
      }
    } catch (error) {
      console.warn('⚠️ Delete user memories from ChromaDB failed:', error.message);
    }
  }

  async findSimilar(nodeId, limit = 5) {
    if (!this.collection) await this.initialize();
    if (!this.collection) return { results: [] };

    try {
      // Get the memory's content
      const memory = await this.collection.get({ ids: [nodeId] });
      
      if (!memory.ids.length) return { results: [] };

      // Search for similar
      const results = await this.collection.query({
        queryTexts: [memory.documents[0]],
        nResults: limit + 1 // +1 because it includes itself
      });

      // Filter out the original memory
      return {
        results: results.ids[0]
          .filter(id => id !== nodeId)
          .slice(0, limit)
          .map((id, i) => ({
            id: id,
            node_id: results.metadatas[0][i].node_id,
            title: results.metadatas[0][i].title,
            similarity: 1 - (results.distances[0][i] || 0)
          }))
      };
    } catch (error) {
      console.warn('⚠️ Find similar failed:', error.message);
      return { results: [] };
    }
  }
}

module.exports = new MemoryChromaService();

