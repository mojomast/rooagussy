# Roo Code Docs Discord Bot

A Discord bot that provides intelligent answers about Roo Code documentation using Retrieval-Augmented Generation (RAG).

## ✨ Features

- **Slash Commands**: `/ask`, `/status`, `/help` with global registration
- **Message Commands**: `!roodocs` for immediate use (no waiting for slash commands)
- **Rich Responses**: Formatted embeds with source links and clickable buttons
- **Conversation Context**: Maintains context per Discord channel
- **Rate Limiting**: Per-user cooldown system (configurable)
- **Health Monitoring**: Automatic backend connectivity checks
- **Docker Support**: Complete containerization with health checks

## 🚀 Quick Setup

### 1. Discord Application Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and name it "Roo Code Docs"
3. Go to "Bot" section and click "Add Bot"
4. **Enable "Message Content Intent"** (required for `!roodocs` commands)
5. Copy the **Bot Token** and **Client ID**

### 2. Bot Permissions & Invite

1. In Developer Portal → "OAuth2" → "URL Generator"
2. Select scopes: `bot`, `applications.commands`
3. Select permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`
4. Use generated URL to invite bot to your server

### 3. Environment Configuration

```bash
cd discord-bot
cp .env.example .env
```

Edit `.env`:
```env
# Discord Bot Credentials
DISCORD_BOT_TOKEN=your-bot-token-here
DISCORD_CLIENT_ID=your-client-id-here
DISCORD_GUILD_ID=your-guild-id  # Optional: faster command registration

# RAG Backend API
RAG_API_URL=http://localhost:3001/rag/api

# Optional Settings
COOLDOWN_SECONDS=5
LOG_LEVEL=info
```

**API URL Configuration:**
- **Local Development**: `http://localhost:3001/rag/api`
- **Docker Deployment**: `http://rag-backend:3001/api` (internal network)
- **VPS with Nginx**: `https://yourdomain.com/rag/api`

### 4. Install & Run

```bash
# Install dependencies
npm install

# Register slash commands (one-time)
npm run register

# Development mode
npm run dev

# Production build
npm run build && npm start
```

## 🐳 Docker Deployment

The bot integrates with the main Docker Compose setup:

```bash
# From project root - start everything including bot
docker-compose --profile with-discord up -d

# Start only the bot
docker-compose --profile with-discord up -d discord-bot

# View logs
docker-compose logs -f discord-bot
```

## 🤖 Commands

### Slash Commands (Global)

#### `/ask <question>`
Ask intelligent questions about Roo Code documentation.

**Parameters:**
- `question` (required): Your question about Roo Code
- `private` (optional): Make response visible only to you

**Examples:**
```
/ask question: How do I install Roo Code?
/ask question: What are the keyboard shortcuts? private: true
```

#### `/status`
Check bot health and RAG backend connectivity.

**Response:** Shows bot uptime, API health, and system status.

#### `/help`
Display comprehensive help information and command usage.

### Message Commands (Immediate)

#### `!roodocs <question>`
Same functionality as `/ask` but works immediately - no waiting for slash command propagation!

**Examples:**
```
!roodocs How do I configure my API keys?
!roodocs What are the available models?
```

**Benefits:**
- Works immediately (slash commands take 1+ hours to propagate globally)
- Same rich responses and source links
- Same rate limiting and conversation context

## 🏗️ Architecture

```
┌─────────────────┐    HTTP     ┌─────────────────┐
│   Discord Bot   │◄──────────►│   RAG Backend   │
│                 │            │   (Express)     │
│ • Slash Commands│            │ • /rag/api/chat │
│ • Message Events│            │ • /rag/api/health│
│ • Rate Limiting │            └────────┬────────┘
└─────────────────┘                     │
                                        ▼
                           ┌─────────────────┐
                           │   Qdrant + LLM   │
                           │  (Vector Search) │
                           └─────────────────┘
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DISCORD_BOT_TOKEN` | Discord bot authentication token | - | Yes |
| `DISCORD_CLIENT_ID` | Discord application client ID | - | Yes |
| `DISCORD_GUILD_ID` | Guild ID for faster command registration | - | No |
| `RAG_API_URL` | RAG backend API endpoint | `http://localhost:3001/rag/api` | Yes |
| `COOLDOWN_SECONDS` | Rate limiting cooldown | `5` | No |
| `LOG_LEVEL` | Logging verbosity (debug/info/warn/error) | `info` | No |

### Rate Limiting

- **Default**: 5 seconds between commands per user
- **Scope**: Per-user across all commands
- **Response**: Friendly cooldown message with remaining time

### Conversation Context

