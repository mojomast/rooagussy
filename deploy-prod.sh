#!/bin/bash

# Production Deployment Script for ussy.host
# This script builds the frontend and starts production services

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
BUILD_DIR="$PROJECT_DIR/build"

echo "🚀 Starting production deployment for ussy.host..."

# Check if .env files exist
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

if [ ! -f "$PROJECT_DIR/rag-backend/.env" ]; then
    echo "❌ rag-backend/.env file not found. Please copy rag-backend/.env.example to rag-backend/.env and configure it."
    exit 1
fi

# Build the frontend
echo "📦 Building Docusaurus frontend..."
export DOCUSAURUS_URL=https://ussy.host
export DOCUSAURUS_BASE_URL=/
pnpm build

if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Build failed - build directory not found"
    exit 1
fi

echo "✅ Frontend build completed"

# Start production services
echo "🐳 Starting production services..."
docker-compose -f "$COMPOSE_FILE" up -d

echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
if curl -s -f http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ Production deployment successful!"
    echo "🌐 Your site should be available at https://ussy.host"
    echo "🔧 To check logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "🛑 To stop: docker-compose -f docker-compose.prod.yml down"
else
    echo "❌ Health check failed. Check logs:"
    docker-compose -f "$COMPOSE_FILE" logs
    exit 1
fi