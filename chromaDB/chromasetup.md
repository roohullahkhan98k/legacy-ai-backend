# ChromaDB Setup Guide

## Quick Start

### 1. Start Docker Desktop
- Open Docker Desktop application on your Windows machine
- Wait for it to fully start (Docker icon in system tray should be green)

### 2. Start ChromaDB
```bash
# Navigate to chromaDB directory
cd chromaDB

# Start ChromaDB container
docker compose up -d
```

### 3. Verify ChromaDB is Running
```bash
# Check if container is running
docker ps

# Test ChromaDB connection (container should be running)
# Note: API endpoints may vary by version
```

## ChromaDB Configuration

- **URL**: `http://localhost:8000`
- **Port**: `8000`
- **Data Storage**: `./data` (persistent volume)
- **Container Name**: `chroma-db`

## Environment Variables

The ChromaDB container is configured with:
- `CHROMA_SERVER_HOST=0.0.0.0`
- `CHROMA_SERVER_HTTP_PORT=8000`
- `ANONYMIZED_TELEMETRY=FALSE`

## Useful Commands

```bash
# Start ChromaDB
docker compose up -d

# Stop ChromaDB
docker compose down

# View logs
docker compose logs -f

# Restart ChromaDB
docker compose restart
```

## Integration with Backend

Your backend is already configured to connect to ChromaDB at `http://localhost:8000`. The ChromaDB routes are mounted at `/api/chroma`.

## Troubleshooting

**Docker not running?**
- Start Docker Desktop first
- Wait for it to fully initialize

**Port 8000 already in use?**
- Change the port in `docker-compose.yml`
- Update backend configuration accordingly

**Container won't start?**
- Check Docker Desktop is running
- Try: `docker compose down && docker compose up -d`
