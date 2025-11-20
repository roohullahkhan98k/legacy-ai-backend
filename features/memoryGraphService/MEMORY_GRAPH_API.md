# 🧠 Memory Graph API - Complete Guide

## Overview
**Hybrid system** using PostgreSQL for structured data + ChromaDB for semantic search.

Base URL: `/api/memory-graph`

---

## 📊 Database Structure

### PostgreSQL Table: `memory_nodes`
Stores structured metadata for fast queries.

```sql
- id (UUID)
- user_id (UUID) - Owner of the memory
- node_id (STRING) - Unique node identifier
- title (STRING) - Memory title
- type (ENUM) - 'text', 'image', 'video', 'audio', 'link'
- content_preview (TEXT) - First 200 chars
- file_path (STRING) - Path to multimedia file
- tags (JSONB) - Array of tags ['javascript', 'learning']
- connections (JSONB) - Array of connected node IDs
- importance (INTEGER) - Rating 0-10
- access_count (INTEGER) - Times accessed
- last_accessed_at (TIMESTAMP)
- chroma_id (STRING) - Reference to ChromaDB document
- metadata (JSONB) - Additional data
- created_at, updated_at (TIMESTAMP)
```

### ChromaDB Collection: `memory_graph`
Stores full content with embeddings for semantic search.

```javascript
{
  id: "chroma-doc-id",
  document: "Full text content for semantic search...",
  metadata: {
    node_id: "node-123",
    user_id: "user-uuid",
    title: "JavaScript Learning",
    type: "text",
    tags: "[\"javascript\",\"coding\"]"
  }
}
```

---

## 🎯 What Goes Where?

### **PostgreSQL (Fast Queries):**
- ✅ Metadata (title, type, tags, dates)
- ✅ Preview (first 200 chars)
- ✅ Connections between nodes
- ✅ Statistics (count, access)
- ✅ File paths
- ✅ Quick filters (by type, tag, date)

### **ChromaDB (Semantic Search):**
- ✅ Full content text
- ✅ Embeddings for similarity
- ✅ Natural language search
- ✅ Find related memories

---

## 🔌 API Endpoints

### 1. Create Memory Node

**POST** `/api/memory-graph/node`

Create a new memory node.

**Request:**
```json
{
  "user_id": "user-uuid",
  "node_id": "unique-node-id",
  "title": "JavaScript Closures",
  "type": "text",
  "content": "Full content text here for semantic search...",
  "tags": ["javascript", "programming"],
  "connections": ["node-456", "node-789"],
  "importance": 5,
  "metadata": {
    "source": "learning",
    "topic": "closures"
  }
}
```

**Response:**
```json
{
  "success": true,
  "memory": {
    "id": "uuid",
    "node_id": "unique-node-id",
    "title": "JavaScript Closures",
    "type": "text",
    "content_preview": "Full content text here for semantic...",
    "tags": ["javascript", "programming"],
    "connections": ["node-456", "node-789"],
    "importance": 5,
    "created_at": "2025-10-11T..."
  }
}
```

---

### 2. Get Memory Node

**GET** `/api/memory-graph/node/:nodeId`

Get a specific memory node (updates access count).

**Response:**
```json
{
  "success": true,
  "memory": {
    "id": "uuid",
    "node_id": "unique-node-id",
    "title": "JavaScript Closures",
    "type": "text",
    "content_preview": "Full content...",
    "tags": ["javascript"],
    "connections": ["node-456"],
    "importance": 5,
    "access_count": 10,
    "last_accessed_at": "2025-10-11T...",
    "created_at": "2025-10-11T..."
  }
}
```

---

### 3. Update Memory Node

**PUT** `/api/memory-graph/node/:nodeId`

Update an existing memory node.

