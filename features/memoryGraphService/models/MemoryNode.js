const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../common/database');

const MemoryNode = sequelize.define('memory_nodes', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    comment: 'Memory ID (same as ChromaDB)'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'User who owns this memory (optional for anonymous)'
  },
  document: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Memory content/text'
  },
  person: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Person associated with memory'
  },
  event: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Event associated with memory'
  },
  tags: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of tag strings'
  },
  media: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of media file paths'
  },
  chroma_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ChromaDB document ID'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional metadata'
  },
  // Milestone 6: Multilingual support (35% implementation)
  original_language: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Detected language code (e.g., en, ar, hi) - auto-detected on creation'
  },
  // Milestone 6: Next 35% - Translation storage
  translated_texts: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Translations of memory text: { "en": "English text", "ar": "Arabic text" }'
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['person'] },
    { fields: ['event'] },
    { fields: ['chroma_id'] },
    { fields: ['created_at'] },
    { fields: ['tags'], using: 'gin' },
    // Milestone 6: Index for language filtering
    { fields: ['original_language'] },
    // Milestone 6: GIN index on translated_texts for fast translation lookups
    { fields: ['translated_texts'], using: 'gin' }
  ]
});

module.exports = MemoryNode;

