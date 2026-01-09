# Roo Code RAG System Startup Guide

This guide explains how to start and manage the Roo Code RAG system on your VPS.

## Quick Start

### Option 1: Using the Startup Script (Recommended)

```bash
# Make the script executable (first time only)
chmod +x start.sh

# Start the entire system
./start.sh start

# Check status
./start.sh status

# View logs
./start.sh logs

# Stop everything
./start.sh stop
```

### Option 2: Using systemd (Most Robust)

```bash
# Copy the service file
sudo cp roo-rag.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable the service (starts on boot)
sudo systemctl enable roo-rag

# Start the service
sudo systemctl start roo-rag

# Check status
sudo systemctl status roo-rag

# View logs
sudo journalctl -u roo-rag -f

# Stop the service
sudo systemctl stop roo-rag
```

## What Gets Started

The startup script launches:

1. **Qdrant** - Vector database for document embeddings
2. **RAG Backend** - API server with web interface
3. **Discord Bot** - Chat bot for Discord integration
4. **Redis** (optional) - Caching layer

## Available Commands

```bash
./start.sh start     # Start all services
./start.sh stop      # Stop all services
./start.sh restart   # Restart all services
./start.sh status    # Show service status and health
./start.sh logs      # Show all logs (follow mode)
./start.sh logs SERVICE  # Show logs for specific service
./start.sh cleanup   # Clean up Docker resources
./start.sh help      # Show help
```

## Services

- **qdrant**: Vector database (port 6333 internal)
- **rag-backend**: API server (port 3001, proxied through Nginx)
- **discord-bot**: Discord integration bot
- **redis**: Optional caching (only with `--profile with-redis`)

## Health Checks

The system includes automatic health checks:

- Qdrant: `http://localhost:6333/health`
- RAG Backend: `http://localhost:3001/api/health`
- Services restart automatically if they fail

## Troubleshooting

### Services Won't Start
```bash
# Check Docker status
sudo systemctl status docker

# Check available disk space
df -h

# Check available memory
free -h

# View detailed logs
./start.sh logs
```

### Discord Bot Not Working
```bash
# Check bot logs specifically
./start.sh logs discord-bot

# Verify .env file
cat discord-bot/.env
```

### Web Interface Not Accessible
```bash
# Check if backend is healthy
curl http://localhost:3001/api/health

# Check Nginx configuration
sudo nginx -t
sudo systemctl status nginx
```

## File Structure

```
rooagussy/
├── start.sh              # Startup script
├── roo-rag.service       # Systemd service file
├── docker-compose.yml    # Docker services
├── rag-backend/          # API server
├── discord-bot/          # Discord bot
├── docs/                 # Documentation
└── logs/                 # Log files (created by script)
```

## Environment Variables

Make sure these files exist and are configured:

- `rag-backend/.env` - Backend configuration
- `discord-bot/.env` - Discord bot tokens

## Automatic Startup

To have the system start automatically on VPS reboot:

```bash
# Using systemd
sudo systemctl enable roo-rag

# Or add to crontab
@reboot /home/mojo/rooagussy/rooagussy/start.sh start
```

## Monitoring

The system creates logs in the `logs/` directory:

- `startup.log` - Startup script logs
- Docker logs available via `./start.sh logs`

For production monitoring, consider:
- Setting up log rotation
- Adding monitoring alerts
- Using tools like Prometheus/Grafana</content>
<parameter name="filePath">c:\Users\kyle\projects\ragussy\Roo-Code-Docs\STARTUP_README.md