const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../common/database');

// User's avatar models
const UserAvatar = sequelize.define('user_avatars', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'User who owns this avatar'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Avatar name'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Avatar description'
  },
  model_path: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Path to 3D model file (.glb/.gltf/.fbx)'
  },
  model_url: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Public URL for 3D model'
  },
  thumbnail_path: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Path to thumbnail image'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional metadata (original filename, etc.)'
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['created_at'] }
  ]
});

// Avatar animations/lipsync data
const AvatarAnimation = sequelize.define('avatar_animations', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  avatar_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'user_avatars',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Avatar this animation belongs to'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'User who owns this animation'
  },
  audio_path: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Path to audio file'
  },
  audio_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Public URL for audio'
  },
  lipsync_path: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Path to lipsync JSON file'
  },
  lipsync_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Public URL for lipsync data'
  },
  lipsync_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Lipsync animation data'
  },
  duration_seconds: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Animation duration in seconds'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'completed',
    comment: 'Animation generation status'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional metadata'
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['avatar_id'] },
    { fields: ['user_id'] },
    { fields: ['created_at'] },
    { fields: ['status'] }
  ]
});

// Define associations
UserAvatar.hasMany(AvatarAnimation, {
  foreignKey: 'avatar_id',
  as: 'animations',
  onDelete: 'CASCADE'
});

AvatarAnimation.belongsTo(UserAvatar, {
  foreignKey: 'avatar_id',
  as: 'avatar'
});

module.exports = { UserAvatar, AvatarAnimation };

