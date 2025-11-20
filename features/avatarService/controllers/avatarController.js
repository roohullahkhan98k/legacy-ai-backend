const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { uploadModel, uploadLipsync, paths } = require('../middleware/upload');
const AvatarService = require('../avatarService');
const { UserAvatar, AvatarAnimation } = require('../models/Avatar');

const service = new AvatarService();

function handleAsync(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

// POST /api/avatar/model (multipart/form-data, field: model)
const uploadModelMiddleware = uploadModel.single('model');
const createAvatar = handleAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'model file is required (.glb/.gltf/.fbx)' });
  }
  
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const name = req.body?.name || path.parse(req.file.originalname).name;
  const description = req.body?.description || '';
  
  // Build file paths (same as old service)
  const avatarId = randomUUID();
  const modelPath = req.file.path;
  const modelUrl = service.buildPublicUrl(modelPath);
  
  // Save to PostgreSQL ONLY (no more db.json!)
  const dbAvatar = await UserAvatar.create({
    id: avatarId,
    user_id: userId,
    name: name,
    description: description || '',
    model_path: modelPath,
    model_url: modelUrl,
    metadata: {
      original_filename: req.file.originalname,
      mime_type: req.file.mimetype,
      size: req.file.size
    }
  });
  
  console.log('✅ Avatar saved to PostgreSQL - user:', userId, 'avatar:', dbAvatar.id, 'name:', dbAvatar.name);
  
  // Format response
  const avatar = {
    id: dbAvatar.id,
    user_id: userId,
    name: dbAvatar.name,
    description: dbAvatar.description,
    model: {
      path: modelPath,
      url: modelUrl
    },
    lipsync: [],
    audio: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  return res.status(201).json({ ok: true, avatar });
});

// GET /api/avatar - List user's avatars
const listAvatars = handleAsync(async (req, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.json({ ok: true, avatars: [] });
  }

  // Get avatars from PostgreSQL ONLY
  const dbAvatars = await UserAvatar.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    raw: true
  });
  
  console.log('[Avatar] Found', dbAvatars.length, 'avatars in PostgreSQL for user:', userId);
  
  // Format for frontend
  const formatted = dbAvatars.map(a => ({
    id: a.id,
    user_id: a.user_id,
    name: a.name,
    description: a.description,
    model: {
      path: a.model_path,
      url: a.model_url
    },
    lipsync: [], // Will be loaded separately if needed
    audio: null,
    createdAt: a.createdAt || a.created_at,
    updatedAt: a.updatedAt || a.updated_at
  }));
  
  return res.json({ ok: true, avatars: formatted });
});

