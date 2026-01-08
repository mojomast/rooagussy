# Roo Code Docs RAG (VPS + Docusaurus Chat Page) - Implementation Plan

## HANDOFF (Circular Development)
**Last updated:** 2026-01-08 (America/Montreal)  
**Current status:** Fork created, ready for Phase 1.

### What was just accomplished
- Created fork at `github.com/mojomast/rooagussy`
- Set up git remotes:
  - `origin` → `github.com/mojomast/rooagussy` (your fork)
  - `upstream` → `github.com/RooCodeInc/Roo-Code-Docs` (original)
- Pushed main branch to fork
- Copied devplan.md into repo

### Blockers / Risks
- **Requesty compatibility:** confirm Requesty can be used as an OpenAI-compatible base URL for both **chat** and **embeddings** (or decide which calls go direct vs Requesty).
- **VPS not provisioned yet** - need a 16GB Ubuntu VPS before deployment.

### Next step (for the next agent)
- **Phase 0:** Make decisions on provider routing and URL structure (or skip if defaults are fine).
- **Phase 1.2:** Create `docker-compose.yml` with Qdrant + rag-backend services.
- Start at Phase 1.2 (skip 1.1 VPS provisioning until needed).

### Where to write progress updates
- Update this **HANDOFF** block first.
- Then tick checkboxes in the phase you completed.
- Keep a short “Notes / Decisions” log under each phase so the next agent inherits context cleanly.

---

## Goals (what “done” looks like)
1. A **RAG backend API** that answers questions about Roo Code docs with citations.
2. A **Docusaurus-integrated chat page** (not a floating widget) reachable via a **navbar button** (e.g., “Chat”).
3. Everything possible runs on a **single VPS (16GB RAM)**:
   - Docusaurus site (served by Nginx)
   - RAG backend (Node/TS)
   - Qdrant (self-hosted)
   - Optional: Discord bot, Redis (only if needed)
4. A reliable mechanism to:
   - **Pull upstream doc changes** from GitHub
   - **Rebuild indexes/caches** (incremental by default, full rebuild available)
   - Redeploy the Docusaurus build

---

## Architecture (high level)
- **Docusaurus** serves the docs site and a `/chat` page.
- `/rag/api/*` is reverse proxied by **Nginx** to the RAG backend.
- RAG backend uses:
  - **Qdrant** for vector search
  - **Requesty** (preferred) for LLM + embeddings, or direct provider calls if needed
- Reindexing is triggered by:
  - Manual script (SSH)
  - Scheduled cron/systemd timer
  - Optional GitHub Action webhook hitting an authenticated admin endpoint

---

## Repo Strategy (recommended)
### Option A (recommended): Fork Roo Code docs repo + add services
- You fork the Roo Code docs repo into your own GitHub org/user.
- Add `rag-backend/`, `discord-bot/`, `shared/`, `ops/` to the fork.
- Add `upstream` remote pointing at the original Roo Code docs repo.
- Sync updates via `git fetch upstream && git merge upstream/main` (or rebase).

### Option B: Separate “ragussy” repo containing docs as a submodule
- More moving parts, more friction to modify Docusaurus pages.
- Only choose this if you strongly want to keep your additions separate.

This plan assumes **Option A**.

---

## Project Structure (Option A)
Repository root (forked docs repo):
roo-code-docs-rag/
├── docs/ # Docusaurus docs content (existing)
├── src/
│ ├── pages/
│ │ └── chat.tsx # NEW: Chat page route (/chat)
│ └── components/
│ └── RagChat/ # NEW: Chat UI components
├── rag-backend/ # NEW: RAG API service
├── discord-bot/ # NEW (optional): Discord bot
├── shared/ # NEW: shared types + API client
├── ops/
│ ├── nginx/ # Nginx site configs
│ ├── scripts/ # sync + reindex scripts
│ └── systemd/ # service units (optional, if not pure docker)
├── docker-compose.yml # VPS deployment
└── README_RAG.md # Operational notes for VPS

markdown
Copy code

---

## Operational Constraints (VPS 16GB)
- Prefer **Docker Compose** for qdrant + rag-backend (+ optional redis + discord-bot).
- Prefer **Nginx on host** (or in docker) as the single public entrypoint with TLS.
- Avoid heavy “always-on” watchers. Use:
  - Incremental ingestion keyed by git commit hash / file mtime + content hash
  - Scheduled sync (timer/cron) or webhook-triggered sync

---

## Phase 0: Decisions + Baselines
**Deliverable:** confirmed provider routing (Requesty), confirmed sync strategy (fork), and locked env var names.

