const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'users');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp + random string + original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `profile-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  console.log('🔍 File filter checking:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    fieldname: file.fieldname
  });
  
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  console.log('🔍 Filter results:', { extname, mimetype, allowed: extname && mimetype });

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    console.log('❌ File rejected by filter');
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WebP) are allowed for profile pictures'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Middleware for single profile picture upload
const uploadProfilePicture = upload.single('profilePicture');

// Middleware wrapper with error handling
const handleProfilePictureUpload = (req, res, next) => {
  console.log('📤 Upload middleware called');
  
  uploadProfilePicture(req, res, (err) => {
    // Log after multer processes the request
    console.log('📋 Request body keys:', req.body ? Object.keys(req.body) : 'Body not available');
    console.log('📁 Request file:', req.file ? 'File received' : 'No file');
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Profile picture file size too large. Maximum size is 5MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + err.message
      });
    } else if (err) {
      console.log('❌ Upload error:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    console.log('✅ Upload middleware completed successfully');
    next();
  });
};

// Helper function to get profile picture URL
const getProfilePictureUrl = (filename) => {
  if (!filename) return null;
  return `/uploads/users/${filename}`;
};

// Helper function to delete profile picture file
const deleteProfilePictureFile = (filename) => {
  if (!filename) return;
  
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

module.exports = {
  handleProfilePictureUpload,
  getProfilePictureUrl,
  deleteProfilePictureFile,
  uploadsDir
};
