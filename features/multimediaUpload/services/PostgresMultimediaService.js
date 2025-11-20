const { MultimediaFile, MultimediaMemoryNode, MultimediaLink } = require('../models/Multimedia');

class PostgresMultimediaService {
  
  // Save media file to PostgreSQL
  async saveMedia(userId, file, metadata = {}) {
    try {
      const mediaData = await MultimediaFile.create({
        user_id: userId,
        filename: file.filename || file.originalname,
        file_path: file.path,
        file_url: this.buildPublicUrl(file.path),
        file_type: this.getFileType(file.mimetype),
        mime_type: file.mimetype,
        file_size: file.size,
        metadata: metadata || {}
      });
      
      console.log('✅ [Multimedia] Saved to PostgreSQL - user:', userId, 'file:', mediaData.id);
      return mediaData;
    } catch (error) {
      console.error('❌ [Multimedia] Failed to save to PostgreSQL:', error.message);
      return null;
    }
  }

  // Get all media for a user
  async getUserMedia(userId, limit = 100) {
    try {
      const files = await MultimediaFile.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit: limit,
        raw: true
      });
      
      return files;
    } catch (error) {
      console.error('❌ [Multimedia] Failed to get user media:', error.message);
      return [];
    }
  }

  // Delete media file
  async deleteMedia(userId, mediaId) {
    try {
      const file = await MultimediaFile.findOne({
        where: { id: mediaId, user_id: userId }
      });
      
      if (!file) {
        return false;
      }
      
      await file.destroy();
      console.log('✅ [Multimedia] Deleted from PostgreSQL - media:', mediaId);
      return true;
    } catch (error) {
      console.error('❌ [Multimedia] Failed to delete:', error.message);
      return false;
    }
  }

  // Create memory node
  async createMemoryNode(userId, nodeId, data = {}) {
    try {
      const node = await MultimediaMemoryNode.create({
        user_id: userId,
        node_id: nodeId,
        title: data.title || '',
        description: data.description || '',
        metadata: data.metadata || {}
      });
      
      console.log('✅ [Multimedia] Memory node created - user:', userId, 'node:', node.id);
      return node;
    } catch (error) {
      console.error('❌ [Multimedia] Failed to create node:', error.message);
      return null;
    }
  }

  // Link media to node
  async linkMediaToNode(userId, mediaId, nodeId, linkType = 'general') {
    try {
      const link = await MultimediaLink.create({
        user_id: userId,
        media_id: mediaId,
        node_id: nodeId,
        link_type: linkType
      });
      
      console.log('✅ [Multimedia] Link created - media:', mediaId, 'node:', nodeId);
      return link;
    } catch (error) {
      console.error('❌ [Multimedia] Failed to create link:', error.message);
      return null;
    }
  }

  // Unlink media from node
  async unlinkMediaFromNode(userId, mediaId, nodeId) {
    try {
      const deleted = await MultimediaLink.destroy({
        where: {
          user_id: userId,
          media_id: mediaId,
          node_id: nodeId
        }
      });
      
      console.log('✅ [Multimedia] Link deleted - media:', mediaId, 'node:', nodeId);
      return deleted > 0;
    } catch (error) {
      console.error('❌ [Multimedia] Failed to delete link:', error.message);
      return false;
    }
  }

  // Helper: Build public URL from file path
  buildPublicUrl(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    const uploadsIndex = normalized.indexOf('/uploads/');
    if (uploadsIndex !== -1) {
      return normalized.substring(uploadsIndex);
    }
    return '/uploads/multimedia/' + require('path').basename(filePath);
  }

  // Helper: Get file type from MIME type
  getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('application/pdf') || mimeType.startsWith('text/')) return 'document';
    return 'other';
  }
}

module.exports = PostgresMultimediaService;

