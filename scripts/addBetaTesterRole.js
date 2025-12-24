const { sequelize } = require('../common/database');

async function addBetaTesterRole() {
  console.log('🚀 Starting migration: Adding beta_tester role...');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Execute raw SQL to add value to ENUM
    // Note: This command cannot run inside a transaction block in Postgres 
    // for ALTER TYPE ... ADD VALUE
    await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'beta_tester';`);
    
    console.log("✅ Successfully added 'beta_tester' to role enum");
    process.exit(0);
  } catch (error) {
    if (error.original && error.original.code === '42710') {
      // Postgres error code for duplicate object
      console.log("⚠️  'beta_tester' value likely already exists in enum. Continuing...");
      process.exit(0);
    } else {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }
}

addBetaTesterRole();
