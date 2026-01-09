#!/bin/bash

# Roo Code RAG System Startup Script
# This script manages the entire RAG system (backend + Discord bot) on VPS

set -e  # Exit on any error

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
LOG_DIR="$PROJECT_DIR/logs"
PID_FILE="$PROJECT_DIR/.startup.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create log directory
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_DIR/startup.log"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2 | tee -a "$LOG_DIR/startup.log"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_DIR/startup.log"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_DIR/startup.log"
}

# Check if Docker and Docker Compose are available
check_dependencies() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not available"
        exit 1
    fi

    log "Dependencies check passed"
}

# Check if services are already running
check_running() {
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        warn "Some services appear to be running. Use './start.sh stop' to stop them first."
        return 1
    fi
    return 0
}

# Start the RAG system
start_system() {
    log "Starting Roo Code RAG System..."

    # Check if already running
    if ! check_running; then
        read -p "Services appear to be running. Stop them first? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            stop_system
        else
            exit 1
        fi
    fi

    # Check if nginx profile is being used and build frontend if needed
    if [[ "$*" == *"--profile with-nginx"* ]] || [[ "$*" == *"with-nginx"* ]]; then
        info "Nginx profile detected, building Docusaurus frontend..."
        if ! pnpm build; then
            error "Failed to build Docusaurus frontend"
            exit 1
        fi
        log "Docusaurus build completed"
    fi

    # Start services
    info "Starting services..."
    if docker-compose -f "$COMPOSE_FILE" "$@" up -d; then
        log "Services started successfully!"

        # Save PID for potential cleanup
        echo $$ > "$PID_FILE"

        # Wait a moment for services to initialize
        sleep 5

        # Show status
        show_status

        log "RAG system is now running in the background!"
        log "Use './start.sh status' to check status"
        log "Use './start.sh logs' to view logs"
        log "Use './start.sh stop' to stop all services"
    else
        error "Failed to start services"
        exit 1
    fi
}

# Stop the RAG system
stop_system() {
    log "Stopping Roo Code RAG System..."

    if docker-compose -f "$COMPOSE_FILE" down; then
        log "Services stopped successfully"
    else
        error "Failed to stop services"
    fi

    # Clean up PID file
    rm -f "$PID_FILE"
}

# Show status of services
show_status() {
    info "Service Status:"
    docker-compose -f "$COMPOSE_FILE" ps

    echo
    info "Health Check:"
    # Check if services are responding
    if curl -s -f http://localhost:3001/api/health > /dev/null 2>&1; then
        log "✓ RAG Backend API is healthy"
    else
        warn "✗ RAG Backend API is not responding"
    fi
}

# Show logs
show_logs() {
    local service="${2:-}"
    if [ -n "$service" ]; then
        info "Showing logs for $service:"
        docker-compose -f "$COMPOSE_FILE" logs -f "$service"
    else
        info "Showing all logs:"
        docker-compose -f "$COMPOSE_FILE" logs -f
    fi
}

# Restart services
restart_system() {
    log "Restarting Roo Code RAG System..."
    stop_system
    sleep 2
    start_system
}

# Clean up Docker resources
cleanup() {
    warn "Cleaning up Docker resources..."
    docker-compose -f "$COMPOSE_FILE" down -v --remove-orphans
    docker system prune -f
    log "Cleanup completed"
}

# Show usage
usage() {
    echo "Roo Code RAG System Management Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  start     Start the RAG system (backend + Discord bot)"
    echo "  stop      Stop all services"
    echo "  restart   Restart all services"
    echo "  status    Show service status"
    echo "  logs      Show all logs (follow mode)"
    echo "  logs SERVICE  Show logs for specific service"
    echo "  cleanup   Clean up Docker resources"
    echo "  help      Show this help"
    echo
    echo "Services: qdrant, rag-backend, discord-bot, redis"
    echo
    echo "Examples:"
    echo "  $0 start          # Start everything"
    echo "  $0 logs rag-backend  # View backend logs"
    echo "  $0 stop           # Stop everything"
}

# Main script logic
main() {
    cd "$PROJECT_DIR"

    case "${1:-help}" in
        start)
            check_dependencies
            start_system "$@"
            ;;
        stop)
            stop_system
            ;;
        restart)
            restart_system
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$@"
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            error "Unknown command: $1"
            echo
            usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"