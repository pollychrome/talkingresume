# Architecture Guide

Technical documentation for the Talking Resume system.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's Browser                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │   index.html    │  │   styles.css    │  │   chat.js      │  │
│  │   (Resume)      │  │   (Styling)     │  │   (Widget)     │  │
│  └────────┬────────┘  └─────────────────┘  └───────┬────────┘  │
│           │                                         │           │
└───────────│─────────────────────────────────────────│───────────┘
            │                                         │
            │ HTTP GET                     HTTP POST /api/chat
            ▼                                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Edge Network                          │   │
│  │  ┌─────────────────┐        ┌─────────────────────────┐ │   │
│  │  │  Static Assets  │        │   Functions (Workers)   │ │   │
│  │  │  /public/*      │        │   /functions/api/*      │ │   │
│  │  └─────────────────┘        └───────────┬─────────────┘ │   │
│  └─────────────────────────────────────────│───────────────┘   │
│                                            │                    │
│  ┌─────────────────────────────────────────▼───────────────┐   │
│  │                    Cloudflare KV                         │   │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐   │   │
│  │  │ hidden-context  │  │  session:{date}:{ip}        │   │   │
│  │  │ (Resume Data)   │  │  (Chat Logs)                │   │   │
│  │  └─────────────────┘  └─────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                            │
                                            │ HTTPS
                                            ▼
                              ┌─────────────────────────┐
                              │      OpenAI API         │
                              │   (GPT-3.5-turbo)       │
                              └─────────────────────────┘
```

## Component Details

### Frontend (public/)

| File | Purpose |
|------|---------|
| `index.html` | Resume display, chat widget container |
| `styles.css` | All styling including chat widget |
| `js/chat.js` | Chat widget class - handles UI, API calls, typewriter effect |
| `images/` | Profile photo and other static assets |

### Backend (functions/)

| File | Purpose |
|------|---------|
| `api/chat.js` | Main chat endpoint - context selection, OpenAI integration, logging |
| `api/logs.js` | Admin dashboard for viewing chat sessions |

### Data (src/context/)

| File | Purpose |
|------|---------|
| `hidden-context.json` | AI knowledge base - detailed resume information |

## Smart Context Selection

The key optimization that reduces API costs by 60-80%.

### How It Works

1. **User sends question**: "What are your hobbies?"
2. **Keyword extraction**: Message analyzed for keywords
3. **Category matching**: Keywords matched to context categories
4. **Selective retrieval**: Only relevant context sections included
5. **API call**: Smaller payload sent to OpenAI

### Keyword Mappings

```javascript
const contextMappings = {
    leadership: {
        keywords: ['leadership', 'lead', 'manage', 'team', ...],
        sections: ['tech_journey', 'achievements.professional', 'skills.Leadership']
    },
    technical: {
        keywords: ['technical', 'tech', 'product', 'development', ...],
        sections: ['skills.technical', 'achievements.professional', 'tech_journey']
    },
    personal: {
        keywords: ['hobby', 'hobbies', 'personal', 'interests', ...],
        sections: ['hobbies']
    },
    // ... more categories
};
```

### Token Savings Example

| Question Type | Full Context | Smart Context | Savings |
|--------------|--------------|---------------|---------|
| "What are your hobbies?" | ~2000 tokens | ~400 tokens | 80% |
| "Tell me about your experience" | ~2000 tokens | ~800 tokens | 60% |
| "What are your skills?" | ~2000 tokens | ~600 tokens | 70% |

## API Reference

### POST /api/chat

Send a message to the AI assistant.

**Request:**
```json
{
    "message": "What are your hobbies?"
}
```

**Response:**
```json
{
    "message": "<p>Here are some of my hobbies...</p><ul><li>Hobby 1</li></ul>"
}
```

**Error Response:**
```json
{
    "error": "Failed to process chat message",
    "details": "Error description"
}
```

### GET /api/logs

View chat session logs (requires authentication).

**Authentication:**
- Query param: `?auth=YOUR_ADMIN_SECRET`
- Or header: `Authorization: Bearer YOUR_ADMIN_SECRET`

**Response:** HTML dashboard showing all chat sessions

## Data Flow

### Chat Message Flow

```
1. User types message
       │
       ▼
2. chat.js sends POST to /api/chat
       │
       ▼
3. chat.js (backend) receives request
       │
       ▼
4. Fetch context from KV (or use fallback)
       │
       ▼
5. getRelevantContext() filters context
       │
       ▼
6. Build system prompt with filtered context
       │
       ▼
7. Send to OpenAI API
       │
       ▼
8. Log interaction to KV
       │
       ▼
9. Return response to frontend
       │
       ▼
10. chat.js displays with typewriter effect
```

### Session Logging

Sessions are stored in KV with the key pattern: `session:{date}:{ip}`

```json
{
    "startTime": "2024-01-15T10:30:00Z",
    "interactions": [
        {
            "timestamp": "2024-01-15T10:30:05Z",
            "question": "What are your skills?",
            "answer": "<p>My key skills include...</p>",
            "userAgent": "Mozilla/5.0...",
            "ip": "192.168.1.1"
        }
    ]
}
```

## Security Model

### Secrets Management

| Secret | Storage | Purpose |
|--------|---------|---------|
| `OPENAI_API_KEY` | Environment variable | OpenAI API authentication |
| `ADMIN_SECRET` | Environment variable | Logs dashboard access |

**Never store secrets in:**
- `wrangler.toml`
- Source code
- Git repository

### Access Control

- Chat endpoint: Public (no auth required)
- Logs endpoint: Requires `ADMIN_SECRET`
- KV data: Only accessible by Workers

## Performance Considerations

### Caching

- Static assets: Cached at edge by Cloudflare
- KV reads: Fast global access (~10ms)
- OpenAI: No caching (each request is unique)

### Rate Limiting

Currently no rate limiting implemented. For production, consider:

1. **Cloudflare Rate Limiting** (paid feature)
2. **Custom implementation** in chat.js:

```javascript
// Example rate limit check
const ip = context.request.headers.get('CF-Connecting-IP');
const key = `ratelimit:${ip}`;
const count = await context.env.RESUME_DATA.get(key);
if (count && parseInt(count) > 10) {
    return new Response('Rate limited', { status: 429 });
}
```

### Session Cleanup

Old sessions are automatically cleaned up:
- Keeps last 1000 sessions
- Cleanup runs after each new log entry
- Sorted by session key (date-based)

## Deployment Architecture

### Development
```
Local Machine → Wrangler Dev Server → Local KV
```

### Production
```
GitHub → Cloudflare Pages Build → Global Edge Network
                                          │
                                          ├── Static assets (cached)
                                          ├── Functions (cold start ~5ms)
                                          └── KV (global, ~10ms)
```

## Extending the System

### Adding New Endpoints

Create a new file in `functions/api/`:

```javascript
// functions/api/stats.js
export async function onRequest(context) {
    // Your logic here
    return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
```

### Adding Context Categories

1. Add data to `hidden-context.json`
2. Add keyword mapping in `chat.js`
3. Upload new context: `npm run upload-context`

### Switching AI Providers

The system can be adapted to other providers:

```javascript
// Example: Anthropic Claude
const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': context.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2024-01-01'
    },
    body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: message }]
    })
});
```
