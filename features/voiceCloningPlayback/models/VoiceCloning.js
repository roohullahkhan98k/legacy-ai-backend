const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../common/database');

// User's custom voice clones
const UserVoice = sequelize.define('user_voices', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'User who owns this voice'
  },
  voice_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'ElevenLabs voice ID'
  },
  voice_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Name of the voice'
  },
  sample_file_path: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Path to original sample audio file'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Voice settings, quality, etc.'
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['voice_id'] }
  ]
});

// Generated audio history
const GeneratedAudio = sequelize.define('generated_audio', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'User who generated this audio'
  },
  voice_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Voice used (ElevenLabs ID or default)'
  },
  voice_name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Name of voice used'
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Text that was converted to speech'
  },
  audio_file_path: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Path to generated audio file'
  },
  duration_seconds: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Audio duration in seconds'
  },
  file_size_bytes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'File size in bytes'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Generation settings, model, etc.'
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['voice_id'] },
    { fields: ['created_at'] }
  ]
});

module.exports = {
  UserVoice,
  GeneratedAudio
};

