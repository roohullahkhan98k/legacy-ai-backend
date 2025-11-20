const { MultimediaFile, MultimediaMemoryNode, MultimediaLink } = require('../models/Multimedia');

class LinkingController {
  constructor() {
    // Using PostgreSQL models instead of db.json
  }

  // Link media to memory node
  async linkMediaToNode(req, res) {
    try {
      const { mediaId, nodeId } = req.params;
      const { relationship = 'associated' } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Verify media exists and belongs to user
      const media = await MultimediaFile.findOne({
        where: { id: mediaId, user_id: userId },
        raw: true
      });

      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Media not found'
        });
      }

      // Verify memory node exists and belongs to user
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

      // Check if link already exists
      const existingLink = await MultimediaLink.findOne({
        where: { media_id: mediaId, node_id: nodeId, user_id: userId }
      });

      if (existingLink) {
        return res.status(400).json({
          success: false,
          message: 'Media is already linked to this memory node',
          data: {
            linkId: existingLink.id,
            relationship: existingLink.relationship
          }
        });
      }

      // Create the link
      const link = await MultimediaLink.create({
        user_id: userId,
        media_id: mediaId,
        node_id: nodeId,
        relationship: relationship,
        link_type: 'general'
      });

      console.log('✅ [Multimedia] Link created:', { linkId: link.id, media: mediaId, node: nodeId, relationship });

      res.status(201).json({
        success: true,
        message: 'Media linked to memory node successfully',
        data: {
          linkId: link.id,
          mediaId,
          nodeId,
          relationship,
          media: {
            id: media.id,
            filename: media.filename,
            type: media.file_type
          },
          node: {
            id: node.id,
            title: node.title,
            type: node.type
          }
        }
      });
    } catch (error) {
      console.error('Link media to node error:', error);
      res.status(500).json({
        success: false,
        message: 'Linking failed',
        error: error.message
      });
    }
  }

  // Unlink media from memory node
  async unlinkMediaFromNode(req, res) {
    try {
      const { mediaId, nodeId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Find and delete the link
      const deleted = await MultimediaLink.destroy({
        where: {
          media_id: mediaId,
          node_id: nodeId,
          user_id: userId
        }
      });

      if (deleted > 0) {
        console.log('✅ [Multimedia] Link removed:', { media: mediaId, node: nodeId });
        res.json({
          success: true,
          message: 'Media unlinked from memory node successfully',
          data: {
            mediaId,
            nodeId
          }
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Link not found'
        });
      }
    } catch (error) {
      console.error('Unlink media from node error:', error);
      res.status(500).json({
        success: false,
        message: 'Unlinking failed',
        error: error.message
      });
    }
  }

  // Get all media linked to a memory node
  async getMediaForNode(req, res) {
    try {
      const { nodeId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Verify memory node exists and belongs to user
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

      // Get all links for this node
      const links = await MultimediaLink.findAll({
        where: { node_id: nodeId, user_id: userId },
        include: [{
          model: MultimediaFile,
          as: 'media',
          attributes: ['id', 'filename', 'file_path', 'file_url', 'file_type', 'mime_type', 'file_size', 'metadata', 'created_at', 'updated_at']
        }],
        raw: false
      });

      const linkedMedia = links.map(link => ({
        id: link.media.id,
        filename: link.media.filename,
        originalName: link.media.filename,
        path: link.media.file_path,
        type: link.media.file_type,
        mimeType: link.media.mime_type,
        metadata: link.media.metadata || { fileSize: link.media.file_size, tags: [] },
        relationship: link.relationship,
        linkedAt: link.created_at,
        createdAt: link.media.created_at,
        updatedAt: link.media.updated_at
      }));

      res.json({
        success: true,
        data: {
          media: linkedMedia,
          linkedMedia: linkedMedia,
          count: linkedMedia.length
        }
      });
    } catch (error) {
      console.error('Get media for node error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve linked media',
        error: error.message
      });
    }
  }

  // Get all memory nodes linked to a media
  async getNodesForMedia(req, res) {
    try {
      const { mediaId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Verify media exists and belongs to user
      const media = await MultimediaFile.findOne({
        where: { id: mediaId, user_id: userId },
        raw: true
      });

      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Media not found'
        });
      }

      // Get all links for this media
      const links = await MultimediaLink.findAll({
        where: { media_id: mediaId, user_id: userId },
        include: [{
          model: MultimediaMemoryNode,
          as: 'node',
          attributes: ['id', 'node_id', 'title', 'description', 'type', 'metadata', 'created_at', 'updated_at']
        }],
        raw: false
      });

      const linkedNodes = links.map(link => ({
        id: link.node.id,
        nodeId: link.node.node_id,
        title: link.node.title,
        description: link.node.description,
        type: link.node.type,
        metadata: link.node.metadata,
        relationship: link.relationship,
        linkedAt: link.created_at,
        createdAt: link.node.created_at,
        updatedAt: link.node.updated_at
      }));

      res.json({
        success: true,
        data: {
          linkedNodes,
          count: linkedNodes.length
        }
      });
    } catch (error) {
      console.error('Get nodes for media error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve linked nodes',
        error: error.message
      });
    }
  }

  // Bulk link multiple media to a memory node
  async bulkLinkMediaToNode(req, res) {
    try {
      const { nodeId } = req.params;
      const { mediaIds, relationship = 'associated' } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'mediaIds must be a non-empty array'
        });
      }

      // Verify memory node exists and belongs to user
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

      const results = {
        successful: [],
        failed: [],
        alreadyLinked: []
      };

      for (const mediaId of mediaIds) {
        try {
          // Verify media exists and belongs to user
          const media = await MultimediaFile.findOne({
            where: { id: mediaId, user_id: userId },
            raw: true
          });

          if (!media) {
            results.failed.push({
              mediaId,
              error: 'Media not found'
            });
            continue;
          }

          // Check if already linked
          const existingLink = await MultimediaLink.findOne({
            where: { media_id: mediaId, node_id: nodeId, user_id: userId }
          });

          if (existingLink) {
            results.alreadyLinked.push({
              mediaId,
              linkId: existingLink.id
            });
            continue;
          }

          // Create the link
          const link = await MultimediaLink.create({
            user_id: userId,
            media_id: mediaId,
            node_id: nodeId,
            relationship: relationship,
            link_type: 'general'
          });

          results.successful.push({
            mediaId,
            linkId: link.id,
            filename: media.filename
          });

          console.log('✅ [Multimedia] Bulk link created:', { media: mediaId, node: nodeId, relationship });
        } catch (error) {
          results.failed.push({
            mediaId,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: `Bulk linking completed: ${results.successful.length} successful, ${results.failed.length} failed, ${results.alreadyLinked.length} already linked`,
        data: {
          linked: results.successful.length,
          results,
          summary: {
            total: mediaIds.length,
            successful: results.successful.length,
            failed: results.failed.length,
            alreadyLinked: results.alreadyLinked.length
          }
        }
      });
    } catch (error) {
      console.error('Bulk link media to node error:', error);
      res.status(500).json({
        success: false,
        message: 'Bulk linking failed',
        error: error.message
      });
    }
  }

  // Bulk unlink multiple media from a memory node
  async bulkUnlinkMediaFromNode(req, res) {
    try {
      const { nodeId } = req.params;
      const { mediaIds } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'mediaIds must be a non-empty array'
        });
      }

      // Verify memory node exists and belongs to user
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

      const results = {
        successful: [],
        failed: []
      };

      for (const mediaId of mediaIds) {
        try {
          // Remove the link
          const deleted = await MultimediaLink.destroy({
            where: {
              media_id: mediaId,
              node_id: nodeId,
              user_id: userId
            }
          });

          if (deleted > 0) {
            results.successful.push({
              mediaId
            });
            console.log('✅ [Multimedia] Bulk unlink:', { media: mediaId, node: nodeId });
          } else {
            results.failed.push({
              mediaId,
              error: 'Link not found'
            });
          }
        } catch (error) {
          results.failed.push({
            mediaId,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: `Bulk unlinking completed: ${results.successful.length} successful, ${results.failed.length} failed`,
        data: {
          unlinked: results.successful.length,
          results,
          summary: {
            total: mediaIds.length,
            successful: results.successful.length,
            failed: results.failed.length
          }
        }
      });
    } catch (error) {
      console.error('Bulk unlink media from node error:', error);
      res.status(500).json({
        success: false,
        message: 'Bulk unlinking failed',
        error: error.message
      });
    }
  }

  // Management page methods
  async getLinkManagementPage(req, res) {
    try {
      const { view = 'table', filter, sortBy = 'createdAt', order = 'desc', page = 1, limit = 50 } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Build where clause for filters
      const where = { user_id: userId };
      
      if (filter && filter !== 'all' && filter !== 'recent') {
        where.relationship = filter; // primary | associated | reference
      }

      // Get links with media and node data
      const links = await MultimediaLink.findAll({
        where,
        include: [
          {
            model: MultimediaFile,
            as: 'media',
            attributes: ['id', 'filename', 'file_type', 'mime_type', 'file_url', 'metadata', 'created_at', 'updated_at']
          },
          {
            model: MultimediaMemoryNode,
            as: 'node',
            attributes: ['id', 'node_id', 'title', 'description', 'type', 'metadata', 'created_at', 'updated_at']
          }
        ],
        order: [[sortBy === 'mediaType' ? 'created_at' : sortBy, order.toUpperCase()]],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        raw: false
      });

      // Count total for pagination
      const totalLinks = await MultimediaLink.count({ where });

      // Format response
      const enrichedLinks = links.map(link => ({
        linkId: link.id,
        media: link.media ? {
          id: link.media.id,
          filename: link.media.filename,
          originalName: link.media.filename,
          path: link.media.file_url,
          type: link.media.file_type,
          mimeType: link.media.mime_type,
          thumbnail: link.media.file_url,
          metadata: link.media.metadata,
          createdAt: link.media.created_at ? new Date(link.media.created_at).toISOString() : new Date().toISOString(),
          updatedAt: link.media.updated_at ? new Date(link.media.updated_at).toISOString() : new Date().toISOString()
        } : null,
        node: link.node ? {
          id: link.node.id,
          title: link.node.title,
          description: link.node.description,
          type: link.node.type,
          metadata: link.node.metadata,
          createdAt: link.node.created_at ? new Date(link.node.created_at).toISOString() : new Date().toISOString(),
          updatedAt: link.node.updated_at ? new Date(link.node.updated_at).toISOString() : new Date().toISOString()
        } : null,
        relationship: link.relationship,
        createdAt: link.created_at ? new Date(link.created_at).toISOString() : new Date().toISOString(),
        updatedAt: link.updated_at ? new Date(link.updated_at).toISOString() : new Date().toISOString(),
        actions: ['unlink', 'change_relationship', 'view_details']
      }));

      res.json({
        success: true,
        data: {
          links: enrichedLinks,
          filters: {
            relationships: ['primary', 'associated', 'reference'],
            dateRanges: ['today', 'week', 'month', 'year'],
            nodeTypes: ['event', 'person', 'timeline']
          },
          bulkActions: ['unlink', 'change_relationship', 'export_links'],
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalLinks / parseInt(limit)),
            totalItems: totalLinks,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Link management page error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get link management page',
        error: error.message
      });
    }
  }

  // Touch/Mobile methods
  async quickLinkMedia(req, res) {
    try {
      const { mediaId } = req.params;
      const { nodeId, relationship = 'associated' } = req.body;
      
      // Verify media exists
      const media = this.model.getMedia(mediaId);
      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Media not found'
        });
      }
      
      // Verify node exists
      const node = this.model.getMemoryNode(nodeId);
      if (!node) {
        return res.status(404).json({
          success: false,
          message: 'Memory node not found'
        });
      }
      
      // Check if already linked
      const existingLinks = this.model.getMediaLinksForMedia(mediaId);
      const existingLink = existingLinks.find(link => link.node.id === nodeId);
      
      if (existingLink) {
        return res.status(400).json({
          success: false,
          message: 'Media is already linked to this memory node'
        });
      }
      
      // Create link
      const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const link = {
        id: linkId,
        mediaId,
        nodeId,
        relationship,
        createdAt: new Date().toISOString()
      };
      
      const db = this.model.readDatabase();
      db.mediaLinks[linkId] = link;
      this.model.writeDatabase(db);
      
      res.json({
        success: true,
        message: 'Media linked successfully',
        data: { linkId, link }
      });
    } catch (error) {
      console.error('Quick link media error:', error);
      res.status(500).json({
        success: false,
        message: 'Quick linking failed',
        error: error.message
      });
    }
  }

  async quickAddMedia(req, res) {
    try {
      const { nodeId } = req.params;
      const { mediaIds, relationship = 'associated' } = req.body;
      
      if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'mediaIds must be a non-empty array'
        });
      }
      
      // Verify node exists
      const node = this.model.getMemoryNode(nodeId);
      if (!node) {
        return res.status(404).json({
          success: false,
          message: 'Memory node not found'
        });
      }
      
      const results = {
        successful: [],
        failed: [],
        alreadyLinked: []
      };
      
      for (const mediaId of mediaIds) {
        try {
          // Verify media exists
          const media = this.model.getMedia(mediaId);
          if (!media) {
            results.failed.push({
              mediaId,
              error: 'Media not found'
            });
            continue;
          }
          
          // Check if already linked
          const existingLinks = this.model.getMediaLinksForMedia(mediaId);
          const existingLink = existingLinks.find(link => link.node.id === nodeId);
          
          if (existingLink) {
            results.alreadyLinked.push({
              mediaId,
              linkId: existingLink.id
            });
            continue;
          }
          
          // Create link
          const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const link = {
            id: linkId,
            mediaId,
            nodeId,
            relationship,
            createdAt: new Date().toISOString()
          };
          
          const db = this.model.readDatabase();
          db.mediaLinks[linkId] = link;
          this.model.writeDatabase(db);
          
          results.successful.push({
            mediaId,
            linkId
          });
        } catch (error) {
          results.failed.push({
            mediaId,
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        message: `Quick add completed: ${results.successful.length} successful, ${results.failed.length} failed, ${results.alreadyLinked.length} already linked`,
        data: {
          added: results.successful.length,
          node,
          results,
          summary: {
            total: mediaIds.length,
            successful: results.successful.length,
            failed: results.failed.length,
            alreadyLinked: results.alreadyLinked.length
          }
        }
      });
    } catch (error) {
      console.error('Quick add media error:', error);
      res.status(500).json({
        success: false,
        message: 'Quick add failed',
        error: error.message
      });
    }
  }

  // Get connection status for media and node
  async getConnectionStatus(req, res) {
    try {
      const { mediaId, nodeId } = req.params;

      // Verify media exists
      const media = this.model.getMedia(mediaId);
      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Media not found'
        });
      }

      // Verify memory node exists
      const node = this.model.getMemoryNode(nodeId);
      if (!node) {
        return res.status(404).json({
          success: false,
          message: 'Memory node not found'
        });
      }

      // Check if they are linked
      const existingLinks = this.model.getMediaLinksForMedia(mediaId);
      const existingLink = existingLinks.find(link => link.node.id === nodeId);

      // Get all connections for this media
      const allMediaLinks = this.model.getMediaLinksForMedia(mediaId);
      const allNodeLinks = this.model.getMediaLinksForNode(nodeId);

      res.json({
        success: true,
        data: {
          isLinked: !!existingLink,
          connectionInfo: existingLink ? {
            linkId: existingLink.linkId,
            relationship: existingLink.relationship,
            linkedAt: existingLink.createdAt
          } : null,
          mediaConnections: {
            total: allMediaLinks.length,
            nodes: allMediaLinks.map(link => ({
              nodeId: link.node.id,
              nodeTitle: link.node.title,
              relationship: link.relationship,
              linkedAt: link.createdAt
            }))
          },
          nodeConnections: {
            total: allNodeLinks.length,
            media: allNodeLinks.map(link => ({
              mediaId: link.media.id,
              mediaName: link.media.originalName,
              relationship: link.relationship,
              linkedAt: link.createdAt
            }))
          },
          messages: {
            mediaStatus: allMediaLinks.length === 0 
              ? 'This media is not connected to any memory nodes'
              : `This media is connected to ${allMediaLinks.length} memory node${allMediaLinks.length > 1 ? 's' : ''}`,
            nodeStatus: allNodeLinks.length === 0
              ? 'This memory node has no connected media'
              : `This memory node has ${allNodeLinks.length} connected media file${allNodeLinks.length > 1 ? 's' : ''}`,
            connectionStatus: existingLink 
              ? `This media is already connected to "${node.title}" as ${existingLink.relationship}`
              : `This media is not connected to "${node.title}"`
          }
        }
      });
    } catch (error) {
      console.error('Get connection status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get connection status',
        error: error.message
      });
    }
  }

  // Check if media is available for linking (not linked to any node)
  async checkMediaAvailability(req, res) {
    try {
      const { mediaId } = req.params;

      // Verify media exists
      const media = this.model.getMedia(mediaId);
      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Media not found'
        });
      }

      // Get all connections for this media
      const allMediaLinks = this.model.getMediaLinksForMedia(mediaId);

      res.json({
        success: true,
        data: {
          mediaId,
          isAvailable: allMediaLinks.length === 0,
          linkedTo: allMediaLinks.length,
          connections: allMediaLinks.map(link => ({
            nodeId: link.node.id,
            nodeTitle: link.node.title,
            relationship: link.relationship,
            linkedAt: link.createdAt
          })),
          message: allMediaLinks.length === 0 
            ? 'This media is available for linking to any memory node'
            : `This media is already linked to ${allMediaLinks.length} memory node${allMediaLinks.length > 1 ? 's' : ''} and is not available for linking`
        }
      });
    } catch (error) {
      console.error('Check media availability error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check media availability',
        error: error.message
      });
    }
  }
}

module.exports = new LinkingController();
