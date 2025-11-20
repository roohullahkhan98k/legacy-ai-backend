const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../common/database');

const Interview = sequelize.define('interviews', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  session_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'WebSocket session ID'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'User ID (optional)'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Interview title - auto-generated if not provided'
  },
  status: {
    type: DataTypes.ENUM('active', 'completed'),
    defaultValue: 'active'
  },
  qa_pairs: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of {question, answer, timestamp} objects'
  },
  total_qa: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total number of Q&A pairs'
  },
  started_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  ended_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['session_id'] },
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

module.exports = Interview;

