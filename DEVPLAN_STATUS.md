# Roo Code Docs RAG - Development Plan (Updated)

## HANDOFF (Circular Development)
**Last updated:** 2026-01-08 (America/Montreal)  
**Current status:** ✅ Phases 1-5 COMPLETE - Core implementation done, ready for deployment.

### What was just accomplished
- ✅ **Phase 1.2:** Created docker-compose.yml with Qdrant, RAG backend, Redis (optional)
- ✅ **Phase 1.3:** Created Nginx reverse proxy configuration with TLS, rate limiting
- ✅ **Phase 2.1-2.6:** Complete RAG backend with:
  - Express server with health endpoints
  - Document reader for markdown/mdx
  - Structure-aware chunker (headers as boundaries)
  - Batch embedder with retry logic
  - SQLite-based state store for incremental updates
  - Full ingestion pipeline (incremental + full rebuild)
- ✅ **Phase 3:** Chat API with retrieval, LLM generation, and citations
- ✅ **Phase 4:** Docusaurus /chat page with navbar button
- ✅ **Phase 5:** Sync/reindex scripts with systemd timer automation
- ✅ Created README_RAG.md operational documentation

### Files Created

**Infrastructure:**
- `docker-compose.yml` - Docker services (Qdrant, RAG backend, Redis)
- `ops/nginx/roo-rag.conf` - Nginx reverse proxy with TLS, rate limiting
- `ops/scripts/sync_and_reindex.sh` - Sync and reindex automation
- `ops/scripts/setup_vps.sh` - VPS initial setup script
- `ops/systemd/roo-rag-sync.service` - Systemd service unit
- `ops/systemd/roo-rag-sync.timer` - Systemd timer (every 6 hours)

**RAG Backend (`rag-backend/`):**
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `Dockerfile` - Production container build
- `.env.example` - Environment variable template
- `src/index.ts` - Express server entry point
- `src/config/env.ts` - Environment validation with Zod
- `src/config/logger.ts` - Pino logging setup
- `src/services/qdrant.ts` - Qdrant vector database client
- `src/services/llm.ts` - LLM and embeddings client (OpenAI-compatible)
- `src/ingestion/document-reader.ts` - Markdown/MDX file reader
- `src/ingestion/chunker.ts` - Structure-aware text chunking
- `src/ingestion/embedder.ts` - Batch embedding with retry
- `src/ingestion/state-store.ts` - SQLite state tracking
- `src/ingestion/ingest.ts` - Ingestion orchestration
- `src/routes/chat.ts` - Chat API endpoint
- `src/routes/health.ts` - Health check endpoints
- `src/routes/admin.ts` - Admin reindex endpoints
- `src/cli/ingest.ts` - CLI for manual ingestion

**Docusaurus Frontend:**
- `src/pages/chat.tsx` - Chat page component
- `src/components/RagChat/RagChat.tsx` - Chat UI component
- `src/components/RagChat/RagChat.module.css` - Styles
- `src/components/RagChat/index.ts` - Export
- Updated `docusaurus.config.ts` - Added Chat navbar button

**Documentation:**
- `README_RAG.md` - Complete operational guide

### Blockers / Risks
- **API Keys required:** Must configure `LLM_API_KEY` and `EMBED_API_KEY` before deployment
- **Domain setup:** Nginx config uses placeholder `yourdomain.tld` - update before deploying
- **Upstream remote:** Need to add `git remote add upstream <url>` for auto-sync feature

### Next step (for the next agent)
1. **Test locally:** Start Qdrant via Docker, run backend in dev mode, test ingestion
2. **Deploy to VPS:** Run `ops/scripts/setup_vps.sh` on target server
3. **Configure .env:** Add API keys to `rag-backend/.env`
4. **Phase 6 (optional):** Discord bot implementation
5. **Phase 7:** Add monitoring, alerting, and backup automation

### Key Commands

```bash
# Local development
cd rag-backend
cp .env.example .env  # Edit with your API keys
pnpm install
pnpm dev              # Start backend in dev mode

# Run Qdrant locally
docker run -p 6333:6333 qdrant/qdrant

# Ingest documents
pnpm run ingest       # Incremental
pnpm run ingest:full  # Full rebuild

# Production deployment
docker compose up -d
./ops/scripts/sync_and_reindex.sh
```

---

## Implementation Summary

### Phase 1: VPS Infrastructure ✅
- [x] docker-compose.yml with Qdrant, RAG backend, optional Redis
- [x] Nginx reverse proxy configuration
- [x] Health check endpoints
- [x] Internal Docker network (Qdrant not exposed publicly)

### Phase 2: RAG Backend ✅
- [x] Node.js/TypeScript project with Express
- [x] Environment validation with Zod
- [x] Qdrant collection management
- [x] Document reader (markdown/mdx)
- [x] Structure-aware chunking
- [x] Batch embeddings with retry
- [x] SQLite state store
- [x] Incremental and full ingestion

### Phase 3: Retrieval + Answering API ✅
- [x] Vector similarity search
- [x] Context assembly with token limits
- [x] LLM generation with citations
- [x] POST /api/chat endpoint
- [x] Rate limiting
- [x] Input validation

### Phase 4: Docusaurus Chat Page ✅
- [x] /chat page with full UI
- [x] Navbar button added
- [x] Session persistence
- [x] Source citations display
- [x] Light/dark theme support

### Phase 5: Sync + Reindex ✅
- [x] sync_and_reindex.sh script
- [x] Systemd timer for automation
- [x] Admin reindex endpoints
- [x] Cache invalidation support

### Phase 6: Discord Bot (Not Started)
- [ ] discord-bot/ project
- [ ] /ask command
- [ ] Docker integration

### Phase 7: Monitoring (Not Started)
- [ ] Metrics collection
- [ ] Alerting
- [ ] Backup automation

---

## Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                 Nginx (TLS + Rate Limiting)             │
│  - / → Docusaurus build/                                │
│  - /chat → Docusaurus chat page                         │
│  - /rag/api/* → RAG Backend (proxy)                     │
└─────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐ ┌─────────────────┐ ┌─────────────┐
│  Docusaurus │ │   RAG Backend   │ │   Qdrant    │
│   Static    │ │  (Express/TS)   │ │  (Vectors)  │
│   Build     │ │   Port 3001     │ │  Port 6333  │
└─────────────┘ └─────────────────┘ └─────────────┘
                         │
                         ▼
              ┌─────────────────┐
              │  LLM Provider   │
              │ (OpenAI/Requesty)│
              └─────────────────┘
```

---

## API Reference

### POST /rag/api/chat
```json
// Request
{ "message": "How do I install Roo Code?", "conversationId": "optional" }

// Response
{
  "answer": "To install Roo Code...",
  "sources": [{ "title": "Installing", "url": "/getting-started/installing" }],
  "conversationId": "abc123"
}
```

### GET /rag/api/health
```json
{ "status": "healthy", "services": { "api": "ok", "qdrant": "ok" } }
```

### POST /rag/api/admin/reindex
Requires `Authorization: Bearer <ADMIN_REINDEX_TOKEN>`

### POST /rag/api/admin/reindex/full
Full rebuild - requires admin auth
