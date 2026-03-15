# AI Diary Chat Server

Real-time Socket.IO server for [AI Diary](https://github.com/jarangseo/ai-diary-next). Handles messaging, typing indicators, online presence, and AI-powered responses.

## Why a Separate Server?

This server is intentionally decoupled from the Next.js app:

- **WebSocket connections require persistent processes** — serverless functions (Vercel) terminate after each request, making them incompatible with long-lived socket connections.
- **Independent scaling** — chat traffic can spike independently from page views. A dedicated server allows scaling the real-time layer without affecting the main app.
- **Single responsibility** — the Next.js app handles REST APIs and rendering; this server handles only real-time events.

## Architecture

```
Client (Browser)
  |
  |-- WebSocket --> This Server (port 4000)
  |                   |
  |                   |-- Broadcasts events to rooms
  |                   |-- Saves messages to Supabase
  |                   |-- Triggers AI responses via OpenAI
  |                   |
  |                   v
  |                Supabase (shared with Next.js)
  |
  |-- HTTP -------> Next.js API Routes
```

## Socket Events

### Client -> Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-room` | `roomId: string` | Join a chat room |
| `send-message` | `{ roomId, content }` | Send message to room |
| `user-typing` | `{ roomId }` | Notify room of typing |

### Server -> Client

| Event | Payload | Description |
|-------|---------|-------------|
| `new-message` | `{ id, userId, userName, content, type, createdAt }` | New message broadcast |
| `user-typing` | `userName: string` | Someone is typing |
| `user-joined` | `{ id, name }` | User entered the room |
| `user-left` | `userId: string` | User disconnected |
| `online-users` | `{ id, name }[]` | Full online user list |

### AI Response Flow

```
User sends "@ai how are you?"
  -> Server detects @ai in content
  -> Fetches last 20 messages from Supabase (context)
  -> Calls OpenAI GPT-4o-mini with conversation history
  -> Broadcasts AI response as type: 'ai' message
  -> Saves to Supabase
```

## Project Structure

```
src/
  index.ts      # Express + Socket.IO server, event handlers
  ai.ts         # OpenAI integration (generateAiResponse)
  openai.ts     # OpenAI client initialization
  supabase.ts   # Supabase client initialization
```

## Getting Started

### 1. Install

```bash
pnpm install
```

### 2. Environment variables

Create a `.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_secret_key
OPENAI_API_KEY=your_openai_api_key
```

### 3. Run

```bash
pnpm dev  # runs on port 4000
```

## Tech Stack

| Technology | Why |
|-----------|-----|
| Express 5 | Minimal HTTP server for Socket.IO to attach to |
| Socket.IO 4 | Room-based broadcasting, auto-reconnection, polling fallback |
| Supabase | Shared database with Next.js app for message persistence |
| OpenAI | GPT-4o-mini for contextual AI chat responses |
| TypeScript | Type safety across event payloads |
| dotenv | Environment variable loading (Node.js doesn't auto-load `.env`) |
