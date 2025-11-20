const MetadataExtractor = require('../middleware/metadataExtractor');
const PostgresMultimediaService = require('../services/PostgresMultimediaService');
const { MultimediaFile, MultimediaMemoryNode, MultimediaLink } = require('../models/Multimedia');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

class MultimediaController {
  constructor() {
    this.metadataExtractor = new MetadataExtractor();
    this.pgService = new PostgresMultimediaService();
  }

  // Upload single media file
  async uploadSingle(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const file = req.file;

      // Extract metadata
      const metadata = await this.metadataExtractor.extractMetadata(file.path, file.mimetype);
      const tags = this.metadataExtractor.generateTags(metadata);

      // Save to PostgreSQL
      const pgMedia = await this.pgService.saveMedia(userId, file, {
        ...metadata,
        tags
      });

      if (pgMedia) {
        res.status(201).json({
          success: true,
          message: 'File uploaded successfully',
          data: {
            mediaId: pgMedia.id,
            filename: file.filename,
            originalName: file.originalname,
            type: pgMedia.file_type,
            fileUrl: pgMedia.file_url,
            metadata: pgMedia.metadata,
            downloadUrl: `/api/multimedia/media/${pgMedia.id}/download`
          }
        });
      } else {
        // Clean up uploaded file if database save failed
        fs.unlinkSync(file.path);
        res.status(500).json({
          success: false,
          message: 'Failed to save media metadata'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        success: false,
        message: 'Upload failed',
        error: error.message
      });
    }
  }

