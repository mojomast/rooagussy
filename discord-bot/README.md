# Roo Code Docs Discord Bot

A Discord bot that provides answers about Roo Code documentation using RAG (Retrieval-Augmented Generation).

## Features

- `/ask <question>` - Ask any question about Roo Code
- `/status` - Check if the bot and RAG backend are healthy
- `/help` - Display help information

## Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and click "Add Bot"
4. Copy the **Bot Token** (keep this secret!)
5. Under "OAuth2" > "General", copy the **Client ID**

### 2. Configure Bot Permissions

1. In the Developer Portal, go to "OAuth2" > "URL Generator"
2. Select scopes: `bot`, `applications.commands`
3. Select bot permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`
4. Copy the generated URL and use it to invite the bot to your server

### 3. Environment Configuration

```bash
cd discord-bot
cp .env.example .env
```

Edit `.env`:
```env
DISCORD_BOT_TOKEN=your-bot-token-here
DISCORD_CLIENT_ID=your-client-id-here
DISCORD_GUILD_ID=your-test-guild-id  # Optional: for faster testing
RAG_API_URL=https://yourdomain.tld/rag/api
```

**Important:** The `RAG_API_URL` setting depends on where your RAG backend is running:

- **VPS deployment**: `https://yourdomain.tld/rag/api` (nginx reverse proxy)
- **Local development**: `http://localhost:3001/rag/api` (direct to backend)

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Register Slash Commands

This only needs to be done once (or when you add/modify commands):

```bash
pnpm run register
```

**Note:** If you set `DISCORD_GUILD_ID`, commands register instantly to that server. Without it, global commands may take up to 1 hour to appear.

### 6. Run the Bot

**Development:**
```bash
pnpm dev
```

**Production:**
```bash
pnpm build
pnpm start
```

**Docker:**
```bash
# From project root
docker compose --profile with-discord up -d
```

## Docker Deployment

The bot is included in the main docker-compose.yml but uses a profile to be opt-in:

```bash
# Start everything including Discord bot
docker compose --profile with-discord up -d

# Or start bot separately
docker compose --profile with-discord up -d discord-bot
```

Make sure to create `discord-bot/.env` with your Discord credentials before running.

**Network Communication:** When running in Docker, the bot automatically communicates with the RAG backend using the internal Docker network (`http://rag-backend:3001/api`). The RAG backend is not exposed to the internet - only the Discord bot and web interface can access it.

## Architecture

```
Discord User
     │
     ▼
┌─────────────────┐
│  Discord Bot    │
│  (discord.js)   │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  RAG Backend    │
│  POST /api/chat │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Qdrant + LLM   │
└─────────────────┘
```

## Commands

### `/ask`
Ask a question about Roo Code.

Options:
- `question` (required): Your question
- `private` (optional): Only you see the response

Example:
```
/ask question: How do I install Roo Code?
```

### `/status`
Check bot health and connectivity to the RAG backend.

### `/help`
Display usage information.

## Rate Limiting

By default, users can only use commands once every 5 seconds. Configure with `COOLDOWN_SECONDS` in `.env`.

## Troubleshooting

### Commands not showing up
- If using guild-specific registration, make sure `DISCORD_GUILD_ID` is correct
- For global commands, wait up to 1 hour
- Re-run `pnpm run register`

### Bot offline
- Check that `DISCORD_BOT_TOKEN` is correct
- Ensure the bot has been invited to the server
- Check logs: `docker compose logs discord-bot`

### "RAG backend not reachable"
- Ensure the RAG backend is running
- **For local development:** Check `RAG_API_URL=http://localhost:3001/api`
- **For Docker deployment:** The URL is automatically set to `http://rag-backend:3001/api` (internal network)
- Verify network connectivity between containers: `docker compose exec discord-bot curl http://rag-backend:3001/api/health`