- [ ] Decide: Requesty for **chat** + **embeddings** (preferred), or hybrid.
- [ ] Decide: upstream branch name (usually `main`).
- [ ] Decide: URL structure:
  - Docs site: `https://yourdomain.tld/`
  - Chat page: `https://yourdomain.tld/chat`
  - API: `https://yourdomain.tld/rag/api`
- [ ] Confirm model choices:
  - Embeddings: `text-embedding-3-small` (1536 dims) OR Requesty equivalent
  - Chat: pick one strong default, allow override via env

**Notes / Decisions**
- (agent updates)

---

## Phase 1: VPS Infrastructure (16GB)
**Deliverable:** working deployment skeleton with health checks and reverse proxy.

### 1.1 VPS prerequisites
- [ ] Provision VPS (Ubuntu 22.04 or 24.04 recommended), 16GB RAM
- [ ] Install: Docker + Docker Compose plugin
- [ ] Install: Nginx (if running Nginx on host)
- [ ] Configure firewall: allow 80/443 only
- [ ] TLS via Let’s Encrypt (certbot) or your preferred method

### 1.2 docker-compose baseline
Create `docker-compose.yml` at repo root:
- Services:
  - `qdrant` (official image)
  - `rag-backend` (Node 20)
  - Optional: `redis` (only if needed)
  - Optional: `discord-bot`

**Guidelines for 16GB:**
- Qdrant: keep persistent volume, avoid exposing it publicly
- rag-backend: set Node memory limit if needed (`--max-old-space-size`)
- Use compose `restart: unless-stopped`

- [ ] Add `qdrant` volume for storage
- [ ] Add `rag-backend` env file wiring
- [ ] Add internal docker network so qdrant is not public

### 1.3 Nginx reverse proxy routes
- [ ] Route `/` -> Docusaurus static files (from `build/` directory)
- [ ] Route `/rag/api/` -> `rag-backend:3001/api/` (same-origin, avoids CORS pain)
- [ ] Add `/rag/health` -> backend health endpoint (optional convenience)

**Example routing intent (not final config):**
- `/chat` served by Docusaurus page
- `/rag/api/chat` proxied to backend `POST /api/chat`

### 1.4 Health checks
- [ ] `GET /rag/api/health` returns OK
- [ ] Qdrant reachable from backend on docker network
- [ ] Docs site loads + navbar renders

**Notes / Decisions**
- (agent updates)

---

## Phase 2: RAG Backend Service (Node/TypeScript)
**Deliverable:** a working API that can ingest docs, retrieve, and answer with citations.

### 2.1 Initialize backend
Directory: `rag-backend/`
- [ ] Node.js/TypeScript project setup
- [ ] Dependencies:
  - `langchain`, `@langchain/openai` (or equivalent if using Requesty OpenAI-compatible)
  - `@qdrant/js-client-rest` (or `@qdrant/js-client`)
  - `express`, `cors`, `zod`, `dotenv`
  - Logging: `pino` or `winston`
- [ ] Dev deps: `typescript`, `tsx`, `@types/*`

### 2.2 Configuration & env contract
Create `rag-backend/.env.example`:
- `PORT=3001`
- `QDRANT_URL=http://qdrant:6333`
- `QDRANT_API_KEY=` (optional, if enabled)
- `VECTOR_DIM=1536`
- `DOCS_ROOT=../` (point to repo root, or explicit)
- `DOCS_CONTENT_PATH=docs` (or wherever markdown lives)
- `PUBLIC_DOCS_BASE_URL=https://yourdomain.tld/` (for citations)
- `REQUESTY_BASE_URL=` (if OpenAI-compatible proxy)
- `REQUESTY_API_KEY=`
- `LLM_MODEL=`
- `EMBED_MODEL=`
- `ADMIN_REINDEX_TOKEN=` (required for admin endpoints)
- `MAX_CONTEXT_TOKENS=4000`

**Rule:** backend must start and fail fast if required env vars missing.

### 2.3 Vector DB: Qdrant collection
- [ ] Collection name: `roo-docs`
- [ ] Vector size: 1536 (or configured)
- [ ] Distance: cosine
- [ ] Payload indexes for metadata fields used in filtering

### 2.4 Ingestion pipeline (docs -> chunks -> embeddings -> qdrant)
Implement:
- `src/ingestion/document-reader.ts`
  - Recursively read markdown/mdx from Docusaurus docs content
  - Extract frontmatter (title, sidebar position, tags if present)
  - Capture hierarchy (directory + headings)