  // Upload multiple media files
  async uploadMultiple(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const uploadedFiles = [];
      const failedFiles = [];

      for (const file of req.files) {
        try {
          // Extract metadata
          const metadata = await this.metadataExtractor.extractMetadata(file.path, file.mimetype);
          const tags = this.metadataExtractor.generateTags(metadata);

          // Save to PostgreSQL
          const pgMedia = await this.pgService.saveMedia(userId, file, {
            ...metadata,
            tags
          });

          if (pgMedia) {
            uploadedFiles.push({
              mediaId: pgMedia.id,
              filename: file.filename,
              originalName: file.originalname,
              type: pgMedia.file_type,
              fileUrl: pgMedia.file_url,
              metadata: pgMedia.metadata,
              downloadUrl: `/api/multimedia/media/${pgMedia.id}/download`
            });
          } else {
            // Clean up failed file
            fs.unlinkSync(file.path);
            failedFiles.push({
              filename: file.originalname,
              error: 'Failed to save metadata'
            });
          }
        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          failedFiles.push({
            filename: file.originalname,
            error: error.message
          });
        }
      }

      res.status(201).json({
        success: true,
        message: `Uploaded ${uploadedFiles.length} files successfully`,
        data: {
          uploaded: uploadedFiles,
          failed: failedFiles,
          summary: {
            total: req.files.length,
            successful: uploadedFiles.length,
            failed: failedFiles.length
          }
        }
      });
    } catch (error) {
      console.error('Multiple upload error:', error);
      // Clean up any remaining files
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      res.status(500).json({
        success: false,
        message: 'Multiple upload failed',
        error: error.message
      });
    }
  }

  // Get all media
  async getAllMedia(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { page = 1, limit = 100, type } = req.query;
      
      // Build where clause
      const where = { user_id: userId };
      if (type) {
        where.file_type = type;
      }

      // Get from PostgreSQL
      const mediaList = await MultimediaFile.findAll({
        where: where,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        raw: true
      });

      const total = await MultimediaFile.count({ where: where });

      console.log('[Multimedia] Found', mediaList.length, 'files for user:', userId);

      // Format for frontend
      const formattedMedia = mediaList.map(media => ({
        id: media.id,
        mediaId: media.id,
        filename: media.filename,
        originalName: media.filename,
        path: media.file_path,
        url: media.file_url,
        type: media.file_type,
        mimeType: media.mime_type,
        metadata: media.metadata || {},
        createdAt: media.created_at ? new Date(media.created_at).toISOString() : new Date().toISOString(),
        updatedAt: media.updated_at ? new Date(media.updated_at).toISOString() : new Date().toISOString(),
        linkedNodes: [] // TODO: Join with links table if needed
      }));

      res.json({
        success: true,
        data: {
          media: formattedMedia,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all media error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve media',
        error: error.message
      });
    }
  }

  // Get single media by ID
  async getMediaById(req, res) {
    try {
      const userId = req.user?.id;
      const { mediaId } = req.params;

      const media = await MultimediaFile.findOne({
        where: { id: mediaId },
        raw: true
      });

      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Media not found'
        });
      }

      // Check ownership
      if (userId && media.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: {
          id: media.id,
          mediaId: media.id,
          filename: media.filename,
          path: media.file_path,
          url: media.file_url,
          type: media.file_type,
          mimeType: media.mime_type,
          metadata: media.metadata,
          createdAt: media.created_at ? new Date(media.created_at).toISOString() : new Date().toISOString(),
          updatedAt: media.updated_at ? new Date(media.updated_at).toISOString() : new Date().toISOString(),
          linkedNodes: [] // TODO: Add if needed
        }
      });
    } catch (error) {
      console.error('Get media by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve media',
        error: error.message
      });
    }
  }

  // Download media file
  async downloadMedia(req, res) {
    try {
      const userId = req.user?.id;
      const { mediaId } = req.params;

      const media = await MultimediaFile.findOne({
        where: { id: mediaId },
        raw: true
      });

      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Media not found'
        });
      }

      // Check ownership
      if (userId && media.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (!fs.existsSync(media.file_path)) {
        return res.status(404).json({
          success: false,
          message: 'Media file not found on disk'
        });
      }

      res.download(media.file_path, media.filename);
    } catch (error) {
      console.error('Download media error:', error);
      res.status(500).json({
        success: false,
        message: 'Download failed',
        error: error.message
      });
    }
  }

  // Search media by metadata
  async searchMedia(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { 
        q, type, dateFrom, dateTo, device, location, tags, 
        page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' 
      } = req.query;
      
      // Build where clause for PostgreSQL
      const where = { user_id: userId };
      
      // Apply type filter
      if (type) {
        where.file_type = type;
      }
      
      // Get media from PostgreSQL
      let results = await MultimediaFile.findAll({
        where,
        order: [[sortBy, order.toUpperCase()]]
      });
      
      // Convert to array format for compatibility
      results = results.map(media => ({
        id: media.id,
        originalName: media.filename,
        type: media.file_type,
        filePath: media.file_path,
        createdAt: media.created_at,
        metadata: {
          tags: media.metadata?.tags || [],
          device: media.metadata?.device,
          location: media.metadata?.location,
          dateTaken: media.metadata?.date_taken,
          fileSize: media.file_size
        }
      }));

      // Apply text search
      if (q) {
        const searchTerm = q.toLowerCase();
        results = results.filter(media => 
          media.originalName.toLowerCase().includes(searchTerm) ||
          (media.metadata.tags && media.metadata.tags.some(tag => 
            tag.toLowerCase().includes(searchTerm)
          ))
        );
      }

      // Apply date range filter
      if (dateFrom || dateTo) {
        const fromDate = dateFrom ? new Date(dateFrom) : new Date(0);
        const toDate = dateTo ? new Date(dateTo) : new Date();
        
        results = results.filter(media => {
          const mediaDate = new Date(media.metadata.dateTaken || media.createdAt);
          return mediaDate >= fromDate && mediaDate <= toDate;
        });
      }

      // Apply device filter
      if (device) {
        results = results.filter(media => 
          media.metadata.device && 
          media.metadata.device.toLowerCase().includes(device.toLowerCase())
        );
      }

      // Apply location filter
      if (location) {
        results = results.filter(media => 
          media.metadata.location && 
          media.metadata.location.toLowerCase().includes(location.toLowerCase())
        );
      }

      // Apply tags filter
      if (tags) {
        const tagList = tags.split(',').map(tag => tag.trim().toLowerCase());
        results = results.filter(media => 
          media.metadata.tags && 
          tagList.some(tag => 
            media.metadata.tags.some(mediaTag => 
              mediaTag.toLowerCase().includes(tag)
            )
          )
        );
      }

      // Apply sorting
      results.sort((a, b) => {
        let aVal, bVal;
        
        switch (sortBy) {
          case 'dateTaken':
            aVal = new Date(a.metadata.dateTaken || a.createdAt);
            bVal = new Date(b.metadata.dateTaken || b.createdAt);
            break;
          case 'fileSize':
            aVal = a.metadata.fileSize || 0;
            bVal = b.metadata.fileSize || 0;
            break;
          case 'originalName':
            aVal = a.originalName.toLowerCase();
            bVal = b.originalName.toLowerCase();
            break;
          default:
            aVal = new Date(a.createdAt);
            bVal = new Date(b.createdAt);
        }
        
        if (order === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedResults = results.slice(startIndex, endIndex);

      // Get linked nodes for each media
      const enrichedResults = await Promise.all(paginatedResults.map(async (media) => {
        const links = await MultimediaLink.findAll({
          where: { media_id: media.id, user_id: userId },
          include: [{
            model: MultimediaMemoryNode,
            as: 'node',
            attributes: ['id', 'title']
          }]
        });
        
        return {
          ...media,
          linkedNodes: links.map(link => ({
            nodeId: link.node.id,
            title: link.node.title,
            relationship: link.relationship
          }))
        };
      }));

      res.json({
        success: true,
        data: {
          results: enrichedResults,
          count: enrichedResults.length,
          total: results.length,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(results.length / limit),
            totalItems: results.length,
            itemsPerPage: parseInt(limit)
          },
          criteria: { q, type, dateFrom, dateTo, device, location, tags }
        }
      });
    } catch (error) {
      console.error('Search media error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed',
        error: error.message
      });
    }
  }

  // Delete media
  async deleteMedia(req, res) {
    try {
      const userId = req.user?.id;
      const { mediaId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const media = await MultimediaFile.findOne({
        where: { id: mediaId }
      });

      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Media not found'
        });
      }

      // Check ownership
      if (media.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Delete file from disk
      if (fs.existsSync(media.file_path)) {
        fs.unlinkSync(media.file_path);
      }

      // Delete from PostgreSQL (cascade will delete links)
      await media.destroy();

      console.log('✅ [Multimedia] Media deleted - user:', userId, 'media:', mediaId);

      res.json({
        success: true,
        message: 'Media deleted successfully'
      });
    } catch (error) {
      console.error('Delete media error:', error);
      res.status(500).json({
        success: false,
        message: 'Delete failed',
        error: error.message
      });
    }
  }

  // Update media metadata
  async updateMediaMetadata(req, res) {
    try {
      const { mediaId } = req.params;
      const updates = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const media = await MultimediaFile.findOne({
        where: { id: mediaId, user_id: userId }
      });

      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Media not found'
        });
      }

      // Update metadata
      if (updates.metadata) {
        media.metadata = { ...media.metadata, ...updates.metadata };
      }

      await media.save();

      console.log('✅ [Multimedia] Media metadata updated:', { id: media.id, filename: media.filename });

      res.json({
        success: true,
        message: 'Media metadata updated successfully',
        data: {
          id: media.id,
          mediaId: media.id,
          filename: media.filename,
          path: media.file_path,
          url: media.file_url,
          type: media.file_type,
          mimeType: media.mime_type,
          metadata: media.metadata,
          createdAt: media.created_at ? new Date(media.created_at).toISOString() : new Date().toISOString(),
          updatedAt: media.updated_at ? new Date(media.updated_at).toISOString() : new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Update media error:', error);
      res.status(500).json({
        success: false,
        message: 'Update failed',
        error: error.message
      });
    }
  }

  // Analytics methods
  async getDashboardAnalytics(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get counts from PostgreSQL
      const [totalMedia, totalNodes, totalLinks] = await Promise.all([
        MultimediaFile.count({ where: { user_id: userId } }),
        MultimediaMemoryNode.count({ where: { user_id: userId } }),
        MultimediaLink.count({
          include: [{
            model: MultimediaFile,
            as: 'media',
            where: { user_id: userId },
            attributes: []
          }]
        })
      ]);
      
      // Calculate storage used
      const mediaFiles = await MultimediaFile.findAll({
        where: { user_id: userId },
        attributes: ['file_size'],
        raw: true
      });
      
      const storageUsed = mediaFiles.reduce((sum, m) => sum + (m.file_size || 0), 0);
      
      // Get media stats
      const [imageCount, videoCount] = await Promise.all([
        MultimediaFile.count({ where: { user_id: userId, file_type: 'image' } }),
        MultimediaFile.count({ where: { user_id: userId, file_type: 'video' } })
      ]);
      
      // Get linked/unlinked media counts
      const linkedMediaIds = await MultimediaLink.findAll({
        include: [{
          model: MultimediaFile,
          as: 'media',
          where: { user_id: userId },
          attributes: ['id']
        }],
        attributes: ['media_id'],
        raw: true
      });
      const uniqueLinkedMediaIds = new Set(linkedMediaIds.map(l => l.media_id));
      const linkedMedia = uniqueLinkedMediaIds.size;
      const unlinkedMedia = totalMedia - linkedMedia;
      
      // Get node stats
      const [eventCount, personCount, timelineCount] = await Promise.all([
        MultimediaMemoryNode.count({ where: { user_id: userId, type: 'event' } }),
        MultimediaMemoryNode.count({ where: { user_id: userId, type: 'person' } }),
        MultimediaMemoryNode.count({ where: { user_id: userId, type: 'timeline' } })
      ]);
      
      // Nodes with media
      const nodesWithMedia = await MultimediaLink.count({
        where: { user_id: userId },
        distinct: true,
        col: 'node_id'
      });
      
      const analytics = {
        overview: {
          totalMedia,
          totalNodes,
          totalLinks,
          storageUsed: `${(storageUsed / (1024 * 1024 * 1024)).toFixed(2)} GB`,
          lastActivity: new Date().toISOString()
        },
        mediaStats: {
          images: imageCount,
          videos: videoCount,
          unlinkedMedia,
          linkedMedia
        },
        nodeStats: {
          events: eventCount,
          people: personCount,
          timeline: timelineCount,
          nodesWithMedia: nodesWithMedia,
          emptyNodes: totalNodes - nodesWithMedia
        },
        recentActivity: [],
        topNodes: []
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Dashboard analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get analytics',
        error: error.message
      });
    }
  }

  async getMediaAnalytics(req, res) {
    try {
      const { period = '30d' } = req.query;
      const db = this.model.readDatabase();
      
      const analytics = {
        uploads: {
          total: Object.keys(db.media).length,
          byDay: [] // Simplified for now
        },
        linking: {
          linked: Object.values(db.media).filter(m => m.linkedNodes.length > 0).length,
          unlinked: Object.values(db.media).filter(m => m.linkedNodes.length === 0).length,
          linkRate: 0
        }
      };

      analytics.linking.linkRate = analytics.uploads.total > 0 
        ? ((analytics.linking.linked / analytics.uploads.total) * 100).toFixed(1)
        : 0;

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Media analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get media analytics',
        error: error.message
      });
    }
  }

  async getNodeAnalytics(req, res) {
    try {
      const db = this.model.readDatabase();
      
      const analytics = {
        creation: {
          total: Object.keys(db.memoryNodes).length,
          byType: {
            event: Object.values(db.memoryNodes).filter(n => n.type === 'event').length,
            person: Object.values(db.memoryNodes).filter(n => n.type === 'person').length,
            timeline: Object.values(db.memoryNodes).filter(n => n.type === 'timeline').length
          }
        }
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Node analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get node analytics',
        error: error.message
      });
    }
  }

  // Management page methods
  async getMediaManagementPage(req, res) {
    try {
      const { view = 'grid', filter, sortBy = 'createdAt', order = 'desc', page = 1, limit = 50 } = req.query;
      const db = this.model.readDatabase();
      
      let media = Object.values(db.media);
      
      // Apply filters
      if (filter === 'unlinked') {
        media = media.filter(m => m.linkedNodes.length === 0);
      } else if (filter === 'linked') {
        media = media.filter(m => m.linkedNodes.length > 0);
      }
      
      // Apply sorting
      media.sort((a, b) => {
        const aVal = a[sortBy] || a.createdAt;
        const bVal = b[sortBy] || b.createdAt;
        return order === 'desc' ? new Date(bVal) - new Date(aVal) : new Date(aVal) - new Date(bVal);
      });
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedMedia = media.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        data: {
          media: paginatedMedia,
          filters: {
            types: ['image', 'video'],
            statuses: ['linked', 'unlinked'],
            dateRanges: ['today', 'week', 'month', 'year']
          },
          bulkActions: ['link_to_node', 'delete', 'export_metadata', 'add_tags'],
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(media.length / limit),
            totalItems: media.length,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Media management page error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get media management page',
        error: error.message
      });
    }
  }

  // Utility methods
  async healthCheck(req, res) {
    try {
      res.json({
        success: true,
        message: 'Multimedia service is healthy',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error.message
      });
    }
  }

  async getSystemStatus(req, res) {
    try {
      const db = this.model.readDatabase();
      const totalMedia = Object.keys(db.media).length;
      
      let storageUsed = 0;
      Object.values(db.media).forEach(media => {
        storageUsed += media.metadata.fileSize || 0;
      });
      
      res.json({
        success: true,
        data: {
          status: 'healthy',
          version: '1.0.0',
          uptime: process.uptime(),
          database: 'connected',
          storage: {
            total: '10 GB',
            used: `${(storageUsed / (1024 * 1024 * 1024)).toFixed(2)} GB`,
            available: `${(10 - (storageUsed / (1024 * 1024 * 1024))).toFixed(2)} GB`
          },
          services: {
            upload: 'active',
            metadata: 'active',
            linking: 'active',
            analytics: 'active'
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get system status',
        error: error.message
      });
    }
  }

  // Advanced search implementation
  async advancedSearch(req, res) {
    try {
      const { media, nodes, linking } = req.body;
      const db = this.model.readDatabase();
      
      let results = {
        media: [],
        nodes: [],
        links: []
      };
      
      // Search media
      if (media) {
        let mediaResults = Object.values(db.media);
        
        if (media.type) {
          mediaResults = mediaResults.filter(m => m.type === media.type);
        }
        
        if (media.dateRange) {
          const fromDate = new Date(media.dateRange.from);
          const toDate = new Date(media.dateRange.to);
          mediaResults = mediaResults.filter(m => {
            const mediaDate = new Date(m.metadata.dateTaken || m.createdAt);
            return mediaDate >= fromDate && mediaDate <= toDate;
          });
        }
        
        if (media.metadata) {
          if (media.metadata.device) {
            mediaResults = mediaResults.filter(m => 
              m.metadata.device && m.metadata.device.toLowerCase().includes(media.metadata.device.toLowerCase())
            );
          }
          if (media.metadata.location) {
            mediaResults = mediaResults.filter(m => 
              m.metadata.location && m.metadata.location.toLowerCase().includes(media.metadata.location.toLowerCase())
            );
          }
        }
        
        if (media.tags && media.tags.length > 0) {
          mediaResults = mediaResults.filter(m => 
            media.tags.some(tag => m.metadata.tags && m.metadata.tags.includes(tag))
          );
        }
        
        results.media = mediaResults;
      }
      
      // Search nodes
      if (nodes) {
        let nodeResults = Object.values(db.memoryNodes);
        
        if (nodes.type) {
          nodeResults = nodeResults.filter(n => n.type === nodes.type);
        }
        
        if (nodes.metadata) {
          if (nodes.metadata.location) {
            nodeResults = nodeResults.filter(n => 
              n.metadata.location && n.metadata.location.toLowerCase().includes(nodes.metadata.location.toLowerCase())
            );
          }
          if (nodes.metadata.participants) {
            nodeResults = nodeResults.filter(n => 
              n.metadata.participants && n.metadata.participants.some(p => 
                nodes.metadata.participants.includes(p)
              )
            );
          }
        }
        
        results.nodes = nodeResults;
      }
      
      // Search links
      if (linking) {
        let linkResults = Object.values(db.mediaLinks);
        
        if (linking.relationship) {
          linkResults = linkResults.filter(l => l.relationship === linking.relationship);
        }
        
        if (linking.linkedOnly) {
          linkResults = linkResults.filter(l => {
            const media = db.media[l.mediaId];
            const node = db.memoryNodes[l.nodeId];
            return media && node;
          });
        }
        
        results.links = linkResults;
      }
      
      res.json({
        success: true,
        data: {
          results,
          summary: {
            mediaCount: results.media.length,
            nodeCount: results.nodes.length,
            linkCount: results.links.length
          }
        }
      });
    } catch (error) {
      console.error('Advanced search error:', error);
      res.status(500).json({
        success: false,
        message: 'Advanced search failed',
        error: error.message
      });
    }
  }

  // Bulk operations implementation
  async bulkMediaOperation(req, res) {
    try {
      const { action, mediaIds, params } = req.body;
      
      if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'mediaIds must be a non-empty array'
        });
      }
      
      const results = {
        successful: [],
        failed: []
      };
      
      for (const mediaId of mediaIds) {
        try {
          switch (action) {
            case 'link_to_node':
              if (params.nodeId) {
                // Use existing bulk link functionality
                const linkResult = await this.model.createMediaLink(mediaId, params.nodeId, params.relationship || 'associated');
                if (linkResult) {
                  results.successful.push({ mediaId, action: 'linked', nodeId: params.nodeId });
                } else {
                  results.failed.push({ mediaId, action, error: 'Link creation failed' });
                }
              }
              break;
              
            case 'unlink_from_node':
              if (params.nodeId) {
                const unlinkResult = this.model.deleteMediaLink(mediaId, params.nodeId);
                if (unlinkResult) {
                  results.successful.push({ mediaId, action: 'unlinked', nodeId: params.nodeId });
                } else {
                  results.failed.push({ mediaId, action, error: 'Unlink failed' });
                }
              }
              break;
              
            case 'delete':
              const media = this.model.getMedia(mediaId);
              if (media) {
                // Delete file from disk
                if (fs.existsSync(media.path)) {
                  fs.unlinkSync(media.path);
                }
                const deleteResult = this.model.deleteMedia(mediaId);
                if (deleteResult) {
                  results.successful.push({ mediaId, action: 'deleted' });
                } else {
                  results.failed.push({ mediaId, action, error: 'Delete failed' });
                }
              } else {
                results.failed.push({ mediaId, action, error: 'Media not found' });
              }
              break;
              
            case 'add_tags':
              if (params.tags && Array.isArray(params.tags)) {
                const media = this.model.getMedia(mediaId);
                if (media) {
                  const existingTags = media.metadata.tags || [];
                  const newTags = [...new Set([...existingTags, ...params.tags])];
                  const updateResult = this.model.updateMedia(mediaId, {
                    metadata: { ...media.metadata, tags: newTags }
                  });
                  if (updateResult) {
                    results.successful.push({ mediaId, action: 'tags_added', tags: params.tags });
                  } else {
                    results.failed.push({ mediaId, action, error: 'Tag update failed' });
                  }
                } else {
                  results.failed.push({ mediaId, action, error: 'Media not found' });
                }
              }
              break;
              
            case 'remove_tags':
              if (params.tags && Array.isArray(params.tags)) {
                const media = this.model.getMedia(mediaId);
                if (media) {
                  const existingTags = media.metadata.tags || [];
                  const newTags = existingTags.filter(tag => !params.tags.includes(tag));
                  const updateResult = this.model.updateMedia(mediaId, {
                    metadata: { ...media.metadata, tags: newTags }
                  });
                  if (updateResult) {
                    results.successful.push({ mediaId, action: 'tags_removed', tags: params.tags });
                  } else {
                    results.failed.push({ mediaId, action, error: 'Tag update failed' });
                  }
                } else {
                  results.failed.push({ mediaId, action, error: 'Media not found' });
                }
              }
              break;
              
            default:
              results.failed.push({ mediaId, action, error: 'Unknown action' });
          }
        } catch (error) {
          results.failed.push({ mediaId, action, error: error.message });
        }
      }
      
      res.json({
        success: true,
        message: `Bulk operation completed: ${results.successful.length} successful, ${results.failed.length} failed`,
        data: {
          action,
          results,
          summary: {
            total: mediaIds.length,
            successful: results.successful.length,
            failed: results.failed.length
          }
        }
      });
    } catch (error) {
      console.error('Bulk operation error:', error);
      res.status(500).json({
        success: false,
        message: 'Bulk operation failed',
        error: error.message
      });
    }
  }

  async getBulkActions(req, res) {
    try {
      const { type, selectedCount } = req.query;
      
      let actions = [];
      
      if (type === 'media') {
        actions = [
          { id: 'link_to_node', name: 'Link to Memory Node', requiresParams: ['nodeId'] },
          { id: 'unlink_from_node', name: 'Unlink from Memory Node', requiresParams: ['nodeId'] },
          { id: 'delete', name: 'Delete Media', requiresConfirmation: true },
          { id: 'add_tags', name: 'Add Tags', requiresParams: ['tags'] },
          { id: 'remove_tags', name: 'Remove Tags', requiresParams: ['tags'] },
          { id: 'export_metadata', name: 'Export Metadata' }
        ];
      } else if (type === 'nodes') {
        actions = [
          { id: 'delete', name: 'Delete Nodes', requiresConfirmation: true },
          { id: 'merge', name: 'Merge Nodes', requiresParams: ['targetNodeId'] },
          { id: 'export', name: 'Export Nodes' },
          { id: 'add_media', name: 'Add Media', requiresParams: ['mediaIds'] }
        ];
      } else if (type === 'links') {
        actions = [
          { id: 'unlink', name: 'Unlink Selected', requiresConfirmation: true },
          { id: 'change_relationship', name: 'Change Relationship', requiresParams: ['relationship'] },
          { id: 'export_links', name: 'Export Links' }
        ];
      }
      
      res.json({
        success: true,
        data: {
          actions,
          selectedCount: parseInt(selectedCount) || 0
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get bulk actions',
        error: error.message
      });
    }
  }

  // Export implementation
  async exportMedia(req, res) {
    try {
      const { format = 'json', includeMetadata = true, dateFrom, dateTo } = req.query;
      const db = this.model.readDatabase();
      
      let media = Object.values(db.media);
      
      // Apply date filter
      if (dateFrom || dateTo) {
        const fromDate = dateFrom ? new Date(dateFrom) : new Date(0);
        const toDate = dateTo ? new Date(dateTo) : new Date();
        
        media = media.filter(m => {
          const mediaDate = new Date(m.metadata.dateTaken || m.createdAt);
          return mediaDate >= fromDate && mediaDate <= toDate;
        });
      }
      
      // Prepare export data
      const exportData = media.map(m => {
        const baseData = {
          id: m.id,
          originalName: m.originalName,
          filename: m.filename,
          type: m.type,
          mimeType: m.mimeType,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt
        };
        
        if (includeMetadata) {
          baseData.metadata = m.metadata;
        }
        
        // Add linked nodes info
        const linkedNodes = this.model.getMediaLinksForMedia(m.id);
        baseData.linkedNodes = linkedNodes.map(link => ({
          nodeId: link.node.id,
          nodeTitle: link.node.title,
          relationship: link.relationship,
          linkedAt: link.createdAt
        }));
        
        return baseData;
      });
      
      if (format === 'csv') {
        // Convert to CSV format
        const csvHeaders = ['id', 'originalName', 'filename', 'type', 'createdAt', 'linkedNodesCount'];
        const csvRows = exportData.map(item => [
          item.id,
          item.originalName,
          item.filename,
          item.type,
          item.createdAt,
          item.linkedNodes.length
        ]);
        
        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=media_export.csv');
        res.send(csvContent);
      } else {
        // JSON format
        res.json({
          success: true,
          data: {
            exportDate: new Date().toISOString(),
            totalItems: exportData.length,
            format: 'json',
            includeMetadata,
            dateRange: { from: dateFrom, to: dateTo },
            items: exportData
          }
        });
      }
    } catch (error) {
      console.error('Export media error:', error);
      res.status(500).json({
        success: false,
        message: 'Export failed',
        error: error.message
      });
    }
  }

  async importMedia(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded for import'
        });
      }

      const { format = 'json' } = req.body;
      const filePath = req.file.path;
      
      let importData;
      
      try {
        if (format === 'json') {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          importData = JSON.parse(fileContent);
        } else if (format === 'csv') {
          // Basic CSV parsing (in a real implementation, you'd use a proper CSV parser)
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const lines = fileContent.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          importData = {
            items: lines.slice(1).map(line => {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
              const item = {};
              headers.forEach((header, index) => {
                item[header] = values[index] || '';
              });
              return item;
            })
          };
        } else {
          throw new Error('Unsupported format. Use json or csv.');
        }
      } catch (parseError) {
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        return res.status(400).json({
          success: false,
          message: 'Failed to parse import file',
          error: parseError.message
        });
      }

      // Process import data
      const results = {
        successful: [],
        failed: []
      };

      const items = importData.items || (Array.isArray(importData) ? importData : [importData]);
      
      for (const item of items) {
        try {
          // Validate required fields
          if (!item.id && !item.originalName) {
            results.failed.push({
              item,
              error: 'Missing required fields: id or originalName'
            });
            continue;
          }

          // Create media entry
          const mediaId = item.id || `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const mediaEntry = {
            id: mediaId,
            originalName: item.originalName || 'imported_file',
            filename: item.filename || `${mediaId}.unknown`,
            path: item.path || '',
            relativePath: item.relativePath || '',
            type: item.type || 'unknown',
            mimeType: item.mimeType || 'application/octet-stream',
            metadata: item.metadata || {
              fileSize: item.fileSize || 0,
              tags: item.tags || []
            },
            linkedNodes: [],
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Save to database
          const db = this.model.readDatabase();
          db.media[mediaId] = mediaEntry;
          
          if (this.model.writeDatabase(db)) {
            results.successful.push({
              mediaId,
              originalName: mediaEntry.originalName,
              type: mediaEntry.type
            });
          } else {
            results.failed.push({
              item,
              error: 'Failed to save to database'
            });
          }
        } catch (itemError) {
          results.failed.push({
            item,
            error: itemError.message
          });
        }
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.json({
        success: true,
        message: `Import completed: ${results.successful.length} successful, ${results.failed.length} failed`,
        data: {
          format,
          results,
          summary: {
            total: items.length,
            successful: results.successful.length,
            failed: results.failed.length
          }
        }
      });
    } catch (error) {
      console.error('Import media error:', error);
      
      // Clean up uploaded file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({
        success: false,
        message: 'Import failed',
        error: error.message
      });
    }
  }

  async getMobileMedia(req, res) {
    try {
      const { limit = 20, thumbnail = true } = req.query;
      const db = this.model.readDatabase();
      
      const media = Object.values(db.media)
        .slice(0, parseInt(limit))
        .map(item => ({
          id: item.id,
          originalName: item.originalName,
          type: item.type,
          mimeType: item.mimeType,
          metadata: {
            fileSize: item.metadata.fileSize,
            width: item.metadata.width,
            height: item.metadata.height,
            dateTaken: item.metadata.dateTaken
          },
          linkedNodesCount: item.linkedNodes ? item.linkedNodes.length : 0,
          thumbnail: thumbnail ? `/api/multimedia/media/${item.id}/thumbnail` : null,
          downloadUrl: `/api/multimedia/media/${item.id}/download`,
          createdAt: item.createdAt
        }));
      
      res.json({
        success: true,
        data: {
          media,
          pagination: {
            limit: parseInt(limit),
            total: Object.keys(db.media).length
          }
        }
      });
    } catch (error) {
      console.error('Mobile media error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get mobile media',
        error: error.message
      });
    }
  }

  async getThumbnail(req, res) {
    try {
      const { mediaId } = req.params;
      const { size = 'medium' } = req.query;
      
      const media = this.model.getMedia(mediaId);
      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Media not found'
        });
      }
      
      // For now, return the original image
      // In a real implementation, you would generate thumbnails
      const filePath = media.path;
      
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', media.mimeType);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.sendFile(filePath);
      } else {
        res.status(404).json({
          success: false,
          message: 'File not found on disk'
        });
      }
    } catch (error) {
      console.error('Thumbnail error:', error);
      res.status(500).json({
        success: false,
        message: 'Thumbnail generation failed',
        error: error.message
      });
    }
  }

  async getPreview(req, res) {
    try {
      const { mediaId } = req.params;
      const { width = 800, height = 600, quality = 80 } = req.query;
      
      const media = this.model.getMedia(mediaId);
      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Media not found'
        });
      }
      
      // For now, return the original image
      // In a real implementation, you would resize the image
      const filePath = media.path;
      
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', media.mimeType);
        res.setHeader('Cache-Control', 'public, max-age=1800'); // Cache for 30 minutes
        res.sendFile(filePath);
      } else {
        res.status(404).json({
          success: false,
          message: 'File not found on disk'
        });
      }
    } catch (error) {
      console.error('Preview error:', error);
      res.status(500).json({
        success: false,
        message: 'Preview generation failed',
        error: error.message
      });
    }
  }

  async getMediaDetailPage(req, res) {
    try {
      const { mediaId } = req.params;
      const media = this.model.getMedia(mediaId);
      
      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Media not found'
        });
      }

      // Get linked nodes
      const linkedNodes = this.model.getMediaLinksForMedia(mediaId);
      
      res.json({
        success: true,
        data: {
          media,
          linkedNodes,
          analytics: {
            viewCount: 0,
            lastViewed: null,
            downloadCount: 0,
            lastDownloaded: null
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get media detail page',
        error: error.message
      });
    }
  }
}

module.exports = new MultimediaController();