// GET /api/avatar/:id
const getAvatar = handleAsync(async (req, res) => {
  const userId = req.user?.id;
  const avatarId = req.params.id;
  
  const avatar = await UserAvatar.findOne({
    where: { id: avatarId },
    include: [{
      model: AvatarAnimation,
      as: 'animations',
      required: false
    }],
    raw: false
  });
  
  if (!avatar) {
    return res.status(404).json({ error: 'Avatar not found' });
  }
  
  // Check ownership
  if (userId && avatar.user_id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Format for frontend
  const formatted = {
    id: avatar.id,
    user_id: avatar.user_id,
    name: avatar.name,
    description: avatar.description,
    model: {
      path: avatar.model_path,
      url: avatar.model_url
    },
    lipsync: (avatar.animations || []).map(anim => ({
      id: anim.id,
      path: anim.lipsync_path,
      url: anim.lipsync_url,
      createdAt: anim.createdAt || anim.created_at
    })),
    audio: avatar.animations && avatar.animations.length > 0 && avatar.animations[0].audio_url 
      ? { url: avatar.animations[0].audio_url } 
      : null,
    createdAt: avatar.createdAt || avatar.created_at,
    updatedAt: avatar.updatedAt || avatar.updated_at
  };
  
  return res.json({ ok: true, avatar: formatted });
});

// DELETE /api/avatar/:id
const deleteAvatar = handleAsync(async (req, res) => {
  const userId = req.user?.id;
  const avatarId = req.params.id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const avatar = await UserAvatar.findOne({ where: { id: avatarId } });
  
  if (!avatar) {
    return res.status(404).json({ error: 'Avatar not found' });
  }
  
  // Check ownership
  if (avatar.user_id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Delete from PostgreSQL (cascade will delete animations)
  await avatar.destroy();
  
  console.log('✅ Avatar deleted from PostgreSQL - user:', userId, 'avatar:', avatarId);
  
  return res.json({ ok: true, removed: true });
});

// POST /api/avatar/:id/metadata { name?, description? }
const updateMetadata = handleAsync(async (req, res) => {
  const userId = req.user?.id;
  const avatarId = req.params.id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const avatar = await UserAvatar.findOne({ where: { id: avatarId } });
  
  if (!avatar) {
    return res.status(404).json({ error: 'Avatar not found' });
  }
  
  // Check ownership
  if (avatar.user_id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Update PostgreSQL ONLY
  if (req.body.name) avatar.name = req.body.name;
  if (req.body.description !== undefined) avatar.description = req.body.description;
  await avatar.save();
  
  console.log('✅ Avatar metadata updated - user:', userId, 'avatar:', avatarId);
  
  const formatted = {
    id: avatar.id,
    user_id: avatar.user_id,
    name: avatar.name,
    description: avatar.description,
    model: {
      path: avatar.model_path,
      url: avatar.model_url
    },
    createdAt: avatar.createdAt || avatar.created_at,
    updatedAt: avatar.updatedAt || avatar.updated_at
  };
  
  return res.json({ ok: true, avatar: formatted });
});

// POST /api/avatar/:id/lipsync (application/json body)
const addLipsyncJson = handleAsync(async (req, res) => {
  const userId = req.user?.id;
  const avatarId = req.params.id;
  const json = req.body;
  
  if (!json || typeof json !== 'object') {
    return res.status(400).json({ error: 'JSON lipsync payload required' });
  }
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const avatar = await UserAvatar.findOne({ where: { id: avatarId } });
  
  if (!avatar) {
    return res.status(404).json({ error: 'Avatar not found' });
  }
  
  // Check ownership
  if (avatar.user_id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Save lipsync JSON to file system
  const lipsyncId = randomUUID();
  const lipsyncPath = path.join(service.lipsyncDir, `${lipsyncId}.json`);
  fs.writeFileSync(lipsyncPath, JSON.stringify(json, null, 2));
  const lipsyncUrl = service.buildPublicUrl(lipsyncPath);
  
  // Save to PostgreSQL
  const animation = await AvatarAnimation.create({
    avatar_id: avatarId,
    user_id: avatar.user_id,
    lipsync_path: lipsyncPath,
    lipsync_url: lipsyncUrl,
    lipsync_data: json,
    status: 'completed'
  });
  
  console.log('✅ Lipsync saved to PostgreSQL - avatar:', avatarId, 'animation:', animation.id);
  
  return res.status(201).json({ 
    ok: true, 
    lipsync: {
      id: lipsyncId,
      path: lipsyncPath,
      url: lipsyncUrl,
      createdAt: new Date().toISOString()
    }
  });
});

// POST /api/avatar/:id/lipsync/upload (multipart/form-data, field: lipsync)
const uploadLipsyncMiddleware = uploadLipsync.single('lipsync');
const addLipsyncFile = handleAsync(async (req, res) => {
  const userId = req.user?.id;
  const avatarId = req.params.id;
  
  if (!req.file) {
    return res.status(400).json({ error: 'lipsync JSON file is required' });
  }
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const avatar = await UserAvatar.findOne({ where: { id: avatarId } });
  
  if (!avatar) {
    return res.status(404).json({ error: 'Avatar not found' });
  }
  
  // Check ownership
  if (avatar.user_id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const lipsyncPath = req.file.path;
  const lipsyncUrl = service.buildPublicUrl(lipsyncPath);
  
  // Read lipsync data
  let lipsyncData = null;
  try {
    const fileContent = fs.readFileSync(lipsyncPath, 'utf-8');
    lipsyncData = JSON.parse(fileContent);
  } catch (parseError) {
    console.warn('Could not parse lipsync JSON:', parseError.message);
  }
  
  // Save to PostgreSQL ONLY
  const animation = await AvatarAnimation.create({
    avatar_id: avatarId,
    user_id: avatar.user_id,
    lipsync_path: lipsyncPath,
    lipsync_url: lipsyncUrl,
    lipsync_data: lipsyncData,
    status: 'completed'
  });
  
  console.log('✅ Lipsync saved to PostgreSQL - avatar:', avatarId, 'animation:', animation.id);
  
  return res.status(201).json({ 
    ok: true, 
    lipsync: {
      id: animation.id,
      path: lipsyncPath,
      url: lipsyncUrl,
      createdAt: new Date().toISOString()
    }
  });
});

// POST /api/avatar/:id/prepare-playback { audioUrl? }
const preparePlayback = handleAsync(async (req, res) => {
  const config = service.preparePlaybackConfig(req.params.id, req.body?.audioUrl);
  if (!config) return res.status(404).json({ error: 'Avatar not found' });
  return res.json({ ok: true, config });
});

// GET /api/avatar/user/:userId/history - Get user's avatar animation history
const getAnimationHistory = handleAsync(async (req, res) => {
  const userId = req.user?.id;
  const requestedUserId = req.params.userId;
  
  // Check if user is requesting their own history
  if (userId !== requestedUserId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const animations = await AvatarAnimation.findAll({
      where: { user_id: userId },
      include: [{
        model: UserAvatar,
        as: 'avatar',
        attributes: ['id', 'name', 'model_url']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      raw: false
    });
    
    const total = await AvatarAnimation.count({ where: { user_id: userId } });
    
    const formatted = animations.map(anim => ({
      id: anim.id,
      avatar: {
        id: anim.avatar?.id,
        name: anim.avatar?.name,
        model_url: anim.avatar?.model_url
      },
      audio_url: anim.audio_url,
      lipsync_url: anim.lipsync_url,
      duration_seconds: anim.duration_seconds,
      status: anim.status,
      created_at: anim.createdAt || anim.created_at
    }));
    
    return res.json({ ok: true, animations: formatted, total });
  } catch (error) {
    console.error('❌ Failed to get animation history:', error.message);
    return res.status(500).json({ error: 'Failed to get animation history' });
  }
});

// DELETE /api/avatar/animation/:animationId - Delete animation
const deleteAnimation = handleAsync(async (req, res) => {
  const userId = req.user?.id;
  const animationId = req.params.animationId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const animation = await AvatarAnimation.findOne({ where: { id: animationId } });
    
    if (!animation) {
      return res.status(404).json({ error: 'Animation not found' });
    }
    
    // Check ownership
    if (animation.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await animation.destroy();
    
    console.log('✅ Animation deleted - user:', userId, 'animation:', animationId);
    
    return res.json({ ok: true, removed: true });
  } catch (error) {
    console.error('❌ Failed to delete animation:', error.message);
    return res.status(500).json({ error: 'Failed to delete animation' });
  }
});

module.exports = {
  uploadModelMiddleware,
  createAvatar,
  listAvatars,
  getAvatar,
  deleteAvatar,
  updateMetadata,
  uploadLipsyncMiddleware,
  addLipsyncFile,
  addLipsyncJson,
  preparePlayback,
  getAnimationHistory,
  deleteAnimation
};
