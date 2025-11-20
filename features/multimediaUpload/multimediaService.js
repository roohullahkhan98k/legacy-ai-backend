const { MultimediaFile, MultimediaMemoryNode, MultimediaLink } = require('./models/Multimedia');
const MetadataExtractor = require('./middleware/metadataExtractor');

class MultimediaService {
  constructor() {
    this.name = 'Multimedia Upload & Linking Service';
    this.status = 'Active';
    this.metadataExtractor = new MetadataExtractor();
  }

  // Get service status
  getStatus() {
    return {
      name: this.name,
      status: this.status,
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL',
      endpoints: {
        upload: ['/api/multimedia/upload/single', '/api/multimedia/upload/multiple'],
        media: ['/api/multimedia/media', '/api/multimedia/search/media'],
        nodes: ['/api/multimedia/nodes', '/api/multimedia/search/nodes'],
        linking: ['/api/multimedia/link', '/api/multimedia/unlink']
      }
    };
  }

  // Get service statistics (using PostgreSQL)
  async getStats() {
    try {
      const totalMedia = await MultimediaFile.count();
      const totalNodes = await MultimediaMemoryNode.count();
      const totalLinks = await MultimediaLink.count();
      
      const imageCount = await MultimediaFile.count({ where: { file_type: 'image' } });
      const videoCount = await MultimediaFile.count({ where: { file_type: 'video' } });
      const audioCount = await MultimediaFile.count({ where: { file_type: 'audio' } });

      // Count linked media (distinct media_ids in links table)
      const linkedMediaIds = await MultimediaLink.findAll({
        attributes: ['media_id'],
        group: ['media_id'],
        raw: true
      });
      const linkedMediaCount = linkedMediaIds.length;

      return {
        media: {
          total: totalMedia,
          images: imageCount,
          videos: videoCount,
          audio: audioCount,
          linked: linkedMediaCount,
          unlinked: totalMedia - linkedMediaCount
        },
        nodes: {
          total: totalNodes
        },
        links: {
          total: totalLinks
        },
        storage: {
          database: 'PostgreSQL',
          tables: ['multimedia_files', 'multimedia_memory_nodes', 'multimedia_links']
        }
      };
    } catch (error) {
      console.error('Error getting service stats:', error);
      return {
        error: 'Failed to retrieve statistics',
        message: error.message
      };
    }
  }

  // Legacy methods for backward compatibility
  uploadFile(file, type) {
    console.log('📁 Multimedia Service: uploadFile called (legacy method)');
    console.log('⚠️  Please use the new API endpoints for file uploads');
    return { 
      fileId: 'legacy_placeholder', 
      url: 'legacy_url_placeholder', 
      type,
      message: 'Use POST /api/multimedia/upload/single or /api/multimedia/upload/multiple'
    };
  }

  linkMedia(mediaId, targetId, relationship) {
    console.log('🔗 Multimedia Service: linkMedia called (legacy method)');
    console.log('⚠️  Please use the new API endpoints for linking');
    return { 
      linkId: 'legacy_link_placeholder', 
      mediaId, 
      targetId, 
      relationship,
      message: 'Use POST /api/multimedia/link/:mediaId/to/:nodeId'
    };
  }

  async getMediaInfo(mediaId) {
    console.log('📊 Multimedia Service: getMediaInfo called (legacy method)');
    console.log('⚠️  Please use the new API endpoints for media info');
    try {
      const media = await MultimediaFile.findByPk(mediaId);
      if (media) {
        return { mediaId, info: media };
      }
      return { mediaId, info: null, message: 'Media not found' };
    } catch (error) {
      return { mediaId, info: null, error: error.message };
    }
  }
}

module.exports = MultimediaService;
