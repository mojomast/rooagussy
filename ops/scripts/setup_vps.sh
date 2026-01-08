#!/bin/bash
#
# setup_vps.sh
# Initial VPS setup script for Roo Code Docs RAG
#
# Prerequisites:
#   - Ubuntu 22.04 or 24.04
#   - Root or sudo access
#   - Domain pointed to this server's IP
#

set -euo pipefail

# Configuration - UPDATE THESE
DOMAIN="yourdomain.tld"
EMAIL="admin@yourdomain.tld"
REPO_URL="https://github.com/YOUR_USERNAME/Roo-Code-Docs.git"
DEPLOY_DIR="/var/www/roo-docs"
NGINX_SITE="roo-rag"

echo "=============================================="
echo "  Roo Code Docs RAG - VPS Setup"
echo "=============================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root or with sudo"
    exit 1
fi

# Update system
echo "Updating system packages..."
apt update && apt upgrade -y

# Install Docker
echo "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose plugin
echo "Installing Docker Compose..."
apt install -y docker-compose-plugin

# Install Nginx
echo "Installing Nginx..."
apt install -y nginx

# Install Certbot for Let's Encrypt
echo "Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Install Node.js and pnpm
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pnpm

# Create deployment directory
echo "Setting up deployment directory..."
mkdir -p "$DEPLOY_DIR"

# Clone repository
if [ ! -d "$DEPLOY_DIR/.git" ]; then
    echo "Cloning repository..."
    git clone "$REPO_URL" "$DEPLOY_DIR"
fi

cd "$DEPLOY_DIR"

# Copy environment file
if [ ! -f "rag-backend/.env" ]; then
    echo "Creating environment file..."
    cp rag-backend/.env.example rag-backend/.env
    echo ""
    echo "⚠️  IMPORTANT: Edit rag-backend/.env with your API keys!"
    echo "    nano $DEPLOY_DIR/rag-backend/.env"
fi

# Install dependencies
echo "Installing project dependencies..."
pnpm install

# Build Docusaurus
echo "Building Docusaurus site..."
pnpm build

# Install backend dependencies
cd rag-backend
pnpm install

# Setup Nginx
echo "Configuring Nginx..."
cd "$DEPLOY_DIR"

# Update domain in nginx config
sed -i "s/yourdomain.tld/$DOMAIN/g" ops/nginx/roo-rag.conf
sed -i "s|/var/www/roo-docs/build|$DEPLOY_DIR/build|g" ops/nginx/roo-rag.conf

# Copy nginx config
cp ops/nginx/roo-rag.conf "/etc/nginx/sites-available/$NGINX_SITE"
ln -sf "/etc/nginx/sites-available/$NGINX_SITE" "/etc/nginx/sites-enabled/"

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# Get SSL certificate
echo "Obtaining SSL certificate..."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive || {
    echo "SSL certificate setup failed. You may need to run certbot manually."
}

# Setup firewall
echo "Configuring firewall..."
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw --force enable

# Start services
echo "Starting Docker services..."
cd "$DEPLOY_DIR"
docker compose up -d

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 10

# Run initial ingestion
echo "Running initial document ingestion..."
cd rag-backend
pnpm run ingest:full || echo "Initial ingestion failed - check API keys"

# Reload nginx
systemctl reload nginx

echo ""
echo "=============================================="
echo "  Setup Complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Edit rag-backend/.env with your API keys"
echo "2. Run: docker compose restart rag-backend"
echo "3. Visit https://$DOMAIN to verify"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f          # View logs"
echo "  docker compose restart          # Restart services"
echo "  ./ops/scripts/sync_and_reindex.sh  # Sync and reindex"
echo ""
