const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../common/database');

// User subscriptions
const Subscription = sequelize.define('subscriptions', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'User who owns this subscription'
  },
  stripe_customer_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe customer ID'
  },
  stripe_subscription_id: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'Stripe subscription ID'
  },
  plan_type: {
    type: DataTypes.ENUM('personal', 'premium', 'ultimate'),
    allowNull: false,
    defaultValue: 'personal',
    comment: 'Subscription plan type'
  },
  status: {
    type: DataTypes.ENUM('active', 'canceled', 'past_due', 'unpaid', 'trialing'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Subscription status'
  },
  current_period_start: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Current billing period start'
  },
  current_period_end: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Current billing period end'
  },
  cancel_at_period_end: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether subscription will cancel at period end'
  },
  canceled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When subscription was canceled'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional subscription metadata from Stripe'
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['stripe_customer_id'] },
    { fields: ['stripe_subscription_id'] },
    { fields: ['plan_type'] },
    { fields: ['status'] }
  ]
});

module.exports = Subscription;

