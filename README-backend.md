### ChromaDB Setup (Docker) – Quick Guide

This guide shows how to start ChromaDB locally with Docker and verify connectivity from the Node backend. It also documents environment variables for embeddings.

#### Prerequisites
- Docker Desktop installed and running
- Node.js 18+ and npm
- PowerShell (Windows) or a shell (macOS/Linux)

#### 1) Start ChromaDB (Docker)
From the Node backend root (the folder that contains `package.json`):

```powershell
npm run chroma:up

```

This runs `docker compose up -d` in `chromaDB` and exposes Chroma on `http://localhost:8000` with data persisted under `chromaDB/data`.

Alternative (without npm script):
```powershell
cd chromaDB
docker compose up -d
```

Stop Chroma:
```powershell
npm run chroma:down


 chroma:
    image: ghcr.io/chroma-core/chroma:latest
```

#### 2) Verify Chroma is running
Windows (PowerShell):
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v2/heartbeat"
```
macOS/Linux:
```bash
curl http://localhost:8000/api/v2/heartbeat
```

Expected: a small OK/heartbeat response.

Logs (if needed):
```powershell
docker logs chroma-db --tail 200
```

#### 3) Configure environment for the backend
Create a `.env` file in the backend root (same folder as `server.js`):

```
# Server
PORT=3000
CHROMA_HOST=http://localhost:8000

## Embeddings Behavior

The app now supports selecting the embeddings provider explicitly via the environment variable `EMBEDDINGS_PROVIDER`. This replaces the old `CHROMA_USE_DEFAULT_EMBED` logic.  

### Environment Variables

- **EMBEDDINGS_PROVIDER** (required)  
  - `local` → Use local embeddings with Xenova/all-MiniLM-L6-v2 (384-dim, normalized)  
  - `openai` → Use OpenAI embeddings via the API key  
  - Default: `local`

- **OPENAI_API_KEY** (required only if `EMBEDDINGS_PROVIDER=openai`)  
- **OPENAI_EMBED_MODEL** (optional)  
  - Defaults to `text-embedding-3-small`  

- **LOCAL_EMBED_MODEL** (optional)  
  - Defaults to `Xenova/all-MiniLM-L6-v2`  

- **MEMORY_COLLECTION**  
  - Default Chroma collection name: `memory-graph-v4`

### Notes

- The frontend does **not** make external API calls for embeddings; all embedding generation is handled server-side.  
- To switch embeddings, change `EMBEDDINGS_PROVIDER` in your `.env` file and restart the backend.  
- **Remove all API keys from version control**. Only `.env.example` should remain in the repo without real keys.  

Example `.env` snippet:

```env
# Choose embeddings provider: local | openai
EMBEDDINGS_PROVIDER=local

# OpenAI settings (if using OpenAI embeddings)
OPENAI_API_KEY=
OPENAI_EMBED_MODEL=text-embedding-3-small

# Local (Xenova) model
LOCAL_EMBED_MODEL=Xenova/all-MiniLM-L6-v2

# Default collection name
MEMORY_COLLECTION=memory-graph-v4
```

 
#### 4) Start the backend
From the backend root:
```powershell
npm install
node server.js
```

#### 5) Health checks
- Backend health:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health"
```

- Backend → Chroma config:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/chroma/config"
```

- Backend → Chroma connectivity:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/chroma/health"
```

- Chroma direct heartbeat:
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v2/heartbeat"
```

#### 6) Optional: Ensure a collection exists
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/chroma/collections/memory-graph/ensure" `
  -Method POST `
  -Body (@{ metadata = @{ owner = "local" } } | ConvertTo-Json) `
  -ContentType "application/json"
```

#### Troubleshooting
- 503 from `/api/chroma/health`:
  - Make sure Docker is running and Chroma is up (`docker ps`, heartbeat call).
  - Ensure `CHROMA_HOST` matches Chroma (`http://localhost:8000`).
- Port conflicts on 8000: stop the conflicting process or change the host port mapping in `docker-compose.yml`.
- Clear and recreate the Chroma container if needed:
```powershell
cd chromaDB
docker compose down
# (optional) back up or remove the ./data directory
docker compose up -d
```
