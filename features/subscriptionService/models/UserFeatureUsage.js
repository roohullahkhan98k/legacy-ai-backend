const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../common/database');

// User feature usage tracking
const UserFeatureUsage = sequelize.define('user_feature_usage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'User who used the feature'
  },
  feature_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Feature name (voice_clones, avatar_generations, etc.)'
  },
  usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Current usage count for the period'
  },
  period_start: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Start of the usage period (first day of month)'
  },
  period_end: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'End of the usage period (last day of month)'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional metadata about usage'
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['user_id', 'feature_name', 'period_start'] },
    { fields: ['user_id'] },
    { fields: ['feature_name'] },
    { fields: ['period_start'] },
    { fields: ['period_end'] }
  ]
});

module.exports = UserFeatureUsage;

