'use strict';

const { ChromaClient } = require('chromadb');
const OpenAI = require('openai');

const CHROMA_HOST = process.env.CHROMA_HOST || 'http://localhost:8000';

let sharedClient = null;
let sharedEmbedder = null;
let sharedOpenAI = null;
let localEmbedderPromise = null;

function getClient() {
	if (!sharedClient) {
		sharedClient = new ChromaClient({ path: CHROMA_HOST });
	}
	return sharedClient;
}

function getEmbedder() {
	const provider = (process.env.EMBEDDINGS_PROVIDER || 'local').toLowerCase();

	if (provider === 'openai') {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error('EMBEDDINGS_PROVIDER=openai but no OPENAI_API_KEY set');
		}
		if (!sharedOpenAI) {
			sharedOpenAI = new OpenAI({ apiKey });
		}
		if (!sharedEmbedder) {
			sharedEmbedder = {
				generate: async (texts) => {
					const model = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
					const res = await sharedOpenAI.embeddings.create({ model, input: texts });
					return res.data.map(d => d.embedding);
				}
			};
		}
		return sharedEmbedder;
	}

	if (provider === 'local') {
		if (!localEmbedderPromise) {
			localEmbedderPromise = (async () => {
				const { pipeline } = await import('@xenova/transformers');
				const modelId = process.env.LOCAL_EMBED_MODEL || 'Xenova/all-MiniLM-L6-v2';
				const pipe = await pipeline('feature-extraction', modelId);
				return {
					generate: async (texts) => {
						const inputs = Array.isArray(texts) ? texts : [texts];
						const out = await pipe(inputs, { pooling: 'mean', normalize: true });
						if (Array.isArray(out)) {
							return out.map(t => Array.from(t.data));
						}
						return [Array.from(out.data)];
					}
				};
			})();
		}
		return {
			generate: async (texts) => (await localEmbedderPromise).generate(texts)
		};
	}

	throw new Error(`Unknown EMBEDDINGS_PROVIDER: ${provider}`);
}


function isNonEmptyObject(value) {
	return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
}

// Some Chroma server builds are strict about metadata types.
// This helper stringifies array values to avoid 422 validation errors on insert/update.
function sanitizeMetadataForChroma(metadata) {
	if (!metadata || typeof metadata !== 'object') return metadata;
	const out = {};
	for (const key of Object.keys(metadata)) {
		const value = metadata[key];
		if (Array.isArray(value)) {
			out[key] = JSON.stringify(value);
		} else {
			out[key] = value;
		}
	}
	return out;
}

async function heartbeat() {
	const client = getClient();
	return client.heartbeat();
}

async function ensureCollection(collectionName, metadata = {}) {
	const client = getClient();
	const args = isNonEmptyObject(metadata) ? { name: collectionName, metadata } : { name: collectionName };
	const collection = await client.getOrCreateCollection(args);
	const id = collection?.id || collection?.uuid || collection?.name || collectionName;
	return { id, name: collectionName, _collection: collection };
}