- `src/ingestion/chunker.ts`
  - Structure-aware chunking (headers as boundaries)
  - Target: 400 to 700 tokens, 10 to 20% overlap
  - Store metadata:
    - `source_file` (relative path)
    - `section_title`
    - `doc_slug` / `url_path`
    - `last_modified`
    - `content_hash` (important for incremental updates)
    - `git_commit` (optional but very useful)
- `src/ingestion/embedder.ts`
  - Batch embeddings
  - Retry with backoff
  - Provider abstraction:
    - “OpenAI-compatible client” pointed at Requesty base URL, if supported
- `src/ingestion/upsert.ts`
  - Use stable IDs per chunk:
    - `chunk_id = sha256(source_file + section_title + chunk_index + content_hash_prefix)`
  - On update: upsert changed chunk IDs
  - On delete: remove chunks whose `source_file` no longer exists (requires state tracking)

### 2.5 Ingestion state tracking (required for real incremental updates)
Pick one:
- **SQLite** inside backend container volume (simple, reliable)
- Or a JSON state file on disk (fine, but less robust)

State should store:
- file path
- last seen content hash
- chunk IDs generated last run

- [ ] Add `src/ingestion/state-store.ts` (SQLite recommended)

### 2.6 CLI scripts
- [ ] `pnpm run ingest`:
  - Performs incremental ingest
- [ ] `pnpm run ingest:full`:
  - Drops and recreates collection (or deletes all points) then ingests
- [ ] Progress logs:
  - files scanned, chunks generated, chunks upserted, chunks deleted

**Notes / Decisions**
- (agent updates)

---

## Phase 3: Retrieval + Answering API
**Deliverable:** `/rag/api/chat` answers with citations linking into the docs site.

### 3.1 Retrieval
- [ ] Qdrant similarity search top-k (default 5 to 8)
- [ ] Optional metadata filters:
  - prefer “getting-started”, “providers”, “features” directories
- [ ] Optional lightweight rerank:
  - start simple: sort by similarity, then boost recency slightly

### 3.2 Context builder
- [ ] Assemble context up to token limit
- [ ] Include citations:
  - Title + URL + snippet reference
- [ ] Keep context stable and readable (LLMs behave better)

### 3.3 LLM service
- [ ] OpenAI-compatible chat client (via Requesty if possible)
- [ ] System prompt requirements:
  - answer ONLY from provided context
  - cite sources
  - if missing, say so and suggest where to look
- [ ] Streaming responses (nice-to-have, not mandatory day 1)
- [ ] Conversation memory: last N messages (store in-memory per conversationId or client-side)

### 3.4 API routes
Mount under `/api` internally, exposed as `/rag/api` via Nginx:
- [ ] `GET /api/health`
- [ ] `POST /api/chat`
  - Request: `{ message: string, conversationId?: string }`
  - Response: `{ answer: string, sources: Array<{ title: string, url: string }>, conversationId: string }`

Security:
- [ ] Rate limiting (basic IP-based)
- [ ] Input validation (zod)

**Notes / Decisions**
- (agent updates)

---

## Phase 4: Docusaurus Chat Page (Navbar Button + Page)
**Deliverable:** A first-class page at `/chat` with a navbar link.

### 4.1 UI approach
This plan explicitly uses a **page**, not a floating widget.
- [ ] Create `src/pages/chat.tsx` (or `src/pages/chat/index.tsx`)
- [ ] Add a navbar button in `docusaurus.config.*`:
  - label: `Chat`
  - to: `/chat`
  - position: right

### 4.2 Chat components
Create `src/components/RagChat/`:
- [ ] `RagChat.tsx`:
  - message list (user/assistant)
  - input box + send button
  - loading indicator
  - error state + retry
  - citations rendered as links
- [ ] `api.ts`:
  - calls `/rag/api/chat` (same-origin)
  - supports streaming later if backend supports it
- [ ] Session persistence:
  - store conversationId + messages in `sessionStorage`

### 4.3 Theme integration
- [ ] Use Docusaurus theme variables so it looks native in light/dark
- [ ] Accessibility:
  - ARIA labels
  - keyboard focus
  - readable contrast

**Notes / Decisions**
- (agent updates)

---

## Phase 5: Docs Sync + Cache/Index Rebuild (Required)
**Deliverable:** one command (and optional automation) that safely syncs upstream docs and reindexes.

### 5.1 Upstream sync (fork workflow)
On the VPS, in repo root:
- Add upstream:
  - `git remote add upstream <original-roo-docs-repo-url>`
- Sync script will:
  1) `git fetch upstream`
  2) `git checkout main`
  3) `git merge upstream/main` (or `rebase`, your call)
  4) `pnpm install` (if lockfile changed)
  5) rebuild docs site
  6) reindex

