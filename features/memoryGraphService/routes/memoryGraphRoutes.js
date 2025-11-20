const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const { authenticateToken } = require('../../../common/middleware/authMiddleware');

const ctrl = require('../controllers/memoryGraphController');
const memoryCtrl = require('../controllers/memoryController');
const { deleteCollectionByName, listIdsByWhere, deleteByIds } = require('../../../chromaDB/chromadb');

// Apply auth middleware to all routes (optional auth - attaches user if token present)
router.use(authenticateToken);

// Ensure uploads directory exists: ./uploads/graphservice-media
const uploadsRoot = path.resolve(process.cwd(), 'uploads');
const graphMediaDir = path.join(uploadsRoot, 'graphservice-media');
fs.mkdirSync(graphMediaDir, { recursive: true });

// Multer storage to graphservice-media
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, graphMediaDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    const stamp = Date.now();
    cb(null, `${base}-${stamp}${ext}`);
  }
});

const upload = multer({ storage });

// Media upload endpoint (supports multiple files/mix of types)
router.post('/media/upload', upload.array('files', 10), (req, res) => {
  const files = (req.files || []).map(f => ({
    filename: f.filename,
    mimetype: f.mimetype,
    size: f.size,
    path: `/uploads/graphservice-media/${f.filename}`
  }));
  return res.json({ ok: true, files });
});

// Create memory with optional media files: accept both 'media' and 'files' fields
router.post('/memories', upload.fields([{ name: 'media', maxCount: 10 }, { name: 'files', maxCount: 10 }]), ctrl.createMemory);
router.get('/memories/search', ctrl.searchMemories);
router.get('/graph', ctrl.getGraph);
// Update memory with optional media files
router.post('/memories/:id/tags', upload.fields([{ name: 'media', maxCount: 10 }, { name: 'files', maxCount: 10 }]), ctrl.addTags);
router.delete('/memories/:id', ctrl.deleteMemory);

// Purge entire memory collection (dangerous)
router.post('/purge', async (req, res) => {
  try {
    const name = process.env.MEMORY_COLLECTION || 'memory-graph';
    await deleteCollectionByName(name);
    return res.json({ ok: true, collection: name });
  } catch (err) {
    const status = err.status || err?.response?.status || 500;
    return res.status(status).json({ error: 'purge failed', message: err.message });
  }
});

// Delete by filters (person, event, tags) - find IDs first then delete
router.post('/memories/delete-by-filter', async (req, res) => {
  try {
    const name = process.env.MEMORY_COLLECTION || 'memory-graph';
    const { person, event, tags } = req.body || {};
    const where = {};
    if (person) where.person = person;
    if (event) where.event = event;
    if (Array.isArray(tags) && tags.length > 0) where.tags = { $in: tags };
    if (Object.keys(where).length === 0) {
      return res.status(400).json({ error: 'invalid_filter', message: 'Provide person, event, or tags[]' });
    }
    const ids = await listIdsByWhere(name, where, 5000);
    if (!ids.length) return res.json({ ok: true, deleted: 0, ids: [] });
    const result = await deleteByIds(name, ids);
    return res.json({ ok: true, deleted: result.deleted, ids });
  } catch (err) {
    const status = err.status || err?.response?.status || 500;
    return res.status(status).json({ error: 'delete_by_filter_failed', message: err.message });
  }
});

// ========== NEW SIMPLIFIED API ==========

// Create memory node
router.post('/node', memoryCtrl.createMemory);

// Get memory node
router.get('/node/:nodeId', memoryCtrl.getMemory);

// Update memory node
router.put('/node/:nodeId', memoryCtrl.updateMemory);

// Delete memory node
router.delete('/node/:nodeId', memoryCtrl.deleteMemory);

// Get user's memories
router.get('/user/:userId/memories', memoryCtrl.getUserMemories);

// Search memories (semantic)
router.post('/search', memoryCtrl.searchMemories);

// Find similar memories
router.get('/node/:nodeId/similar', memoryCtrl.findSimilar);

// Get user stats
router.get('/user/:userId/stats', memoryCtrl.getStats);

// Add connection between nodes
router.post('/node/:nodeId/connect', memoryCtrl.addConnection);

// Remove connection
router.delete('/node/:nodeId/connect/:targetNodeId', memoryCtrl.removeConnection);

module.exports = router;