async function upsertDocuments(collectionName, items) {
	const client = getClient();
	const ensured = await ensureCollection(collectionName);
	const collection = ensured._collection || await client.getOrCreateCollection({ name: collectionName });
	const payload = {
		ids: items.map(i => i.id),
		documents: items.map(i => i.document)
	};
	const allHaveMetadata = items.every(i => isNonEmptyObject(i.metadata));
	if (allHaveMetadata) {
		payload.metadatas = items.map(i => sanitizeMetadataForChroma(i.metadata));
	}
	const hadMetadatas = Array.isArray(payload.metadatas) && payload.metadatas.length === payload.ids.length;
	const embedder = getEmbedder();
	if (embedder) {
		// Always provide embeddings client-side if we can, to avoid relying on collection-level embedder
		payload.embeddings = await embedder.generate(payload.documents);
	} else {
		const haveEmbeddings = items.map(i => i.embedding).filter(Boolean).length === items.length;
		if (!haveEmbeddings) {
			const error = new Error('Embeddings required: set OPENAI_API_KEY or allow local embeddings, or provide embeddings for all items');
			error.status = 422;
			throw error;
		}
		payload.embeddings = items.map(i => i.embedding);
	}

	// Debug sizes
	try {
		// First attempt: full payload
		await collection.add(payload);
		return { ok: true, upserted: payload.ids.length };
	} catch (err) {
		// Fallback 1: drop metadatas if present, then try to attach via update
		try {
			const minimal = { ids: payload.ids, embeddings: payload.embeddings, documents: payload.documents };
			await collection.add(minimal);
			if (payload.metadatas || payload.documents) {
				try {
					const updateParams = { ids: payload.ids };
					if (payload.documents) updateParams.documents = payload.documents;
					if (payload.metadatas) updateParams.metadatas = payload.metadatas;
					await collection.update(updateParams);
					return { ok: true, upserted: minimal.ids.length };
				} catch (_) {
					if (hadMetadatas) {
						const e = new Error('Chroma rejected metadata (422). Memory not saved.');
						e.status = 422;
						throw e;
					}
					return { ok: true, upserted: minimal.ids.length };
				}
			}
			return { ok: true, upserted: minimal.ids.length };
		} catch (err2) {
			// Fallback 2: embeddings only, then try to attach documents/metadata via update
			try {
				const vectorsOnly = { ids: payload.ids, embeddings: payload.embeddings };
				await collection.add(vectorsOnly);
				const updateParams = { ids: payload.ids };
				if (payload.documents) updateParams.documents = payload.documents;
				if (payload.metadatas) updateParams.metadatas = payload.metadatas;
				try {
					await collection.update(updateParams);
					return { ok: true, upserted: vectorsOnly.ids.length };
				} catch (_) {
					if (hadMetadatas) {
						const e = new Error('Chroma rejected metadata (422). Memory not saved.');
						e.status = 422;
						throw e;
					}
					return { ok: true, upserted: vectorsOnly.ids.length };
				}
			} catch (err3) {
				const finalError = new Error(`collection.add failed: ${err3?.message || err2?.message || err?.message || 'Unknown error'}`);
				finalError.status = err3?.status || err2?.status || err?.status;
				throw finalError;
			}
		}
	}
}

async function queryCollection(collectionName, queryTextArray, options = {}) {
	const client = getClient();
	const ensured = await ensureCollection(collectionName);
	const collection = ensured._collection || await client.getOrCreateCollection({ name: collectionName });
	const embedder = getEmbedder();
	let queryArgs;
	if (embedder) {
		const vectors = await embedder.generate(queryTextArray);
		queryArgs = { queryEmbeddings: vectors };
	} else {
		queryArgs = { queryTexts: queryTextArray };
	}
	const result = await collection.query({
		...queryArgs,
		nResults: options.n_results || 5,
		where: options.where,
		include: options.include || [ 'documents', 'metadatas', 'distances', 'embeddings', 'uris' ]
	});
	return result;
}

async function deleteByIds(collectionName, ids) {
	const client = getClient();
	const ensured = await ensureCollection(collectionName);
	const collection = ensured._collection || await client.getOrCreateCollection({ name: collectionName });
	await collection.delete({ ids });
	return { ok: true, deleted: ids.length };
}

async function deleteCollectionByName(collectionName) {
    const client = getClient();
    try {
        await client.deleteCollection({ name: collectionName });
        return { ok: true };
    } catch (err) {
        if (err && /not found/i.test(String(err.message || ''))) return { ok: true };
        throw err;
    }
}

async function listIdsByWhere(collectionName, where, limit = 1000) {
    const client = getClient();
    const ensured = await ensureCollection(collectionName);
    const collection = ensured._collection || await client.getOrCreateCollection({ name: collectionName });
    const res = await collection.get({ where, limit, include: [ 'metadatas' ] });
    return Array.isArray(res?.ids) ? res.ids : [];
}

async function getByIds(collectionName, ids) {
    const client = getClient();
    const ensured = await ensureCollection(collectionName);
    const collection = ensured._collection || await client.getOrCreateCollection({ name: collectionName });
    const res = await collection.get({ ids, include: [ 'metadatas', 'documents' ] });
    return res || {};
}

async function updateMetadatasByIds(collectionName, ids, metadatas, documents) {
    const client = getClient();
    const ensured = await ensureCollection(collectionName);
    const collection = ensured._collection || await client.getOrCreateCollection({ name: collectionName });
    const updateParams = { ids };
    if (Array.isArray(metadatas)) updateParams.metadatas = metadatas.map(sanitizeMetadataForChroma);
    if (Array.isArray(documents)) {
        updateParams.documents = documents;
        // Provide embeddings when updating documents to avoid server-side embed requirement
        const embedder = getEmbedder();
        if (embedder) {
            updateParams.embeddings = await embedder.generate(documents);
        }
    }
    await collection.update(updateParams);
    return { ok: true, updated: ids.length };
}

module.exports = {
	CHROMA_HOST,
	heartbeat,
	ensureCollection,
	upsertDocuments,
	queryCollection,
	deleteByIds,
	deleteCollectionByName,
	listIdsByWhere,
	getByIds,
	updateMetadatasByIds
};


