# Talking Resume

An AI-powered interactive resume that lets visitors ask questions about your professional experience through a conversational chat interface. Built with Cloudflare Pages, Workers, and OpenAI.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **AI Chat Interface** - Visitors can ask questions about your experience, skills, and background
- **Smart Context Selection** - Reduces API costs by 60-80% by only sending relevant context to OpenAI
- **Cost-Optimized** - Uses GPT-3.5-turbo (~$0.002-0.005 per conversation) instead of GPT-4
- **Responsive Design** - Works beautifully on desktop and mobile
- **Easy Customization** - Simple JSON-based content management
- **Serverless Architecture** - Scales automatically with zero server management
- **Session Logging** - Track conversations through admin dashboard

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your Resume   │────▶│ Cloudflare Page │────▶│   OpenAI API    │
│   (Browser)     │◀────│    Functions    │◀────│  (GPT-3.5-turbo)│
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │  Cloudflare KV  │
                        │ (Context + Logs)│
                        └─────────────────┘
```

## Quick Start (5 minutes)

### 1. Fork & Clone
```bash
git clone https://github.com/YOUR_USERNAME/talkingresume.git
cd talkingresume
npm install
```

### 2. Get Your API Keys
- **OpenAI**: Get your API key at [platform.openai.com](https://platform.openai.com/api-keys)
- **Cloudflare**: Create a free account at [cloudflare.com](https://cloudflare.com)

### 3. Configure Local Environment
```bash
# Copy the example environment file
cp .dev.vars.example .dev.vars

# Edit with your keys
# OPENAI_API_KEY=sk-your-key-here
# ADMIN_SECRET=your-secret-for-logs
```

### 4. Create KV Namespace
```bash
npx wrangler kv:namespace create "RESUME_DATA"
# Copy the id from the output and update wrangler.toml
```

### 5. Customize & Run
```bash
# Edit your content in:
# - public/index.html (visible resume)
# - src/context/hidden-context.json (AI knowledge base)

# Upload context and start dev server
npm run upload-context
npm run dev
```

Visit `http://localhost:8788` to see your resume!

## Documentation

| Guide | Description |
|-------|-------------|
| [Setup Guide](docs/SETUP.md) | Detailed installation and deployment instructions |
| [Customization Guide](docs/CUSTOMIZATION.md) | How to personalize content, styling, and behavior |
| [Architecture Guide](docs/ARCHITECTURE.md) | Technical deep-dive and API reference |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues and solutions |

## Cost Estimates

| Traffic Level | Monthly Conversations | Estimated Cost |
|--------------|----------------------|----------------|
| Low          | ~100                 | ~$0.20-0.50    |
| Medium       | ~1,000               | ~$2-5          |
| High         | ~10,000              | ~$20-50        |

*Cloudflare Pages free tier includes 100,000 requests/month - sufficient for most personal resumes.*

## File Structure

```
talkingresume/
├── public/                    # Static frontend
│   ├── index.html            # Your resume (customize this!)
│   ├── styles.css            # Styling
│   ├── js/chat.js            # Chat widget
│   └── images/               # Profile photo
├── functions/                 # Serverless API
│   └── api/
│       ├── chat.js           # AI chat endpoint
│       └── logs.js           # Admin logs viewer
├── src/context/
│   └── hidden-context.json   # AI knowledge base (customize this!)
├── docs/                      # Documentation
└── wrangler.toml             # Cloudflare configuration
```

## Deployment

### Option 1: Cloudflare Pages (Recommended)
1. Push your repo to GitHub
2. Connect to Cloudflare Pages
3. Set build output: `public`
4. Add environment variables: `OPENAI_API_KEY`, `ADMIN_SECRET`
5. Bind KV namespace: `RESUME_DATA`

### Option 2: Manual Deploy
```bash
npm run deploy
```

See [Setup Guide](docs/SETUP.md) for detailed deployment instructions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this for your own resume!

## Credits

Built with:
- [Cloudflare Pages](https://pages.cloudflare.com/) - Hosting & serverless functions
- [OpenAI](https://openai.com/) - AI chat capabilities
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) - Cloudflare CLI

---

**Live Demo**: See an example at [alexbenson.info](https://alexbenson.info)
