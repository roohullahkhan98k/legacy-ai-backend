const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../common/database');

// Multimedia files (images, videos, audio)
const MultimediaFile = sequelize.define('multimedia_files', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'User who uploaded this file'
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Original filename'
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Path to file on disk'
  },
  file_url: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Public URL for file'
  },
  file_type: {
    type: DataTypes.ENUM('image', 'video', 'audio', 'document', 'other'),
    allowNull: false,
    comment: 'Type of media file'
  },
  mime_type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'MIME type (e.g., image/jpeg, video/mp4)'
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'File size in bytes'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Extracted metadata (EXIF, dimensions, duration, etc.)'
  },
  thumbnail_path: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Path to thumbnail (for videos/images)'
  },
  thumbnail_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Public URL for thumbnail'
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['file_type'] },
    { fields: ['created_at'] },
    { fields: ['mime_type'] }
  ]
});

// Memory nodes linked to multimedia
const MultimediaMemoryNode = sequelize.define('multimedia_memory_nodes', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'User who owns this memory node'
  },
  node_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Memory node identifier'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Node title/label'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Node description'
  },
  type: {
    type: DataTypes.ENUM('event', 'person', 'timeline'),
    allowNull: false,
    defaultValue: 'event',
    comment: 'Type of memory node'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional node metadata'
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['node_id'] },
    { fields: ['created_at'] }
  ]
});

// Links between multimedia files and memory nodes
const MultimediaLink = sequelize.define('multimedia_links', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'User who created this link'
  },
  media_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'multimedia_files',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Multimedia file ID'
  },
  node_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'multimedia_memory_nodes',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Memory node ID'
  },
  relationship: {
    type: DataTypes.ENUM('primary', 'associated', 'reference'),
    defaultValue: 'associated',
    comment: 'Relationship type between media and node'
  },
  link_type: {
    type: DataTypes.STRING,
    defaultValue: 'general',
    comment: 'Type of link (e.g., general, thumbnail, attachment)'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional link metadata'
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['media_id'] },
    { fields: ['node_id'] },
    { fields: ['created_at'] }
  ]
});

// Define associations
MultimediaFile.hasMany(MultimediaLink, {
  foreignKey: 'media_id',
  as: 'links',
  onDelete: 'CASCADE'
});

MultimediaMemoryNode.hasMany(MultimediaLink, {
  foreignKey: 'node_id',
  as: 'links',
  onDelete: 'CASCADE'
});

MultimediaLink.belongsTo(MultimediaFile, {
  foreignKey: 'media_id',
  as: 'media'
});

MultimediaLink.belongsTo(MultimediaMemoryNode, {
  foreignKey: 'node_id',
  as: 'node'
});

module.exports = { MultimediaFile, MultimediaMemoryNode, MultimediaLink };

