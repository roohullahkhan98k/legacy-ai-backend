const { ChromaClient } = require('chromadb');

class InterviewChromaService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.collectionName = 'interview_qa';
  }

  async initialize() {
    try {
      this.client = new ChromaClient({
        path: process.env.CHROMA_URL || 'http://localhost:8000'
      });

      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { description: 'AI Interview Q&A for semantic search' }
      });

      console.log('✅ Interview ChromaDB initialized');
    } catch (error) {
      console.warn('⚠️ ChromaDB not available:', error.message);
    }
  }

  async storeQA(interviewId, question, answer) {
    if (!this.collection) await this.initialize();
    if (!this.collection) return; // Skip if ChromaDB not available

    try {
      const docId = `${interviewId}_${Date.now()}`;
      const text = `Q: ${question}\nA: ${answer}`;

      await this.collection.add({
        ids: [docId],
        documents: [text],
        metadatas: [{
          interview_id: interviewId,
          question: question,
          answer: answer,
          timestamp: new Date().toISOString()
        }]
      });
    } catch (error) {
      console.warn('⚠️ Failed to store in ChromaDB:', error.message);
    }
  }

  async searchSimilar(query, limit = 5) {
    if (!this.collection) await this.initialize();
    if (!this.collection) return { results: [] };

    try {
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: limit
      });

      return {
        results: results.ids[0].map((id, i) => ({
          question: results.metadatas[0][i].question,
          answer: results.metadatas[0][i].answer,
          interview_id: results.metadatas[0][i].interview_id,
          similarity: 1 - (results.distances[0][i] || 0)
        }))
      };
    } catch (error) {
      console.warn('⚠️ Search failed:', error.message);
      return { results: [] };
    }
  }

  async deleteInterview(interviewId) {
    if (!this.collection) return;

    try {
      const results = await this.collection.get({
        where: { interview_id: interviewId }
      });

      if (results.ids.length > 0) {
        await this.collection.delete({ ids: results.ids });
      }
    } catch (error) {
      console.warn('⚠️ Delete from ChromaDB failed:', error.message);
    }
  }
}

module.exports = new InterviewChromaService();

