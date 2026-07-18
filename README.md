# Talking Resume

An interactive resume with a small, server-rendered AI chat backend. Static assets and API routes run on Cloudflare Pages; resume context stays in the server bundle and is sent to OpenAI only when it is relevant to a visitor's question.

## What is included

- Responsive, accessible resume and chat interface
- Server-side OpenAI Responses API integration
- Keyword-based context selection to limit request size
- Strict request validation and safe plain-text rendering
- Optional KV-backed rate limiting and expiring interaction logs
- Header-authenticated, CSP-protected logs dashboard
- Automated tests, linting, formatting, bundle validation, and dependency auditing
- GitHub Actions enforcement for every push and pull request

## Requirements

- Node.js 22.13 or newer
- An [OpenAI API key](https://platform.openai.com/api-keys)
- A Cloudflare account for deployment
- A Cloudflare KV namespace if you want rate limiting and interaction logs

## Quick start

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Then open `http://localhost:8788`.

Before running the site, update:

- `public/index.html` for the visible resume
- `public/images/profile.jpeg` for the profile image
- `src/context/hidden-context.json` for the server-side AI knowledge base
- `.dev.vars` with `OPENAI_API_KEY` and a strong `ADMIN_SECRET`

The context JSON is bundled with the Pages Function and is not served as a static asset. It is still tracked in Git, so do not put secrets or information you would not want repository collaborators to read in it.

## Optional KV storage

Without a `RESUME_DATA` binding, chat works but logging and application-level rate limiting are disabled. To enable them:

```bash
npx wrangler kv namespace create RESUME_DATA
```

Uncomment the `[[kv_namespaces]]` block in `wrangler.toml` and replace the placeholder with the returned namespace ID. Wrangler uses local storage for that binding during local development and the configured namespace after deployment.

View logs with an authorization header; credentials in query strings are intentionally unsupported:

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" http://localhost:8788/api/logs
```

## Quality checks

```bash
npm run check
npm audit
```

`npm run check` runs ESLint, Prettier verification, the Node test suite, and a production-equivalent Pages Functions bundle.

## Project structure

```text
public/                   Static resume and chat UI
functions/api/            Thin HTTP route handlers
functions/_shared/        Domain, provider, security, and persistence modules
src/context/              Server-side resume knowledge base
test/                     Unit and endpoint tests
docs/                     Setup, customization, architecture, troubleshooting
wrangler.toml             Cloudflare Pages configuration
```

## Documentation

- [Setup](docs/SETUP.md)
- [Customization](docs/CUSTOMIZATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Deployment

```bash
npm run check
npm run deploy
```

Configure `OPENAI_API_KEY`, `ADMIN_SECRET`, and the optional settings from `.dev.vars.example` as encrypted environment variables in Cloudflare. Add the `RESUME_DATA` KV binding in `wrangler.toml` or the Pages dashboard before deploying if you need logging and rate limiting.

## License

[MIT](LICENSE)
