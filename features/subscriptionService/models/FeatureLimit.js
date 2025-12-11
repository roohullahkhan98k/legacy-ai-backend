const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../common/database');

// Feature limits per subscription plan
const FeatureLimit = sequelize.define('feature_limits', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  plan_type: {
    type: DataTypes.ENUM('personal', 'premium', 'ultimate'),
    allowNull: false,
    comment: 'Subscription plan type'
  },
  feature_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Feature name (voice_clones, avatar_generations, memory_graph_operations, interview_sessions, multimedia_uploads)'
  },
  limit_value: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Limit value (-1 for unlimited)'
  },
  limit_type: {
    type: DataTypes.ENUM('monthly', 'total'),
    defaultValue: 'monthly',
    comment: 'Whether limit resets monthly or is total'
  },
  reset_period: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Number of months for reset period (1 = monthly)'
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['plan_type', 'feature_name'] },
    { fields: ['plan_type'] },
    { fields: ['feature_name'] }
  ]
});

module.exports = FeatureLimit;

