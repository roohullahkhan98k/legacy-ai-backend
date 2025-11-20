const express = require('express');
const router = express.Router();

const {
	ensureCollection,
	upsertDocuments,
	queryCollection,
	deleteByIds,
	CHROMA_HOST,
	heartbeat
} = require('./chromadb');

router.get('/config', (req, res) => {
	return res.json({ CHROMA_HOST });
});

router.get('/health', async (req, res, next) => {
	try {
		const hb = await heartbeat();
		return res.json({ status: 'ok', heartbeat: hb });
	} catch (err) {
		const status = err?.response?.status || 503;
		const message = err?.response?.data || err?.message || `Cannot reach Chroma at ${CHROMA_HOST}`;
		return res.status(status).json({ error: 'Chroma connection error', message });
	}
});

router.post('/collections/:name/ensure', async (req, res) => {
	try {
		const { name } = req.params;
		const meta = req.body?.metadata || {};
		const c = await ensureCollection(name, meta);
		return res.json({ ok: true, collection: c });
	} catch (err) {
		const status = err?.response?.status || 400;
		const message = err?.response?.data || err?.message || 'Ensure collection failed';
		return res.status(status).json({ error: 'Chroma ensure error', message });
	}
});

router.post('/collections/:name/upsert', async (req, res, next) => {
	try {
		const collectionName = req.params.name;
		const items = req.body.items || [];
		if (!Array.isArray(items) || items.length === 0) {
			return res.status(400).json({ error: 'items array is required' });
		}
		const result = await upsertDocuments(collectionName, items);
		return res.json(result);
	} catch (err) {
		const status = err?.response?.status || 400;
		const message = err?.response?.data || err?.message || 'Upsert failed';
		return res.status(status).json({ error: 'Chroma upsert error', message });
	}
});

router.post('/collections/:name/query', async (req, res, next) => {
	try {
		const collectionName = req.params.name;
		const { query_texts, n_results, where, include } = req.body;
		if (!Array.isArray(query_texts) || query_texts.length === 0) {
			return res.status(400).json({ error: 'query_texts array is required' });
		}
		const result = await queryCollection(collectionName, query_texts, { n_results, where, include });
		return res.json(result);
	} catch (err) {
		const status = err?.response?.status || 400;
		const message = err?.response?.data || err?.message || 'Query failed';
		return res.status(status).json({ error: 'Chroma query error', message });
	}
});

router.post('/collections/:name/delete', async (req, res, next) => {
	try {
		const collectionName = req.params.name;
		const { ids } = req.body;
		if (!Array.isArray(ids) || ids.length === 0) {
			return res.status(400).json({ error: 'ids array is required' });
		}
		const result = await deleteByIds(collectionName, ids);
		return res.json(result);
	} catch (err) {
		const status = err?.response?.status || 400;
		const message = err?.response?.data || err?.message || 'Delete failed';
		return res.status(status).json({ error: 'Chroma delete error', message });
	}
});

module.exports = router;


