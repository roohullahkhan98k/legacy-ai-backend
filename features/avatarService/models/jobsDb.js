const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const jobsDir = path.resolve(process.cwd(), 'uploads', 'avatars');
const jobsPath = path.join(jobsDir, 'jobs.json');

function ensure() {
  if (!fs.existsSync(jobsDir)) fs.mkdirSync(jobsDir, { recursive: true });
  if (!fs.existsSync(jobsPath)) fs.writeFileSync(jobsPath, JSON.stringify({ jobs: [] }, null, 2));
}

function readDb() {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(jobsPath, 'utf-8'));
  } catch (_) {
    return { jobs: [] };
  }
}

function writeDb(db) {
  ensure();
  fs.writeFileSync(jobsPath, JSON.stringify(db, null, 2));
}

function createJob(type, payload) {
  const db = readDb();
  const job = { id: randomUUID(), type, status: 'queued', payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), result: null, error: null };
  db.jobs.push(job);
  writeDb(db);
  return job;
}

function updateJob(id, patch) {
  const db = readDb();
  const j = db.jobs.find(j => j.id === id);
  if (!j) return null;
  Object.assign(j, patch, { updatedAt: new Date().toISOString() });
  writeDb(db);
  return j;
}

function getJob(id) {
  const db = readDb();
  return db.jobs.find(j => j.id === id) || null;
}

module.exports = { createJob, updateJob, getJob };