**Request:**
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "tags": ["javascript", "advanced"],
  "importance": 8,
  "metadata": {
    "updated_reason": "added more details"
  }
}
```

**Response:**
```json
{
  "success": true,
  "memory": {
    // Updated memory object
  }
}
```

---

### 4. Delete Memory Node

**DELETE** `/api/memory-graph/node/:nodeId`

Delete a memory (from both PostgreSQL and ChromaDB).

**Response:**
```json
{
  "success": true,
  "message": "Memory deleted"
}
```

---

### 5. Get User's Memories

**GET** `/api/memory-graph/user/:userId/memories`

Get all memories for a user with optional filters.

**Query Parameters:**
- `type` - Filter by type (text, image, video, audio, link)
- `tags` - Comma-separated tags (e.g., `tags=javascript,learning`)
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)

**Example:**
```
GET /api/memory-graph/user/user-123/memories?type=text&tags=javascript&limit=20
```

**Response:**
```json
{
  "success": true,
  "total": 45,
  "memories": [
    {
      "id": "uuid",
      "node_id": "node-123",
      "title": "JavaScript Closures",
      "type": "text",
      "content_preview": "...",
      "tags": ["javascript"],
      "connections": ["node-456"],
      "importance": 5,
      "access_count": 10,
      "created_at": "2025-10-11T..."
    },
    ...
  ]
}
```

---

### 6. Search Memories (Semantic)

**POST** `/api/memory-graph/search`

Search memories using natural language (ChromaDB semantic search).

**Request:**
```json
{
  "user_id": "user-uuid",
  "query": "How do closures work in JavaScript?",
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "uuid",
      "node_id": "node-123",
      "title": "JavaScript Closures",
      "type": "text",
      "content_preview": "...",
      "tags": ["javascript"],
      "importance": 5,
      "created_at": "2025-10-11T...",
      "distance": 0.15
    },
    ...
  ]
}
```

**Note:** `distance` - Lower values = more similar (0 = identical, higher = less similar)

---

### 7. Find Similar Memories

**GET** `/api/memory-graph/node/:nodeId/similar?limit=5`

Find memories similar to a specific node.

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "uuid",
      "node_id": "node-456",
      "title": "Function Scope",
      "type": "text",
      ...
    },
    ...
  ]
}
```

---

### 8. Get User Statistics

**GET** `/api/memory-graph/user/:userId/stats`

Get memory statistics for a user.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 45,
    "by_type": [
      { "type": "text", "count": 30 },
      { "type": "image", "count": 10 },
      { "type": "video", "count": 5 }
    ],
    "most_accessed": [
      {
        "node_id": "node-123",
        "title": "JavaScript Closures",
        "access_count": 25
      },
      ...
    ]
  }
}
```

---

### 9. Add Connection Between Nodes

**POST** `/api/memory-graph/node/:nodeId/connect`

Connect two memory nodes.

**Request:**
```json
{
  "target_node_id": "node-456"
}
```

**Response:**
```json
{
  "success": true,
  "connections": ["node-456", "node-789"]
}
```

---

### 10. Remove Connection

**DELETE** `/api/memory-graph/node/:nodeId/connect/:targetNodeId`

Remove connection between nodes.

**Response:**
```json
{
  "success": true,
  "connections": ["node-789"]
}
```

---

## 🔄 Complete Flow

### Creating a Memory:

```javascript
// 1. Create memory node
const response = await fetch('/api/memory-graph/node', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: currentUserId,
    node_id: generateId(), // e.g., crypto.randomUUID()
    title: "JavaScript Closures",
    type: "text",
    content: "A closure is a function that has access to variables from an outer function scope...",
    tags: ["javascript", "programming", "closures"],
    importance: 7
  })
});

const { memory } = await response.json();
console.log('Created memory:', memory.node_id);
```

### Searching Memories:

```javascript
// Semantic search
const response = await fetch('/api/memory-graph/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: currentUserId,
    query: "How do closures work?",
    limit: 5
  })
});

const { results } = await response.json();
results.forEach(mem => {
  console.log(`${mem.title} (${mem.similarity * 100}% match)`);
});
```

### Finding Similar Memories:

```javascript
// Find memories similar to a specific node
const response = await fetch(`/api/memory-graph/node/${nodeId}/similar?limit=5`);
const { results } = await response.json();

