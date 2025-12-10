/**
 * Migration: Add accent and is_local_only columns to voice cloning tables
 * 
 * Run this with: node migrations/add-voice-cloning-accent-columns.js
 */

const { sequelize } = require('../common/database');

async function runMigration() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('📊 Starting voice cloning accent migration...');
    
    // 1. Add accent column to user_voices table
    console.log('1️⃣ Adding accent column to user_voices...');
    await sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'user_voices' 
          AND column_name = 'accent'
        ) THEN
          ALTER TABLE user_voices 
          ADD COLUMN accent VARCHAR(10);
        END IF;
      END $$;
    `, { transaction });
    console.log('✅ accent column added to user_voices');
    
    // 2. Add is_local_only column to user_voices table
    console.log('2️⃣ Adding is_local_only column to user_voices...');
    await sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'user_voices' 
          AND column_name = 'is_local_only'
        ) THEN
          ALTER TABLE user_voices 
          ADD COLUMN is_local_only BOOLEAN DEFAULT true;
        END IF;
      END $$;
    `, { transaction });
    console.log('✅ is_local_only column added to user_voices');
    
    // 3. Add accent column to generated_audio table
    console.log('3️⃣ Adding accent column to generated_audio...');
    await sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'generated_audio' 
          AND column_name = 'accent'
        ) THEN
          ALTER TABLE generated_audio 
          ADD COLUMN accent VARCHAR(10);
        END IF;
      END $$;
    `, { transaction });
    console.log('✅ accent column added to generated_audio');
    
    // 4. Update existing records to have default values
    console.log('4️⃣ Updating existing records...');
    await sequelize.query(`
      UPDATE user_voices 
      SET is_local_only = false 
      WHERE is_local_only IS NULL;
    `, { transaction });
    console.log('✅ Existing records updated');
    
    await transaction.commit();
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   - Voice cloning will now save accent information');
    console.log('   - All new clones will be marked as local_only = true');
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Migration script failed:', err);
      process.exit(1);
    });
}

module.exports = { runMigration };

