const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { randomUUID } = require('crypto');

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const modelsDir = path.resolve(process.cwd(), 'uploads', 'avatars', 'models');
const lipsyncDir = path.resolve(process.cwd(), 'uploads', 'avatars', 'lipsync');
const imagesDir = path.resolve(process.cwd(), 'uploads', 'avatars', 'images');
const audioDir = path.resolve(process.cwd(), 'uploads', 'avatars', 'audio');
ensureDirectoryExists(modelsDir);
ensureDirectoryExists(lipsyncDir);
ensureDirectoryExists(imagesDir);
ensureDirectoryExists(audioDir);

const allowedModelExtensions = new Set(['.glb', '.gltf', '.fbx']);

const modelStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, modelsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const id = randomUUID();
    cb(null, `${id}${ext}`);
  }
});

function modelFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedModelExtensions.has(ext)) {
    return cb(new Error('Only .glb, .gltf, or .fbx model files are allowed'));
  }
  cb(null, true);
}

const uploadModel = multer({ storage: modelStorage, fileFilter: modelFileFilter });

// For lipsync.json, accept as raw file or JSON body; when using file upload, save to disk here
const lipsyncStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, lipsyncDir);
  },
  filename: function (req, file, cb) {
    const id = randomUUID();
    cb(null, `${id}.json`);
  }
});

function lipsyncFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.json' && file.mimetype !== 'application/json') {
    return cb(new Error('Only lipsync JSON files are allowed'));
  }
  cb(null, true);
}

const uploadLipsync = multer({ storage: lipsyncStorage, fileFilter: lipsyncFileFilter });

// Image uploads for pipeline (accept common image formats)
const allowedImageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
function imageFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedImageExtensions.has(ext)) {
    return cb(new Error('Only image files (.png, .jpg, .jpeg, .webp) are allowed'));
  }
  cb(null, true);
}
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, imagesDir); },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const id = randomUUID();
    cb(null, `${id}${ext}`);
  }
});
const uploadImage = multer({ storage: imageStorage, fileFilter: imageFileFilter });

// Audio uploads for pipeline (accept common audio formats)
const allowedAudioExtensions = new Set(['.wav', '.mp3', '.m4a', '.ogg']);
function audioFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedAudioExtensions.has(ext)) {
    return cb(new Error('Only audio files (.wav, .mp3, .m4a, .ogg) are allowed'));
  }
  cb(null, true);
}
const audioStorage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, audioDir); },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const id = randomUUID();
    cb(null, `${id}${ext}`);
  }
});
const uploadAudio = multer({ storage: audioStorage, fileFilter: audioFileFilter });

module.exports = {
  uploadModel,
  uploadLipsync,
  uploadImage,
  uploadAudio,
  paths: { modelsDir, lipsyncDir, imagesDir, audioDir },
  ensureDirectoryExists
};


