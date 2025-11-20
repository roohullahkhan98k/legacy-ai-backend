const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

class AvatarService {
  constructor() {
    this.name = 'Avatar Service';
    this.status = 'Active';
    this.baseUploadsDir = path.resolve(process.cwd(), 'uploads');
    this.avatarsDir = path.join(this.baseUploadsDir, 'avatars');
    this.modelsDir = path.join(this.avatarsDir, 'models');
    this.lipsyncDir = path.join(this.avatarsDir, 'lipsync');
    this.dbPath = path.join(this.avatarsDir, 'db.json');
    this.ensureDirectories();
    this.database = this.readDatabase();
  }

  ensureDirectories() {
    [this.baseUploadsDir, this.avatarsDir, this.modelsDir, this.lipsyncDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  readDatabase() {
    try {
      if (!fs.existsSync(this.dbPath)) {
        fs.writeFileSync(this.dbPath, JSON.stringify({ avatars: [] }, null, 2));
      }
      const raw = fs.readFileSync(this.dbPath, 'utf-8');
      const data = JSON.parse(raw || '{}');
      if (!data.avatars || !Array.isArray(data.avatars)) {
        data.avatars = [];
      }
      return data;
    } catch (err) {
      console.error('AvatarService: failed to read db.json', err);
      return { avatars: [] };
    }
  }

  writeDatabase() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.database, null, 2));
    } catch (err) {
      console.error('AvatarService: failed to write db.json', err);
    }
  }

  buildPublicUrl(absolutePath) {
    const normalized = absolutePath.replace(/\\/g, '/');
    const uploadsRoot = this.baseUploadsDir.replace(/\\/g, '/');
    const relative = normalized.startsWith(uploadsRoot)
      ? normalized.substring(uploadsRoot.length)
      : path.basename(normalized);
    return '/uploads' + relative;
  }

  createAvatarFromModelFile(file, metadata = {}) {
    const id = path.parse(file.filename).name || randomUUID();
    const modelPath = file.path;
    const createdAt = new Date().toISOString();
    
    // Check if avatar with same name already exists
    const baseName = metadata.name || 'Avatar';
    let finalName = baseName;
    let counter = 1;
    
    while (this.database.avatars.some(avatar => avatar.name === finalName)) {
      finalName = `${baseName} (${counter})`;
      counter++;
    }
    
    const avatar = {
      id,
      name: finalName,
      description: metadata.description || '',
      model: {
        path: modelPath,
        url: this.buildPublicUrl(modelPath)
      },
      lipsync: [],
      audio: null,
      createdAt,
      updatedAt: createdAt
    };
    this.database.avatars.push(avatar);
    this.writeDatabase();
    return avatar;
  }

  listAvatars() {
    // Re-read database from disk to get latest changes
    this.database = this.readDatabase();
    return this.database.avatars;
  }

  getAvatar(id) {
    return this.database.avatars.find(a => a.id === id);
  }

  updateMetadata(id, patch) {
    const avatar = this.getAvatar(id);
    if (!avatar) return null;
    if (typeof patch.name === 'string') avatar.name = patch.name;
    if (typeof patch.description === 'string') avatar.description = patch.description;
    avatar.updatedAt = new Date().toISOString();
    this.writeDatabase();
    return avatar;
  }

  attachLipsyncJson(id, json) {
    const avatar = this.getAvatar(id);
    if (!avatar) return null;
    const entryId = randomUUID();
    const targetPath = path.join(this.lipsyncDir, `${entryId}.json`);
    fs.writeFileSync(targetPath, JSON.stringify(json, null, 2));
    const record = {
      id: entryId,
      path: targetPath,
      url: this.buildPublicUrl(targetPath),
      createdAt: new Date().toISOString()
    };
    avatar.lipsync.push(record);
    avatar.updatedAt = new Date().toISOString();
    this.writeDatabase();
    return record;
  }

  attachLipsyncFile(id, absolutePath) {
    const avatar = this.getAvatar(id);
    if (!avatar) return null;
    const entryId = path.parse(absolutePath).name || randomUUID();
    const record = {
      id: entryId,
      path: absolutePath,
      url: this.buildPublicUrl(absolutePath),
      createdAt: new Date().toISOString()
    };
    avatar.lipsync.push(record);
    avatar.updatedAt = new Date().toISOString();
    this.writeDatabase();
    return record;
  }

  attachAudioFile(id, absolutePath) {
    const avatar = this.getAvatar(id);
    if (!avatar) return null;
    const entryId = path.parse(absolutePath).name || randomUUID();
    const record = {
      id: entryId,
      path: absolutePath,
      url: this.buildPublicUrl(absolutePath),
      createdAt: new Date().toISOString()
    };
    avatar.audio = record;
    avatar.updatedAt = new Date().toISOString();
    this.writeDatabase();
    return record;
  }

  deleteAvatar(id) {
    const index = this.database.avatars.findIndex(a => a.id === id);
    if (index === -1) return false;
    const [avatar] = this.database.avatars.splice(index, 1);
    // Best-effort cleanup; ignore errors
    try { if (avatar?.model?.path && fs.existsSync(avatar.model.path)) fs.unlinkSync(avatar.model.path); } catch (_) {}
    for (const l of avatar?.lipsync || []) {
      try { if (l?.path && fs.existsSync(l.path)) fs.unlinkSync(l.path); } catch (_) {}
    }
    this.writeDatabase();
    return true;
  }

  preparePlaybackConfig(id, audioUrl) {
    const avatar = this.getAvatar(id);
    if (!avatar) return null;
    const latestLipsync = avatar.lipsync[avatar.lipsync.length - 1] || null;
    return {
      avatarId: id,
      modelUrl: avatar.model.url,
      lipsyncUrl: latestLipsync ? latestLipsync.url : null,
      audioUrl: audioUrl || (avatar.audio ? avatar.audio.url : null)
    };
  }
}

module.exports = AvatarService;
