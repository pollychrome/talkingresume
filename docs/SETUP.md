# Setup Guide

This guide walks you through setting up your Talking Resume from scratch.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm** - Comes with Node.js
- **Cloudflare account** - [Sign up free](https://cloudflare.com)
- **OpenAI API key** - [Get one here](https://platform.openai.com/api-keys)
- **GitHub account** - For deployment (optional but recommended)

## Step 1: Clone the Repository

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/talkingresume.git
cd talkingresume

# Install dependencies
npm install
```

## Step 2: Set Up Cloudflare

### Install Wrangler CLI

Wrangler is Cloudflare's CLI tool for managing Workers and Pages.

```bash
# It's already in devDependencies, but you can also install globally
npm install -g wrangler

# Login to Cloudflare
npx wrangler login
```

### Create KV Namespace

KV (Key-Value) storage holds your resume context and chat logs.

```bash
# Create the namespace
npx wrangler kv:namespace create "RESUME_DATA"
```

You'll see output like:
```
🌀 Creating namespace with title "resume-chat-RESUME_DATA"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "RESUME_DATA", id = "abc123..." }
```

**Copy the `id` value** and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "RESUME_DATA"
id = "YOUR_NAMESPACE_ID_HERE"  # <-- Replace this
```

## Step 3: Configure Environment Variables

### For Local Development

Create a `.dev.vars` file in the project root:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your actual values:

```
OPENAI_API_KEY=sk-your-openai-api-key-here
ADMIN_SECRET=choose-a-secure-secret-for-admin-access
```

> **Important**: Never commit `.dev.vars` to git. It's already in `.gitignore`.

### For Production

Set these in Cloudflare Pages Dashboard:
1. Go to your project → Settings → Environment Variables
2. Add `OPENAI_API_KEY` and `ADMIN_SECRET`

## Step 4: Customize Your Content

### 1. Edit the Resume (public/index.html)

Update the visible resume content:
- Your name and title
- Profile photo (replace `public/images/profile.jpeg`)
- Contact links (LinkedIn, GitHub, email)
- Work experience
- Skills

### 2. Edit the AI Knowledge Base (src/context/hidden-context.json)

This is the detailed information the AI uses to answer questions:

```json
{
    "name": "Your Name",
    "currentRole": "Your Title",
    "summary": "Brief professional summary...",
    "hobbies": [...],
    "tech_journey": {...},
    "achievements": {...},
    "experience": [...],
    "skills": {...},
    "certifications": [...]
}
```

See [Customization Guide](CUSTOMIZATION.md) for detailed field descriptions.

### 3. Upload Context to KV

```bash
npm run upload-context
```

## Step 5: Run Locally

```bash
npm run dev
```

Visit `http://localhost:8788` to test your resume.

### Test the Chat

- Click the chat bubble (💬) in the bottom-right
- Ask questions like "What are your hobbies?" or "Tell me about your experience"

### View Logs (Admin)

Visit: `http://localhost:8788/api/logs?auth=YOUR_ADMIN_SECRET`

## Step 6: Deploy to Production

### Option A: Cloudflare Pages (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial setup"
   git push origin main
   ```

2. **Connect to Cloudflare Pages**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
   - Click "Create a project" → "Connect to Git"
   - Select your repository

3. **Configure Build Settings**
   - Framework preset: None
   - Build command: (leave empty)
   - Build output directory: `public`

4. **Add Environment Variables**
   - Settings → Environment Variables
   - Add `OPENAI_API_KEY` (your OpenAI key)
   - Add `ADMIN_SECRET` (your chosen secret)

5. **Bind KV Namespace**
   - Settings → Functions → KV namespace bindings
   - Variable name: `RESUME_DATA`
   - KV namespace: Select your namespace

6. **Upload Production Context**
   ```bash
   npx wrangler kv:key put --namespace-id "YOUR_NAMESPACE_ID" "hidden-context" --path src/context/hidden-context.json
   ```

7. **Deploy**
   - Cloudflare will auto-deploy on every push to main

### Option B: Manual Deploy

```bash
npm run deploy
```

## Step 7: Custom Domain (Optional)

1. In Cloudflare Pages, go to Custom domains
2. Add your domain (e.g., `resume.yourdomain.com`)
3. Follow DNS configuration instructions

## Cost Breakdown

### Cloudflare (Free Tier)
- 100,000 requests/month
- Unlimited bandwidth
- Free SSL

### OpenAI API
| Usage | Approximate Cost |
|-------|-----------------|
| 100 conversations/month | ~$0.20-0.50 |
| 1,000 conversations/month | ~$2-5 |
| 10,000 conversations/month | ~$20-50 |

*Costs based on GPT-3.5-turbo with smart context selection (~500-1500 tokens/request)*

## Next Steps

- [Customize your content →](CUSTOMIZATION.md)
- [Understand the architecture →](ARCHITECTURE.md)
- [Troubleshoot issues →](TROUBLESHOOTING.md)