console.log('Similar memories:', results);
```

---

## 📊 Storage Strategy

### **PostgreSQL Stores:**
- ✅ Metadata (fast lookups)
- ✅ Short preview (200 chars)
- ✅ Tags, connections, stats
- ✅ File paths for multimedia
- ✅ Access tracking

### **ChromaDB Stores:**
- ✅ Full content text
- ✅ Embeddings (auto-generated)
- ✅ For semantic search only

### **Why This Works:**

| Query Type | Use | Performance |
|------------|-----|-------------|
| Get by ID | PostgreSQL | ⚡ Instant |
| Filter by tag | PostgreSQL | ⚡ Fast |
| Get by type | PostgreSQL | ⚡ Fast |
| Count/Stats | PostgreSQL | ⚡ Fast |
| Semantic search | ChromaDB | 🔍 Excellent |
| Find similar | ChromaDB | 🔍 Excellent |
| Updates | PostgreSQL | ⚡ Fast |
| Connections | PostgreSQL | ⚡ Fast |

---

## 💡 Use Cases

### Use Case 1: Save Learning Note
```javascript
await fetch('/api/memory-graph/node', {
  method: 'POST',
  body: JSON.stringify({
    user_id: userId,
    node_id: generateId(),
    title: "React Hooks Tutorial",
    type: "text",
    content: "useState is a Hook that lets you add state to functional components...",
    tags: ["react", "hooks", "learning"],
    importance: 8
  })
});
```

### Use Case 2: Search Your Memories
```javascript
const response = await fetch('/api/memory-graph/search', {
  method: 'POST',
  body: JSON.stringify({
    user_id: userId,
    query: "What did I learn about React hooks?",
    limit: 5
  })
});
// Returns relevant memories even with different wording
```

### Use Case 3: Connect Related Memories
```javascript
// Link "React Hooks" to "useState Tutorial"
await fetch('/api/memory-graph/node/react-hooks/connect', {
  method: 'POST',
  body: JSON.stringify({
    target_node_id: "usestate-tutorial"
  })
});
```

### Use Case 4: Get Memory Graph
```javascript
// Get all user's memories
const response = await fetch(`/api/memory-graph/user/${userId}/memories?limit=100`);
const { memories } = await response.json();

// Build graph visualization
const nodes = memories.map(m => ({
  id: m.node_id,
  label: m.title,
  type: m.type
}));

const edges = memories.flatMap(m =>
  (m.connections || []).map(targetId => ({
    from: m.node_id,
    to: targetId
  }))
);
```

---

## 🔍 Performance Tips

### Fast Queries (Use PostgreSQL):
```javascript
// Get recent text memories
GET /api/memory-graph/user/{userId}/memories?type=text&limit=20

// Get memories by tag
GET /api/memory-graph/user/{userId}/memories?tags=javascript,react

// Get stats
GET /api/memory-graph/user/{userId}/stats
```

### Semantic Search (Use ChromaDB):
```javascript
// Find memories about a topic
POST /api/memory-graph/search
{ "user_id": "...", "query": "JavaScript async programming" }

// Find similar memories
GET /api/memory-graph/node/{nodeId}/similar
```

---

## ⚡ Quick Test

```bash
# 1. Create memory
curl -X POST http://localhost:3000/api/memory-graph/node \
  -H "Content-Type: application/json" \
  -d '{
    "user_id":"test-user",
    "node_id":"node-001",
    "title":"JavaScript Basics",
    "type":"text",
    "content":"JavaScript is a programming language...",
    "tags":["javascript","basics"]
  }'

# 2. Search memories
curl -X POST http://localhost:3000/api/memory-graph/search \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test-user","query":"JavaScript concepts"}'

# 3. Get user memories
curl http://localhost:3000/api/memory-graph/user/test-user/memories

# 4. Get stats
curl http://localhost:3000/api/memory-graph/user/test-user/stats

# 5. Delete memory
curl -X DELETE http://localhost:3000/api/memory-graph/node/node-001
```

---

## 🗄️ View Data

Run the database viewer:
```bash
node simple-db-viewer.js
```

Open: `http://localhost:3001`