### 5.2 Reindex script (single entrypoint)
Create `ops/scripts/sync_and_reindex.sh`:
- Steps:
  - `git fetch upstream`
  - `git merge upstream/main` (or pull from your origin if you mirror upstream elsewhere)
  - Detect whether docs content changed:
    - `git diff --name-only HEAD@{1} HEAD -- docs/`
  - If docs changed:
    - call backend `ingest` (incremental)
    - clear caches (see 5.3)
    - rebuild Docusaurus `pnpm build`
    - reload nginx (if needed)
  - If no docs changed:
    - exit cleanly

- [ ] Script is idempotent
- [ ] Script logs what it did (and why)

### 5.3 Cache invalidation
If you implement caching (in-memory, Redis, etc.), you must invalidate on updates:
- [ ] Provide backend admin endpoint:
  - `POST /api/admin/invalidate-cache`
  - Auth: `Authorization: Bearer $ADMIN_REINDEX_TOKEN`
- [ ] Or invalidate by restarting backend container (simple and often enough)

### 5.4 Automation triggers (choose at least one)
**A) systemd timer / cron (recommended simplest)**
- [ ] Run every 6 hours (or daily) off-peak
- [ ] Logs to `/var/log/roo-rag-sync.log`

**B) GitHub Actions -> Webhook trigger**
- [ ] GitHub Action on upstream sync repo (your fork) calls:
  - `POST https://yourdomain.tld/rag/api/admin/reindex` with token
- [ ] Backend runs ingestion job in background and returns job status

**C) Manual**
- [ ] You can always SSH and run `sync_and_reindex.sh`

**Notes / Decisions**
- (agent updates)

---

## Phase 6: Discord Bot (Optional, fits on VPS)
**Deliverable:** `/ask` command in Discord that hits the same backend.

- [ ] `discord-bot/` TS project
- [ ] Shared API client in `shared/`
- [ ] Command `/ask question:<string>`
- [ ] Responses include citations and links
- [ ] Deploy as container in compose (no inbound ports)

---

## Phase 7: Monitoring, Logging, Backups
**Deliverable:** you can tell if it’s broken before users do.

- [ ] Structured logs (pino/winston)
- [ ] Basic metrics:
  - request latency
  - Qdrant search time
  - LLM time
  - ingest duration
- [ ] Backups:
  - Qdrant volume snapshots (periodic)
  - SQLite ingestion state backup (if used)
- [ ] Alerting (optional):
  - uptime ping from an external service

---

## Phase 8: Optimization (only after it works)
- [ ] Hybrid retrieval (keyword + vector) if needed
- [ ] Better reranking (lightweight cross-encoder or LLM rerank, if cost allows)
- [ ] Smarter chunking for MDX, code blocks, tables
- [ ] Redis caching if traffic justifies it

---

## Acceptance Checklist (definition of “ready”)
- [ ] `/chat` page exists and is linked in navbar
- [ ] Asking a question returns an answer with at least 2 citations when available
- [ ] `/rag/api/health` is OK
- [ ] `sync_and_reindex.sh` successfully:
  - pulls upstream docs
  - rebuilds docs site
  - runs incremental ingest
  - invalidates cache or restarts backend
- [ ] Full rebuild command works (`ingest:full`)
- [ ] No public exposure of Qdrant port
- [ ] Admin endpoints require token

---

## Agent Instructions (how Opus 4.5 should run this project)
### Rules for circular development
1. **Always edit this file first**:
   - Update the **HANDOFF** block at the top with:
     - what you just finished
     - blockers
     - the next concrete step and where to find it
2. **Work in small verifiable slices**:
   - After each slice, run a quick test (health endpoint, ingest dry run, etc.)
3. **Leave a clean baton**:
   - If you stop mid-phase, write:
     - exact command you ran
     - exact error output (if any)
     - file paths touched
4. **Do not “plan forever”**:
   - Prefer building Phase 1 skeleton early, then iterate.

### Recommended execution order (first session)
1) Phase 1.2 docker-compose baseline  
2) Phase 1.3 Nginx reverse proxy  
3) Phase 2.1 backend skeleton + /health  
4) Phase 4.1 Docusaurus `/chat` page + navbar  
5) Phase 2.4 ingest pipeline minimal (one doc file)  
6) Phase 5 sync + reindex script

---

## Appendix: Minimal “Day 1” scope (if time is tight)
- Qdrant running
- Backend returns canned response + citations stub
- Chat page sends message + renders response
- Ingestion script supports full rebuild only (incremental can come next)
- Sync script just does: pull upstream -> full rebuild -> rebuild docusaurus