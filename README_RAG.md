# Roo Code Docs RAG - Operational Guide

This document covers the RAG (Retrieval-Augmented Generation) system for the Roo Code documentation site.

## Overview

The RAG system provides an AI-powered chat interface that answers questions about Roo Code using the documentation as context. It consists of:

- **Qdrant** - Vector database for semantic search
- **RAG Backend** - Node.js API for document ingestion and chat
- **Chat Page** - Docusaurus-integrated `/chat` page
- **Nginx** - Reverse proxy with TLS

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (TLS + Reverse Proxy)              │
│  - / → Docusaurus static files                              │
│  - /chat → Docusaurus chat page                             │
│  - /rag/api/* → RAG Backend                                 │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Docusaurus    │ │   RAG Backend   │ │     Qdrant      │
│   Static Files  │ │   (Node.js)     │ │   (Vectors)     │
│                 │ │                 │ │                 │
│   /var/www/     │ │   Port 3001     │ │   Port 6333     │
│   roo-docs/     │ │   (internal)    │ │   (internal)    │
│   build/        │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   LLM Provider  │
                    │   (OpenAI /     │
                    │    Requesty)    │
                    └─────────────────┘
```

## Quick Start (VPS Deployment)

### Prerequisites

- Ubuntu 22.04 or 24.04 VPS with 16GB RAM
- Domain pointed to the server's IP
- SSH access

### Automated Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/Roo-Code-Docs.git /var/www/roo-docs
cd /var/www/roo-docs

# Run setup script (as root or with sudo)
sudo ./ops/scripts/setup_vps.sh
```

### Manual Setup

1. **Install dependencies:**
   ```bash
   apt update && apt upgrade -y
   apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs
   npm install -g pnpm
   ```

2. **Clone and build:**
   ```bash
   git clone <repo-url> /var/www/roo-docs
   cd /var/www/roo-docs
   pnpm install
   pnpm build
   ```

3. **Configure environment:**
   ```bash
   cp rag-backend/.env.example rag-backend/.env
   nano rag-backend/.env  # Add your API keys
   ```

4. **Start services:**
   ```bash
   docker compose up -d
   cd rag-backend && pnpm install && pnpm run ingest:full
   ```

5. **Configure Nginx:**
   ```bash
   cp ops/nginx/roo-rag.conf /etc/nginx/sites-available/roo-rag
   # Edit the config to update domain and paths
   ln -s /etc/nginx/sites-available/roo-rag /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   ```

6. **Setup SSL:**
   ```bash
   certbot --nginx -d yourdomain.tld
   ```

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `LLM_API_KEY` | API key for LLM provider | `sk-...` |
| `EMBED_API_KEY` | API key for embeddings | `sk-...` |
| `ADMIN_REINDEX_TOKEN` | Token for admin endpoints | Random 32+ chars |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible API URL |
| `LLM_MODEL` | `gpt-4o-mini` | Model for chat completion |
| `EMBED_MODEL` | `text-embedding-3-small` | Embeddings model |
| `RETRIEVAL_TOP_K` | `6` | Number of chunks to retrieve |
| `MAX_CONTEXT_TOKENS` | `4000` | Max context window size |

## Common Operations

### Sync and Reindex

```bash
# Incremental (only changed files)
./ops/scripts/sync_and_reindex.sh

# Full rebuild
./ops/scripts/sync_and_reindex.sh --full
```

### Manual Ingestion

```bash
cd rag-backend

# Incremental ingest
pnpm run ingest

# Full rebuild (drops collection and re-ingests)
pnpm run ingest:full
```

### Check Health

```bash
# Basic health check
curl https://yourdomain.tld/rag/api/health

# Detailed health (includes Qdrant stats)
curl https://yourdomain.tld/rag/api/health/detailed
```

### Trigger Reindex via API

```bash
# Incremental
curl -X POST https://yourdomain.tld/rag/api/admin/reindex \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Full
curl -X POST https://yourdomain.tld/rag/api/admin/reindex/full \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### View Logs

```bash
# All services
docker compose logs -f

# Just RAG backend
docker compose logs -f rag-backend

# Sync script logs
tail -f /var/log/roo-rag-sync.log
```

### Restart Services

```bash
# All services
docker compose restart

# Just backend
docker compose restart rag-backend

# Qdrant
docker compose restart qdrant
```

## Automatic Sync (Systemd Timer)

Install the timer for automatic sync every 6 hours:

```bash
cp ops/systemd/roo-rag-sync.service /etc/systemd/system/
cp ops/systemd/roo-rag-sync.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable roo-rag-sync.timer
systemctl start roo-rag-sync.timer

# Verify
systemctl list-timers | grep roo
```

## Troubleshooting

### Backend won't start

1. Check environment variables are set:
   ```bash
   docker compose exec rag-backend env | grep -E "(LLM|EMBED|QDRANT)"
   ```

2. Check Qdrant is accessible:
   ```bash
   docker compose exec rag-backend curl http://qdrant:6333/health
   ```

### Ingestion fails

1. Check API keys are valid
2. Ensure docs directory exists and is readable
3. Check Qdrant has enough storage:
   ```bash
   docker compose exec qdrant du -sh /qdrant/storage
   ```

### Chat returns no results

1. Verify collection has points:
   ```bash
   curl http://localhost:6333/collections/roo-docs
   ```

2. Run a test search:
   ```bash
   # Check ingestion state
   docker compose exec rag-backend cat /app/data/ingestion-state.db
   ```

### High memory usage

1. Reduce `MAX_CONTEXT_TOKENS` in `.env`
2. Lower `RETRIEVAL_TOP_K`
3. Restart backend to clear caches:
   ```bash
   docker compose restart rag-backend
   ```

## Backup & Recovery

### Backup Qdrant

```bash
# Stop qdrant
docker compose stop qdrant

# Backup volume
tar -czvf qdrant-backup-$(date +%Y%m%d).tar.gz \
  /var/lib/docker/volumes/roo-code-docs_qdrant_storage

# Start qdrant
docker compose start qdrant
```

### Backup Ingestion State

```bash
docker compose exec rag-backend cat /app/data/ingestion-state.db > state-backup.db
```

### Full Recovery

If data is lost, simply run a full reindex:
```bash
./ops/scripts/sync_and_reindex.sh --full
```

## Development

### Local Setup

1. Start Qdrant:
   ```bash
   docker run -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant
   ```

2. Configure backend:
   ```bash
   cd rag-backend
   cp .env.example .env
   # Edit .env with your API keys and set QDRANT_URL=http://localhost:6333
   ```

3. Run backend in dev mode:
   ```bash
   pnpm dev
   ```

4. Run Docusaurus:
   ```bash
   cd ..
   pnpm start
   ```

### Testing the Chat

1. Ingest some docs:
   ```bash
   cd rag-backend
   pnpm run ingest
   ```

2. Test the API:
   ```bash
   curl -X POST http://localhost:3001/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "How do I install Roo Code?"}'
   ```

## Security Considerations

- **Qdrant** is not exposed publicly (internal Docker network only)
- **Admin endpoints** require bearer token authentication
- **Rate limiting** is applied to chat endpoints (30 req/min per IP)
- **HTTPS** is enforced via Nginx with HSTS
- **Input validation** uses Zod schemas

## Performance Tips

1. **Embeddings are the bottleneck** - use batch embedding and rate limit appropriately
2. **Chunk size matters** - 400-700 tokens works well for most docs
3. **Reuse conversations** - the `conversationId` reduces redundant context
4. **Cache wisely** - consider Redis for high-traffic deployments

## API Reference

### POST /rag/api/chat

Send a chat message and receive an AI-generated response.

**Request:**
```json
{
  "message": "How do I configure custom modes?",
  "conversationId": "optional-existing-id"
}
```

**Response:**
```json
{
  "answer": "To configure custom modes in Roo Code...",
  "sources": [
    {
      "title": "Custom Modes",
      "url": "https://docs.roocode.com/features/custom-modes",
      "section": "Creating a Custom Mode"
    }
  ],
  "conversationId": "abc123xyz"
}
```

### GET /rag/api/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-08T12:00:00.000Z",
  "services": {
    "api": "ok",
    "qdrant": "ok"
  }
}
```

### POST /rag/api/admin/reindex

Trigger incremental reindex (requires auth).

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

### POST /rag/api/admin/reindex/full

Trigger full reindex (requires auth).
