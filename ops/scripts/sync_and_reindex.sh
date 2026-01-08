#!/bin/bash
#
# sync_and_reindex.sh
# Syncs docs from upstream, rebuilds Docusaurus, and triggers reindexing
#
# Usage:
#   ./ops/scripts/sync_and_reindex.sh [--full]
#
# Options:
#   --full    Force full reindex instead of incremental
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="/var/log/roo-rag-sync.log"
UPSTREAM_REMOTE="upstream"
UPSTREAM_BRANCH="main"
LOCAL_BRANCH="main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "${BLUE}$*${NC}"; }
log_success() { log "SUCCESS" "${GREEN}$*${NC}"; }
log_warn() { log "WARN" "${YELLOW}$*${NC}"; }
log_error() { log "ERROR" "${RED}$*${NC}"; }

# Parse arguments
FULL_REINDEX=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --full|-f)
            FULL_REINDEX=true
            shift
            ;;
        *)
            log_error "Unknown argument: $1"
            exit 1
            ;;
    esac
done

cd "$PROJECT_ROOT"

log_info "=========================================="
log_info "Starting sync and reindex process"
log_info "=========================================="

# Check if upstream remote exists
if ! git remote get-url "$UPSTREAM_REMOTE" &>/dev/null; then
    log_warn "Upstream remote not found. Setting it up..."
    log_info "Please add upstream manually:"
    log_info "  git remote add upstream <original-roo-docs-repo-url>"
    # For now, just skip upstream sync
    SKIP_UPSTREAM=true
else
    SKIP_UPSTREAM=false
fi

# Capture current HEAD before any changes
BEFORE_SHA=$(git rev-parse HEAD)

# Fetch from upstream (if configured)
if [ "$SKIP_UPSTREAM" = false ]; then
    log_info "Fetching from upstream..."
    git fetch "$UPSTREAM_REMOTE" || {
        log_warn "Failed to fetch upstream, continuing with local changes only"
        SKIP_UPSTREAM=true
    }
fi

# Merge upstream changes (if configured)
DOCS_CHANGED=false
if [ "$SKIP_UPSTREAM" = false ]; then
    log_info "Merging upstream/${UPSTREAM_BRANCH}..."
    
    # Try to merge, handle conflicts gracefully
    if git merge "$UPSTREAM_REMOTE/$UPSTREAM_BRANCH" --no-edit; then
        AFTER_SHA=$(git rev-parse HEAD)
        
        # Check if docs changed
        if [ "$BEFORE_SHA" != "$AFTER_SHA" ]; then
            CHANGED_FILES=$(git diff --name-only "$BEFORE_SHA" "$AFTER_SHA" -- docs/ 2>/dev/null || echo "")
            if [ -n "$CHANGED_FILES" ]; then
                DOCS_CHANGED=true
                log_info "Docs changed:"
                echo "$CHANGED_FILES" | head -20
                CHANGE_COUNT=$(echo "$CHANGED_FILES" | wc -l)
                if [ "$CHANGE_COUNT" -gt 20 ]; then
                    log_info "... and $((CHANGE_COUNT - 20)) more files"
                fi
            fi
        fi
    else
        log_error "Merge conflict detected. Please resolve manually."
        git merge --abort
        exit 1
    fi
fi

# Check if we should proceed with rebuild
if [ "$FULL_REINDEX" = true ]; then
    log_info "Full reindex requested, proceeding..."
elif [ "$DOCS_CHANGED" = true ]; then
    log_info "Docs changed, proceeding with rebuild..."
else
    log_success "No docs changes detected, nothing to do."
    exit 0
fi

# Install dependencies if lockfile changed
if git diff --name-only "$BEFORE_SHA" HEAD -- pnpm-lock.yaml &>/dev/null; then
    log_info "Lockfile changed, installing dependencies..."
    pnpm install --frozen-lockfile || {
        log_error "Failed to install dependencies"
        exit 1
    }
fi

# Rebuild Docusaurus
log_info "Building Docusaurus site..."
pnpm build || {
    log_error "Docusaurus build failed"
    exit 1
}
log_success "Docusaurus build complete"

# Run ingestion
log_info "Running document ingestion..."
cd "$PROJECT_ROOT/rag-backend"

if [ "$FULL_REINDEX" = true ]; then
    pnpm run ingest:full || {
        log_error "Full ingestion failed"
        exit 1
    }
else
    pnpm run ingest || {
        log_error "Incremental ingestion failed"
        exit 1
    }
fi
log_success "Ingestion complete"

cd "$PROJECT_ROOT"

# Restart backend container to clear any in-memory caches
log_info "Restarting RAG backend..."
docker compose restart rag-backend || {
    log_warn "Failed to restart backend container (might not be running)"
}

log_success "=========================================="
log_success "Sync and reindex completed successfully!"
log_success "=========================================="
