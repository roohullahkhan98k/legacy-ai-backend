const { Sequelize } = require('sequelize');

// Database configuration for AI Prototype Application
const config = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ai_prototype',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME_TEST || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    }
  }
};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env] || config.development;

// Create Sequelize instance for AI Prototype
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
);

// Create database if it doesn't exist
const createDatabaseIfNotExists = async () => {
  const { Client } = require('pg');
  
  // Connect to PostgreSQL server (not to a specific database)
  const client = new Client({
    user: dbConfig.username,
    password: dbConfig.password,
    host: dbConfig.host,
    port: dbConfig.port,
    database: 'postgres' // Connect to default 'postgres' database
  });

  try {
    await client.connect();
    
    // Check if database exists
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbConfig.database]
    );
    
    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      await client.query(`CREATE DATABASE "${dbConfig.database}"`);
      console.log(`✅ Created database: ${dbConfig.database}`);
    } else {
      console.log(`✅ Database already exists: ${dbConfig.database}`);
    }
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    throw error;
  } finally {
    await client.end();
  }
};

// Test database connection
const testConnection = async () => {
  try {
    // First ensure database exists
    await createDatabaseIfNotExists();
    
    // Then test connection to the specific database
    await sequelize.authenticate();
    console.log('✅ AI Prototype PostgreSQL database connection established successfully');
  } catch (error) {
    console.error('❌ Unable to connect to AI Prototype PostgreSQL database:', error.message);
    process.exit(1);
  }
};

// Initialize database (sync models)
const initializeDatabase = async () => {
  try {
    // Import models to ensure they're registered
    require('../common/models/User'); // Import User model to sync stripe_customer_id column
    require('../features/aiInterviewEngine/models/Interview');
    require('../features/memoryGraphService/models/MemoryNode');
    require('../features/voiceCloningPlayback/models/VoiceCloning');
    require('../features/avatarService/models/Avatar');
    require('../features/multimediaUpload/models/Multimedia');
    require('../features/subscriptionService/models/Subscription');
    require('../features/subscriptionService/models/FeatureLimit');
    require('../features/subscriptionService/models/UserFeatureUsage');
    
    // Sync each model individually to handle errors gracefully
    const models = sequelize.models;
    let successCount = 0;
    let errorCount = 0;
    
    for (const [modelName, model] of Object.entries(models)) {
      try {
        await model.sync({ alter: true });
        successCount++;
        console.log(`✅ Synced model: ${modelName}`);
      } catch (error) {
        errorCount++;
        console.warn(`⚠️  Failed to sync ${modelName}:`, error.message);
        // Continue with other models
      }
    }
    
    console.log(`✅ Database sync completed: ${successCount} successful, ${errorCount} errors`);
    
    if (errorCount > 0) {
      console.log('⚠️  Some models failed to sync. This is usually okay for existing tables with ENUMs.');
    }
    
    // Initialize default feature limits
    try {
      const featureLimitService = require('../features/subscriptionService/services/FeatureLimitService');
      await featureLimitService.initializeDefaultLimits();
    } catch (error) {
      console.warn('⚠️  Failed to initialize default feature limits:', error.message);
    }
  } catch (error) {
    console.error('❌ AI Prototype database synchronization failed:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  initializeDatabase,
  createDatabaseIfNotExists,
  config
};