You'll see:
- ✅ All memory nodes
- ✅ Tags, type, preview
- ✅ Connections count
- ✅ Importance ratings
- ✅ Access statistics

---

## 📝 Frontend Integration

### Create Memory:
```javascript
async function createMemory(userId, data) {
  const response = await fetch('/api/memory-graph/node', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      node_id: crypto.randomUUID(),
      title: data.title,
      type: data.type,
      content: data.content,
      tags: data.tags,
      importance: data.importance || 5
    })
  });
  
  return await response.json();
}
```

### Search Memories:
```javascript
async function searchMemories(userId, query) {
  const response = await fetch('/api/memory-graph/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      query: query,
      limit: 10
    })
  });
  
  const { results } = await response.json();
  
  // Display results with similarity scores
  results.forEach(mem => {
    console.log(`${mem.title} - ${(mem.similarity * 100).toFixed(0)}% match`);
  });
  
  return results;
}
```

### Get User's Memory Graph:
```javascript
async function loadMemoryGraph(userId) {
  const response = await fetch(
    `/api/memory-graph/user/${userId}/memories?limit=100`
  );
  
  const { memories, total } = await response.json();
  
  // Build graph data
  const graphData = {
    nodes: memories.map(m => ({
      id: m.node_id,
      label: m.title,
      type: m.type,
      importance: m.importance,
      tags: m.tags
    })),
    edges: memories.flatMap(m =>
      (m.connections || []).map(target => ({
        from: m.node_id,
        to: target
      }))
    )
  };
  
  return graphData;
}
```

### Find Related Memories:
```javascript
async function findRelated(nodeId) {
  const response = await fetch(
    `/api/memory-graph/node/${nodeId}/similar?limit=5`
  );
  
  const { results } = await response.json();
  return results;
}
```

---

## 🎯 Key Features

### ✅ **Fast Filters:**
```javascript
// Get only text memories
GET /user/{userId}/memories?type=text

// Get memories with specific tags
GET /user/{userId}/memories?tags=javascript,react

// Pagination
GET /user/{userId}/memories?limit=20&offset=40
```

### ✅ **Semantic Search:**
```javascript
// Natural language queries
POST /search
{
  "user_id": "...",
  "query": "What did I learn about async programming?"
}

// Finds relevant memories even with different wording
```

### ✅ **Graph Connections:**
```javascript
// Connect related memories
POST /node/{nodeId}/connect
{ "target_node_id": "node-456" }

// Build knowledge graph
```

### ✅ **Importance Tracking:**
```javascript
// Mark important memories (0-10)
"importance": 9  // High priority
"importance": 3  // Low priority

// Filter by importance in frontend
```

---

## 🔧 Environment Variables

```env
# ChromaDB
CHROMA_URL=http://localhost:8000

# PostgreSQL (already configured)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_prototype
DB_USER=postgres
DB_PASSWORD=password
```

---

## ⚡ Performance Comparison

### PostgreSQL Queries (Fast):
```javascript
// Get recent memories - <10ms
GET /user/{userId}/memories?limit=20

// Filter by type - <10ms
GET /user/{userId}/memories?type=text

// Get stats - <50ms
GET /user/{userId}/stats
```

### ChromaDB Queries (Semantic):
```javascript
// Semantic search - ~100-300ms
POST /search
{ "query": "JavaScript concepts" }

// Find similar - ~100-200ms
GET /node/{nodeId}/similar
```

---

## 🎨 Response Formats

All endpoints return:
```json
{
  "success": true | false,
  "error": "Error message if failed",
  // ... data
}
```

**Success responses include data.**
**Error responses include error message.**

---

## ✨ Summary

**Hybrid Storage = Best Performance!**

- 🚀 **PostgreSQL**: Fast filters, stats, connections
- 🔍 **ChromaDB**: Smart search, similarity
- 💾 **Preview in PostgreSQL**: Quick display
- 📝 **Full content in ChromaDB**: Deep search

**Simple, fast, and powerful!** 🎉

