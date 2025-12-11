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
// Milestone 6: Language detection service
const languageDetectionService = require('../../../common/services/LanguageDetectionService');
// Milestone 6: Translation service (Next 35%)
const translationService = require('../../../common/services/TranslationService');

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
		const userId = req.user?.id;
		
		// Check feature limit before creating memory
		if (userId) {
			const featureLimitService = require('../../subscriptionService/services/FeatureLimitService');
			const limitCheck = await featureLimitService.checkLimit(userId, 'memory_graph_operations');
			
			if (!limitCheck.allowed) {
				return res.status(403).json({
					success: false,
					error: 'Limit reached',
					message: `You have reached your memory graph operations limit (${limitCheck.limit}). Upgrade your plan to create more memories.`,
					limit: limitCheck.limit,
					currentUsage: limitCheck.currentUsage,
					remaining: limitCheck.remaining,
					plan: limitCheck.plan,
					upgradeRequired: true
				});
			}
		}
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

		// Milestone 6: Auto-detect language from document text
		const languageDetection = languageDetectionService.detectLanguage(document);
		const detectedLanguage = languageDetection.language || 'en';
		const languageConfidence = languageDetection.confidence || 0;

		console.log('[MemoryGraph] createMemory - Saving with userId:', userId, 'person:', person, 'memoryId:', memoryId, 'language:', detectedLanguage);

		// Milestone 6: Next 35% - Generate translations (async, don't block)
		let translatedTexts = {};
		const targetLanguages = ['en', 'ar', 'hi']; // Common languages to translate to
		
		// Generate translations in background (non-blocking)
		if (translationService.isAvailable() && detectedLanguage) {
          translationService.translateToMultiple(document, detectedLanguage, targetLanguages)
            .then(translations => {
              // Only update if we got actual translations (not empty object)
              if (translations && Object.keys(translations).length > 0) {
                MemoryNode.update(
                  { translated_texts: translations },
                  { where: { id: memoryId } }
                ).then(() => {
                  console.log(`✅ Translations saved for memory ${memoryId}:`, Object.keys(translations).join(', '));
                }).catch(err => console.warn('Failed to save translations:', err.message));
              } else {
                console.log(`⚠️ No translations generated for memory ${memoryId} (quota/error)`);
              }
            })
            .catch(err => {
              // Silently handle - translation is optional, memory creation still succeeds
              // Error already logged in TranslationService
              console.log(`⚠️ Translation generation failed for memory ${memoryId}:`, err.message);
            });
        }

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
			chroma_id: memoryId,
			original_language: detectedLanguage, // Milestone 6: Store detected language
			translated_texts: translatedTexts // Milestone 6: Next 35% - Will be updated async
		});

		// Record usage after successful creation
		if (userId) {
			const featureLimitService = require('../../subscriptionService/services/FeatureLimitService');
			await featureLimitService.recordUsage(userId, 'memory_graph_operations', {
				memory_id: memoryId,
				title: document.substring(0, 100),
				created_at: new Date()
			});
		}

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
		
		// Milestone 6: Return language information in response
		return res.json({ 
			ok: true, 
			id: memoryId,
			language: {
				code: detectedLanguage,
				name: languageDetectionService.getLanguageName(detectedLanguage),
				confidence: languageConfidence,
				isRTL: languageDetectionService.isRTL(detectedLanguage)
			}
		});
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
		
		// Milestone 6: Next 35% - Detect query language for cross-lingual search
		const queryLanguage = languageDetectionService.detectLanguage(q);
		console.log('[MemoryGraph] searchMemories - userId:', userId, 'query:', q, 'queryLanguage:', queryLanguage.language);
		
		if (!q) return res.status(400).json({ error: 'q is required' });
		
		// Cross-lingual search: text-embedding-3-large supports multilingual embeddings
		// So searching in English will find Arabic/Hindi memories automatically
		const result = await queryCollection(MEMORY_COLLECTION, [ q ], { n_results: n, where });
		
		// Milestone 6: Add language info to search results
		if (result.ids && result.ids[0]) {
			// Get memory nodes from PostgreSQL to include language info
			const memoryIds = result.ids[0];
			const memories = await MemoryNode.findAll({
				where: { id: { [Op.in]: memoryIds } },
				attributes: ['id', 'original_language', 'translated_texts']
			});
			
			// Create map for quick lookup
			const memoryMap = new Map();
			memories.forEach(m => memoryMap.set(m.id, m));
			
			// Add language info to metadata
			if (result.metadatas && result.metadatas[0]) {
				result.metadatas[0] = result.metadatas[0].map((meta, idx) => {
					const memoryId = result.ids[0][idx];
					const memory = memoryMap.get(memoryId);
					const translatedTexts = memory?.translated_texts || {};
					const hasActualTranslations = Object.keys(translatedTexts).length > 0;
					return {
						...meta,
						language: memory?.original_language || 'en',
						hasTranslations: hasActualTranslations,
						availableLanguages: hasActualTranslations ? Object.keys(translatedTexts).concat(memory?.original_language || 'en') : [memory?.original_language || 'en']
					};
				});
			}
		}
		
		// Add query language info to response
		result.queryLanguage = {
			code: queryLanguage.language,
			name: languageDetectionService.getLanguageName(queryLanguage.language),
			confidence: queryLanguage.confidence
		};
		
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
				...memory.metadata,
				// Milestone 6: Include language information
				language: memory.original_language || 'en',
				// Milestone 6: Next 35% - Include translations
				translated_texts: memory.translated_texts || {},
				hasTranslations: memory.translated_texts && Object.keys(memory.translated_texts).length > 0,
				availableLanguages: memory.translated_texts && Object.keys(memory.translated_texts).length > 0 
					? Object.keys(memory.translated_texts).concat(memory.original_language || 'en')
					: [memory.original_language || 'en']
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

		// Milestone 6: Re-detect language if document was updated
		let detectedLanguage = memory.original_language;
		let translatedTexts = memory.translated_texts || {};
		
		if (req.body.document && req.body.document !== memory.document) {
			const languageDetection = languageDetectionService.detectLanguage(doc);
			detectedLanguage = languageDetection.language || memory.original_language || 'en';
			console.log('[MemoryGraph] addTags - Re-detected language:', detectedLanguage);
			
			// Milestone 6: Next 35% - Regenerate translations if document changed
			if (translationService.isAvailable() && detectedLanguage) {
				const targetLanguages = ['en', 'ar', 'hi'];
				translationService.translateToMultiple(doc, detectedLanguage, targetLanguages)
					.then(translations => {
						// Only update if we got actual translations (not empty object)
						if (translations && Object.keys(translations).length > 0) {
							MemoryNode.update(
								{ translated_texts: translations },
								{ where: { id } }
							).then(() => {
								console.log(`✅ Translations regenerated for memory ${id}:`, Object.keys(translations).join(', '));
							}).catch(err => console.warn('Failed to update translations:', err.message));
						} else {
							console.log(`⚠️ No translations regenerated for memory ${id} (quota/error)`);
						}
					})
					.catch(err => console.warn('Translation regeneration failed:', err.message));
			}
		}

		// Update PostgreSQL
		await memory.update({
			document: doc,
			person,
			event,
			tags: tagsCombined,
			media: mediaCombined,
			metadata: { ...memory.metadata, ...metadataUpdate },
			original_language: detectedLanguage, // Milestone 6: Update language if document changed
			translated_texts: translatedTexts // Milestone 6: Next 35% - Will be updated async if document changed
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
		
		// Milestone 6: Return language information in response
		return res.json({ 
			ok: true, 
			id, 
			tags: tagsCombined,
			language: {
				code: detectedLanguage,
				name: languageDetectionService.getLanguageName(detectedLanguage),
				isRTL: languageDetectionService.isRTL(detectedLanguage)
			}
		});
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

// Milestone 6: Next 35% - Get memory in user's preferred language
exports.getMemoryInLanguage = async (req, res) => {
	try {
		const { id } = req.params;
		const preferredLang = req.query.lang || req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';
		
		if (!id) return res.status(400).json({ error: 'id is required' });
		
		const memory = await MemoryNode.findByPk(id);
		if (!memory) {
			return res.status(404).json({ error: 'Memory not found' });
		}
		
		// Get document in preferred language
		let displayText = memory.document; // Default to original
		const originalLang = memory.original_language || 'en';
		const translatedTexts = memory.translated_texts || {};
		const hasActualTranslations = Object.keys(translatedTexts).length > 0;
		
		// If user wants different language and translation exists
		if (preferredLang !== originalLang && hasActualTranslations && translatedTexts[preferredLang]) {
			displayText = translatedTexts[preferredLang];
		} else if (preferredLang === originalLang) {
			// User wants original language
			displayText = memory.document;
		}
		
		return res.json({
			ok: true,
			id: memory.id,
			document: displayText,
			original_document: memory.document,
			original_language: originalLang,
			display_language: preferredLang,
			translated_texts: translatedTexts,
			available_languages: hasActualTranslations ? Object.keys(translatedTexts).concat(originalLang) : [originalLang],
			has_translations: hasActualTranslations,
			person: memory.person,
			event: memory.event,
			tags: memory.tags,
			media: memory.media,
			metadata: memory.metadata
		});
	} catch (err) {
		const status = err.status || err?.response?.status || 500;
		return res.status(status).json({ error: 'getMemoryInLanguage failed', message: err.message });
	}
};


