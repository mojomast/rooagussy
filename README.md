# Roo Code Docs

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

This repository is a fork of the Roo Code documentation with enhanced Retrieval-Augmented Generation (RAG) capabilities, including an AI-powered chat interface and Discord bot integration.

## 🌟 Features

- **📚 Documentation Site**: Complete Roo Code documentation built with Docusaurus
- **🤖 AI Chat Interface**: Integrated RAG system for intelligent document queries
- **💬 Discord Bot**: Real-time Q&A bot with slash commands and message support
- **🐳 Docker Deployment**: Complete containerized deployment with Docker Compose
- **🔄 Auto-Sync**: Automatic document ingestion and vector database updates

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for development)
- Discord Bot Token (for Discord integration)

### Production Deployment

```bash
# Clone and setup
git clone <repository-url>
cd roo-code-docs

# Start all services (RAG backend + Discord bot)
chmod +x start.sh
./start.sh start

# Check status
./start.sh status
```

### Development Setup

```bash
# Install dependencies
pnpm install

# Start documentation site
pnpm start

# In another terminal, start RAG system
docker-compose --profile with-discord up -d
```

## 📖 Documentation

- **[RAG System Guide](README_RAG.md)**: Complete RAG implementation and API documentation
- **[Discord Bot Setup](discord-bot/README.md)**: Bot configuration and commands
- **[Deployment Guide](STARTUP_README.md)**: Production deployment and management
- **[Modifications](MODIFICATIONS.md)**: Complete changelog of fork modifications

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Discord Bot   │────│   RAG Backend   │────│     Qdrant      │
│   (!roodocs)    │    │   (API + Web)   │    │  (Vector DB)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Redis Cache   │
                    │   (Optional)    │
                    └─────────────────┘
```

## 🤖 Discord Bot Commands

### Slash Commands (Global)
- `/ask <question>` - Ask questions about Roo Code
- `/status` - Check bot and backend health
- `/help` - Show available commands

### Message Commands (Immediate)
- `!roodocs <question>` - Same functionality, works immediately

## 🔧 Management Commands

```bash
./start.sh start     # Start all services
./start.sh stop      # Stop all services
./start.sh status    # Check health and status
./start.sh logs      # View service logs
./start.sh restart   # Restart all services
```

## 📊 API Endpoints

- **Web Interface**: `https://yourdomain.com/rag`
- **Health Check**: `GET /rag/api/health`
- **Chat API**: `POST /rag/api/chat`

## 🛠️ Development

### Local Development

```bash
# Documentation site
pnpm install
pnpm start

# RAG Backend (separate terminal)
cd rag-backend
pnpm install
pnpm dev

# Discord Bot (separate terminal)
cd discord-bot
npm install
npm run dev
```

### Docker Development

```bash
# Start all services
docker-compose --profile with-discord up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔐 Configuration

### Required Environment Files

1. **`rag-backend/.env`** - Backend configuration
2. **`discord-bot/.env`** - Discord bot credentials

### Discord Bot Setup

1. Create bot in [Discord Developer Portal](https://discord.com/developers/applications)
2. Enable "Message Content Intent" in Bot settings
3. Copy token and client ID to `discord-bot/.env`

## 📈 Monitoring & Health Checks

- **Service Health**: `./start.sh status`
- **API Health**: `GET /rag/api/health`
- **Logs**: `./start.sh logs [service-name]`
- **Metrics**: Built-in Pino logging with structured output

## 🚀 Deployment Options

### Option 1: Startup Script (Recommended)

```bash
./start.sh start  # Runs in background, survives disconnects
```

### Option 2: Systemd Service

```bash
sudo cp roo-rag.service /etc/systemd/system/
sudo systemctl enable roo-rag
sudo systemctl start roo-rag
```

### Option 3: Manual Docker

```bash
# Start core services
docker-compose up -d qdrant rag-backend

# Start Discord bot
docker-compose --profile with-discord up -d discord-bot
```

## 🔄 Data Management

### Document Ingestion

```bash
# Full ingestion
cd rag-backend
pnpm run ingest:full

# Incremental updates
pnpm run ingest:incremental
```

### Vector Database

```bash
# Reset collection
curl -X DELETE http://localhost:6333/collections/roo-docs

# Backup data
docker run --rm -v roo-rag-qdrant-data:/data alpine tar czf backup.tar.gz -C /data .
```

## 🐛 Troubleshooting

### Common Issues

**Bot won't start:**
- Check `DISCORD_BOT_TOKEN` in `.env`
- Verify "Message Content Intent" is enabled
- Check bot permissions in Discord server

**API connection failed:**
- Verify `RAG_API_URL` configuration
- Check Docker network: `docker network ls`
- Review backend logs: `./start.sh logs rag-backend`

**Services won't start:**
- Check disk space: `df -h`
- Check memory: `free -h`
- Check Docker status: `sudo systemctl status docker`

### Log Locations

- **Startup Script**: `logs/startup.log`
- **Docker Services**: `docker-compose logs [service]`
- **Systemd**: `journalctl -u roo-rag -f`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

See [MODIFICATIONS.md](MODIFICATIONS.md) for detailed change history and [DEVPLAN_STATUS.md](DEVPLAN_STATUS.md) for development status.

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original Roo Code team for the documentation framework
- Docusaurus for the static site generator
- Discord.js for the bot framework
- Qdrant for vector database capabilities
- LangChain for RAG implementation

---

**Maintained by:** @mojomast
**Original Repository:** [RooCodeInc/Roo-Code-Docs](https://github.com/RooCodeInc/Roo-Code-Docs)
