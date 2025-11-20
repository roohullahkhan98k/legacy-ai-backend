const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

class MultimediaModel {
  constructor() {
    this.dbPath = path.join(__dirname, 'db.json');
    this.ensureDatabase();
  }

  ensureDatabase() {
    if (!fs.existsSync(this.dbPath)) {
      const initialData = {
        media: {},
        memoryNodes: {},
        mediaLinks: {}
      };
      fs.writeFileSync(this.dbPath, JSON.stringify(initialData, null, 2));
    }
  }

  readDatabase() {
    try {
      const data = fs.readFileSync(this.dbPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading database:', error);
      return { media: {}, memoryNodes: {}, mediaLinks: {} };
    }
  }

  writeDatabase(data) {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Error writing database:', error);
      return false;
    }
  }

  // Media operations
  saveMedia(mediaId, mediaData) {
    const db = this.readDatabase();
    db.media[mediaId] = {
      ...mediaData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return this.writeDatabase(db);
  }

  getMedia(mediaId) {
    const db = this.readDatabase();
    return db.media[mediaId] || null;
  }

  getAllMedia() {
    const db = this.readDatabase();
    return db.media;
  }

  updateMedia(mediaId, updateData) {
    const db = this.readDatabase();
    if (db.media[mediaId]) {
      db.media[mediaId] = {
        ...db.media[mediaId],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      return this.writeDatabase(db);
    }
    return false;
  }

  deleteMedia(mediaId) {
    const db = this.readDatabase();
    if (db.media[mediaId]) {
      delete db.media[mediaId];
      // Also remove any links associated with this media
      Object.keys(db.mediaLinks).forEach(linkId => {
        if (db.mediaLinks[linkId].mediaId === mediaId) {
          delete db.mediaLinks[linkId];
        }
      });
      return this.writeDatabase(db);
    }
    return false;
  }

  // Memory Node operations
  createMemoryNode(nodeId, nodeData) {
    const db = this.readDatabase();
    db.memoryNodes[nodeId] = {
      ...nodeData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return this.writeDatabase(db);
  }

  getMemoryNode(nodeId) {
    const db = this.readDatabase();
    return db.memoryNodes[nodeId] || null;
  }

  getAllMemoryNodes() {
    const db = this.readDatabase();
    return db.memoryNodes;
  }

  updateMemoryNode(nodeId, updateData) {
    const db = this.readDatabase();
    if (db.memoryNodes[nodeId]) {
      db.memoryNodes[nodeId] = {
        ...db.memoryNodes[nodeId],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      return this.writeDatabase(db);
    }
    return false;
  }

  deleteMemoryNode(nodeId) {
    const db = this.readDatabase();
    if (db.memoryNodes[nodeId]) {
      delete db.memoryNodes[nodeId];
      // Also remove any links associated with this node
      Object.keys(db.mediaLinks).forEach(linkId => {
        if (db.mediaLinks[linkId].nodeId === nodeId) {
          delete db.mediaLinks[linkId];
        }
      });
      return this.writeDatabase(db);
    }
    return false;
  }

  // Media linking operations
  linkMediaToNode(mediaId, nodeId, relationship = 'associated') {
    const linkId = `link_${Date.now()}_${randomUUID()}`;
    const db = this.readDatabase();
    
    if (db.media[mediaId] && db.memoryNodes[nodeId]) {
      db.mediaLinks[linkId] = {
        mediaId,
        nodeId,
        relationship,
        createdAt: new Date().toISOString()
      };
      return this.writeDatabase(db) ? linkId : null;
    }
    return null;
  }

  unlinkMediaFromNode(mediaId, nodeId) {
    const db = this.readDatabase();
    let removed = false;
    
    Object.keys(db.mediaLinks).forEach(linkId => {
      if (db.mediaLinks[linkId].mediaId === mediaId && db.mediaLinks[linkId].nodeId === nodeId) {
        delete db.mediaLinks[linkId];
        removed = true;
      }
    });
    
    return removed ? this.writeDatabase(db) : false;
  }

  getMediaLinksForNode(nodeId) {
    const db = this.readDatabase();
    const links = [];
    
    Object.keys(db.mediaLinks).forEach(linkId => {
      if (db.mediaLinks[linkId].nodeId === nodeId) {
        const link = db.mediaLinks[linkId];
        const media = db.media[link.mediaId];
        
        // Only include links where the media still exists
        if (media) {
          links.push({
            linkId,
            media: media,
            relationship: link.relationship,
            createdAt: link.createdAt
          });
        }
      }
    });
    
    return links;
  }

  getMediaLinksForMedia(mediaId) {
    const db = this.readDatabase();
    const links = [];
    
    Object.keys(db.mediaLinks).forEach(linkId => {
      if (db.mediaLinks[linkId].mediaId === mediaId) {
        const link = db.mediaLinks[linkId];
        const node = db.memoryNodes[link.nodeId];
        
        // Only include links where the node still exists
        if (node) {
          links.push({
            linkId,
            node: node,
            relationship: link.relationship,
            createdAt: link.createdAt
          });
        }
      }
    });
    
    return links;
  }

  // Search and filter operations
  searchMediaByMetadata(criteria) {
    const db = this.readDatabase();
    const results = [];
    
    Object.keys(db.media).forEach(mediaId => {
      const media = db.media[mediaId];
      let matches = true;
      
      if (criteria.dateFrom && new Date(media.metadata.dateTaken) < new Date(criteria.dateFrom)) {
        matches = false;
      }
      if (criteria.dateTo && new Date(media.metadata.dateTaken) > new Date(criteria.dateTo)) {
        matches = false;
      }
      if (criteria.device && !media.metadata.device?.toLowerCase().includes(criteria.device.toLowerCase())) {
        matches = false;
      }
      if (criteria.type && media.type !== criteria.type) {
        matches = false;
      }
      if (criteria.location && (!media.metadata.location || !media.metadata.location.toLowerCase().includes(criteria.location.toLowerCase()))) {
        matches = false;
      }
      
      if (matches) {
        results.push(media);
      }
    });
    
    return results;
  }

  // Additional methods for new APIs
  createMediaLink(mediaId, nodeId, relationship = 'associated') {
    try {
      const db = this.readDatabase();
      
      // Check if link already exists
      const existingLinks = Object.values(db.mediaLinks);
      const existingLink = existingLinks.find(link => 
        link.mediaId === mediaId && link.nodeId === nodeId
      );
      
      if (existingLink) {
        return false; // Link already exists
      }
      
      // Create new link
      const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const link = {
        id: linkId,
        mediaId,
        nodeId,
        relationship,
        createdAt: new Date().toISOString()
      };
      
      db.mediaLinks[linkId] = link;
      return this.writeDatabase(db) ? link : false;
    } catch (error) {
      console.error('Create media link error:', error);
      return false;
    }
  }

  deleteMediaLink(mediaId, nodeId) {
    try {
      const db = this.readDatabase();
      
      // Find and delete the link
      const linkEntries = Object.entries(db.mediaLinks);
      const linkToDelete = linkEntries.find(([_, link]) => 
        link.mediaId === mediaId && link.nodeId === nodeId
      );
      
      if (linkToDelete) {
        delete db.mediaLinks[linkToDelete[0]];
        return this.writeDatabase(db);
      }
      
      return false; // Link not found
    } catch (error) {
      console.error('Delete media link error:', error);
      return false;
    }
  }

  updateMedia(mediaId, updates) {
    try {
      const db = this.readDatabase();
      
      if (!db.media[mediaId]) {
        return false;
      }
      
      // Update media with new data
      db.media[mediaId] = {
        ...db.media[mediaId],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      return this.writeDatabase(db);
    } catch (error) {
      console.error('Update media error:', error);
      return false;
    }
  }

  deleteMedia(mediaId) {
    try {
      const db = this.readDatabase();
      
      if (!db.media[mediaId]) {
        return false;
      }
      
      // Delete media
      delete db.media[mediaId];
      
      // Delete associated links
      const linkEntries = Object.entries(db.mediaLinks);
      linkEntries.forEach(([linkId, link]) => {
        if (link.mediaId === mediaId) {
          delete db.mediaLinks[linkId];
        }
      });
      
      return this.writeDatabase(db);
    } catch (error) {
      console.error('Delete media error:', error);
      return false;
    }
  }
}

module.exports = MultimediaModel;
