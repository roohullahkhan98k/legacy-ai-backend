const crypto = require('crypto');
const path = require('path');
const MemoryNode = require('../models/MemoryNode');
const chromaService = require('../services/MemoryChromaService');
const { Op } = require('sequelize');
const chromaModulePath = path.resolve(process.cwd(), 'chromaDB', 'chromadb.js');
const {
	ensureCollection,
	upsertDocuments,
	queryCollection,
	deleteByIds,
	updateMetadatasByIds
} = require('../../../chromaDB/chromadb');

const MEMORY_COLLECTION = process.env.MEMORY_COLLECTION || 'memory-graph';

function generateId(prefix = 'mem') {
	if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
	return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// Get current user from token (if available)
function getUserIdFromRequest(req) {
	// If you have auth middleware, use: return req.user?.id
	// For now, return null (anonymous) or get from body
	return req.body?.user_id || req.query?.user_id || null;
}

function buildWhereFilter(query) {
	const where = {};
	if (query.person) where.person = query.person;
	if (query.event) where.event = query.event;
	if (query.tag) {
		// Use $in for array membership to avoid 'Invalid where clause'
		const values = Array.isArray(query.tag) ? query.tag : String(query.tag).split(',').map(s => s.trim()).filter(Boolean);
		where.tags = { $in: values };
	}
	return Object.keys(where).length ? where : undefined;
}

exports.createMemory = async (req, res) => {
	try {
		console.log('[MemoryGraph] createMemory START - req.user:', req.user ? 'EXISTS' : 'NULL', 'id:', req.user?.id);
		
		const {
			id,
			document,
			person,
			event,
			media = [],
			tags = [],
			extra = {},
			createdAt
		} = req.body || {};

		// Merge uploaded files (if any) into media paths
		const uploaded = [];
		const mediaFiles = (req.files && (req.files.media || req.files.files)) || [];
		for (const f of mediaFiles) {
			uploaded.push(`/uploads/graphservice-media/${f.filename}`);
		}

		if (!document || !person) {
			return res.status(400).json({ error: 'document and person are required' });
		}

		const memoryId = id || generateId('memory');
		// Get user from middleware (req.user set by authenticateToken)
		const userId = req.user?.id || null;
		const mediaCombined = Array.isArray(media) ? media.slice() : [];
		for (const p of uploaded) mediaCombined.push(p);
		const tagsCombined = Array.isArray(tags) ? tags : [];

		console.log('[MemoryGraph] createMemory - Saving with userId:', userId, 'person:', person, 'memoryId:', memoryId);

		// Save to PostgreSQL
		await MemoryNode.create({
			id: memoryId,
			user_id: userId,
			document,
			person,
			event: event || null,
			tags: tagsCombined,
			media: mediaCombined,
			metadata: extra || {},
			chroma_id: memoryId
		});

		// Save to ChromaDB
		await ensureCollection(MEMORY_COLLECTION);
		const metadata = { person };
		if (event) metadata.event = event;
		if (mediaCombined.length > 0) metadata.media = mediaCombined;
		if (tagsCombined.length > 0) metadata.tags = tagsCombined;
		if (userId) metadata.user_id = userId;
		if (extra && typeof extra === 'object' && Object.keys(extra).length > 0) {
			Object.assign(metadata, extra);
		}
		metadata.createdAt = createdAt || new Date().toISOString();
		
		await upsertDocuments(MEMORY_COLLECTION, [ { id: memoryId, document, metadata } ]);
		
		return res.json({ ok: true, id: memoryId });
	} catch (err) {
		const status = err.status || err?.response?.status || 500;
		return res.status(status).json({ error: 'createMemory failed', message: err.message });
	}
};

exports.searchMemories = async (req, res) => {
	try {
		const q = req.query.q || '';
		const n = parseInt(req.query.n || '10', 10);
		let where = buildWhereFilter(req.query);
		
		// Add user_id filter if available
		const userId = req.user?.id || req.query.user_id || getUserIdFromRequest(req);
		if (userId && !where) {
			where = { user_id: userId };
		} else if (userId && where) {
			where.user_id = userId;
		}
		
		console.log('[MemoryGraph] searchMemories - userId:', userId, 'query:', q);
		
		if (!q) return res.status(400).json({ error: 'q is required' });
		const result = await queryCollection(MEMORY_COLLECTION, [ q ], { n_results: n, where });
		return res.json(result);
	} catch (err) {
		const status = err.status || err?.response?.status || 500;
		return res.status(status).json({ error: 'searchMemories failed', message: err.message });
	}
};

exports.getGraph = async (req, res) => {
	try {
		const seed = req.query.seed || 'memory';
		const n = Math.min(parseInt(req.query.n || '200', 10), 1000);
		
		// Get user from auth or query param
		const userId = req.user?.id || req.query.user_id || getUserIdFromRequest(req);

		// Strict filtering: ONLY show user's own memories
		const where = userId ? { user_id: userId } : { user_id: null };
		
		console.log('[MemoryGraph] getGraph - userId:', userId, 'showing:', where);
		
		const memories = await MemoryNode.findAll({
			where,
			limit: n,
			order: [['created_at', 'DESC']]
		});
		
		console.log('[MemoryGraph] Found', memories.length, 'memories for user');
		

		const nodes = [];
		const edges = [];
		const nodeIndex = new Map();

		function addNode(id, label, type, data = {}) {
			if (nodeIndex.has(id)) return;
			nodeIndex.set(id, true);
			nodes.push({ id, label, type, data });
		}

		function addEdge(source, target, label) {
			edges.push({ source, target, label });
		}

		for (const memory of memories) {
			const memId = memory.id;
			const meta = {
				person: memory.person,
				event: memory.event,
				media: memory.media,
				tags: memory.tags,
				...memory.metadata
			};

			addNode(memId, memory.document, 'memory', meta);
			
			if (memory.person) {
				addNode(`person:${memory.person}`, memory.person, 'person');
				addEdge(`person:${memory.person}`, memId, 'has_memory');
			}
			if (memory.event) {
				addNode(`event:${memory.event}`, memory.event, 'event');
				addEdge(memId, `event:${memory.event}`, 'event');
			}
		if (Array.isArray(memory.media)) {
			for (const m of memory.media) {
				addNode(`media:${m}`, m, 'media');
				addEdge(memId, `media:${m}`, 'media');
			}
		}
		// Don't create individual tag nodes - frontend handles tag visualization
		}

		return res.json({ nodes, edges, count: memories.length });
	} catch (err) {
		const status = err.status || err?.response?.status || 500;
		return res.status(status).json({ error: 'getGraph failed', message: err.message });
	}
};

exports.addTags = async (req, res) => {
	try {
		const { id } = req.params;
		const { tags = [] } = req.body || {};
		console.log('[MemoryGraph] update request', {
			id,
			bodyKeys: Object.keys(req.body || {}),
			tagsLen: Array.isArray(tags) ? tags.length : 0
		});
		
		// Get existing memory from PostgreSQL
		const memory = await MemoryNode.findByPk(id);
		if (!memory) {
			return res.status(404).json({ error: 'Memory not found' });
		}

		// Prepare update data
		const doc = req.body.document || memory.document;
		const tagsCombined = Array.isArray(tags) && tags.length > 0 ? tags : memory.tags;
		
		// Handle uploaded files
		const uploaded = [];
		const mediaFiles = (req.files && (req.files.media || req.files.files)) || [];
		for (const f of mediaFiles) {
			uploaded.push(`/uploads/graphservice-media/${f.filename}`);
		}
		
		let mediaCombined = Array.isArray(memory.media) ? [...memory.media] : [];
		if (uploaded.length) {
			mediaCombined = [...mediaCombined, ...uploaded];
		}
		
		// Handle metadata from request
		const metadataUpdate = req.body.metadata || {};
		const person = metadataUpdate.person || memory.person;
		const event = metadataUpdate.event || memory.event;

		// Update PostgreSQL
		await memory.update({
			document: doc,
			person,
			event,
			tags: tagsCombined,
			media: mediaCombined,
			metadata: { ...memory.metadata, ...metadataUpdate }
		});

		// Update ChromaDB
		await ensureCollection(MEMORY_COLLECTION);
		const chromaMeta = { person };
		if (event) chromaMeta.event = event;
		if (mediaCombined.length > 0) chromaMeta.media = mediaCombined;
		if (tagsCombined.length > 0) chromaMeta.tags = tagsCombined;
		if (memory.user_id) chromaMeta.user_id = memory.user_id;
		Object.assign(chromaMeta, metadataUpdate);
		
		console.log('[MemoryGraph] update payload', { id, documentLen: doc.length, metadataPreview: chromaMeta });
		await updateMetadatasByIds(MEMORY_COLLECTION, [ id ], [ chromaMeta ], [ doc ]);
		console.log('[MemoryGraph] update success', { id, updated: true });
		
		return res.json({ ok: true, id, tags: tagsCombined });
	} catch (err) {
		console.error('[MemoryGraph] update error', { message: err?.message, status: err?.status });
		const status = err.status || err?.response?.status || 500;
		return res.status(status).json({ error: 'addTags failed', message: err.message });
	}
};

exports.deleteMemory = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ error: 'id is required' });
		
		// Delete from PostgreSQL
		await MemoryNode.destroy({ where: { id } });
		
		// Delete from ChromaDB
		await deleteByIds(MEMORY_COLLECTION, [ id ]);
		
		return res.json({ ok: true, id });
	} catch (err) {
		const status = err.status || err?.response?.status || 500;
		return res.status(status).json({ error: 'deleteMemory failed', message: err.message });
	}
};


