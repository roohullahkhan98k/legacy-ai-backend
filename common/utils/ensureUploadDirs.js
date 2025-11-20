const fs = require('fs');
const path = require('path');

/**
 * Ensures all required upload directories exist on server startup
 * This prevents errors when files are uploaded to non-existent directories
 */
function ensureUploadDirectories() {
  const baseUploadsDir = path.resolve(process.cwd(), 'uploads');
  
  // Define all required directories and subdirectories
  const directories = [
    // Base uploads directory
    baseUploadsDir,
    
    // Avatar service directories
    path.join(baseUploadsDir, 'avatars'),
    path.join(baseUploadsDir, 'avatars', 'models'),
    path.join(baseUploadsDir, 'avatars', 'lipsync'),
    path.join(baseUploadsDir, 'avatars', 'images'),
    path.join(baseUploadsDir, 'avatars', 'audio'),
    
    // Memory graph service directory
    path.join(baseUploadsDir, 'graphservice-media'),
    
    // Multimedia service directories
    path.join(baseUploadsDir, 'multimedia'),
    path.join(baseUploadsDir, 'multimedia', 'images'),
    path.join(baseUploadsDir, 'multimedia', 'videos'),
    
    // User profile pictures directory
    path.join(baseUploadsDir, 'users'),
    
    // Voice cloning service directory
    path.join(baseUploadsDir, 'voice-samples'),
  ];

  console.log('📁 Ensuring upload directories exist...');
  let createdCount = 0;
  let existingCount = 0;

  directories.forEach((dir) => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
        createdCount++;
      } else {
        existingCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to create directory ${dir}:`, error.message);
    }
  });

  console.log(`📁 Directory check complete: ${createdCount} created, ${existingCount} already existed`);
  return { created: createdCount, existing: existingCount };
}

module.exports = { ensureUploadDirectories };