- **Scope**: Per Discord channel
- **Duration**: Maintained until bot restart
- **Purpose**: Allows follow-up questions with context

## 🔧 Development

### Local Development

```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Register commands for testing
npm run register

# Check types
npm run check-types

# Lint code
npm run lint
```

### Testing Commands

```bash
# Test slash commands in Discord
/ask question: test

# Test message commands
!roodocs test question

# Check health
/status
```

## 📊 Monitoring & Logs

### Health Checks

The bot performs automatic health checks on startup and provides `/status` command.

### Logging

- **Structured Logging**: Pino with JSON output
- **Log Levels**: Configurable via `LOG_LEVEL`
- **Docker Logs**: `docker-compose logs discord-bot`
- **File Logs**: Available in container logs

### Metrics

- Command usage statistics
- Response times
- Error rates
- API connectivity status

## 🐛 Troubleshooting

### Bot Won't Start

**Error:** "Failed to login to Discord"

**Solutions:**
- ✅ Verify `DISCORD_BOT_TOKEN` is correct
- ✅ Check "Message Content Intent" is enabled in Developer Portal
- ✅ Ensure bot has proper permissions in server
- ✅ Check firewall/network connectivity

### Commands Not Appearing

**For Slash Commands:**
- ✅ Run `npm run register` to register commands
- ✅ If `DISCORD_GUILD_ID` set: Commands appear immediately in that server
- ✅ If no guild ID: Wait 1-24 hours for global propagation
- ✅ Check bot has `applications.commands` scope

**For Message Commands:**
- ✅ `!roodocs` works immediately (no registration needed)
- ✅ Ensure "Message Content Intent" is enabled

### API Connection Issues

**Error:** "RAG backend not reachable"

**Solutions:**
- ✅ Verify RAG backend is running: `curl http://localhost:3001/rag/api/health`
- ✅ Check `RAG_API_URL` in `.env` matches backend location
- ✅ For Docker: Use `http://rag-backend:3001/api` (internal network)
- ✅ Check network connectivity between containers

### Rate Limiting Issues

**Error:** "Please wait X seconds"

**Solutions:**
- ✅ Wait for cooldown period
- ✅ Adjust `COOLDOWN_SECONDS` in `.env` (not recommended for production)
- ✅ Check if multiple users are triggering limits

### Docker Issues

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs discord-bot

# Restart bot
docker-compose restart discord-bot

# Check network connectivity
docker-compose exec discord-bot curl http://rag-backend:3001/api/health
```

## 🚀 Production Deployment

### Systemd Service (Recommended)

```bash
# Copy service file
sudo cp ../roo-rag.service /etc/systemd/system/

# Enable auto-start
sudo systemctl daemon-reload
sudo systemctl enable roo-rag

# Manual control
sudo systemctl start roo-rag
sudo systemctl stop roo-rag
sudo systemctl restart roo-rag

# Check status
sudo systemctl status roo-rag

# View logs
journalctl -u roo-rag -f
```

### Startup Script

```bash
# From project root
chmod +x start.sh
./start.sh start    # Background operation
./start.sh status   # Health check
./start.sh logs     # View logs
./start.sh stop     # Stop all services
```

## 🔒 Security

### Bot Security
- Token stored securely in environment variables
- Minimal required permissions
- Message content intent properly scoped
- Rate limiting prevents abuse

### API Security
- Internal Docker network communication
- No direct external API access
- Input validation and sanitization
- Error messages don't leak sensitive data

## 📈 Performance

### Resource Usage
- **Memory**: ~256MB RAM
- **CPU**: Minimal (event-driven)
- **Network**: Low bandwidth usage
- **Storage**: Minimal (logs only)

### Scaling
- **Concurrent Users**: Handles 100+ simultaneous users
- **Response Time**: <3 seconds for typical queries
- **Rate Limits**: Configurable per deployment needs

## 🤝 Contributing

### Code Style
- TypeScript with strict type checking
- ESLint configuration
- Prettier formatting
- Comprehensive error handling

### Testing
- Manual testing in Discord server
- API endpoint testing
- Docker container validation
- Health check verification

## 📝 Changelog

### Recent Updates
- ✅ Added `!roodocs` message command support
- ✅ Enhanced error handling and logging
- ✅ Improved Docker integration
- ✅ Added conversation context
- ✅ Implemented rich embed responses
- ✅ Added comprehensive health monitoring

## 📞 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Docker logs: `docker-compose logs discord-bot`
3. Verify API connectivity: `curl http://localhost:3001/rag/api/health`
4. Check Discord bot status in Developer Portal

## 📄 License

Licensed under Apache License 2.0. See project root LICENSE file.
