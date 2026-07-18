# Setup

## 1. Install prerequisites

Install Node.js 22.13 or newer, then create accounts with [OpenAI](https://platform.openai.com/) and [Cloudflare](https://dash.cloudflare.com/).

```bash
node --version
npm install
```

Wrangler is installed locally by the project. Use it through the npm scripts or `npx wrangler`; a global installation is unnecessary.

## 2. Configure local secrets

```bash
cp .dev.vars.example .dev.vars
```

Set at least:

```dotenv
OPENAI_API_KEY=your-key
ADMIN_SECRET=a-random-secret-at-least-16-characters-long
```

`.dev.vars` is ignored by Git. Do not add secrets to `wrangler.toml`, source files, or the context JSON.

## 3. Customize the resume

Edit these three sources:

- `public/index.html`: visitor-visible resume content and links
- `public/images/profile.jpeg`: profile image
- `src/context/hidden-context.json`: additional facts available to the assistant

Keep the visible resume and context JSON consistent. The model is instructed not to invent missing information.

## 4. Run locally

```bash
npm run dev
```

Open `http://localhost:8788`. Without KV, the application emits no interaction logs and skips its application-level rate limit.

## 5. Enable optional KV features

Create a namespace:

```bash
npx wrangler login
npx wrangler kv namespace create RESUME_DATA
```

Uncomment this block in `wrangler.toml` and paste the returned ID:

```toml
[[kv_namespaces]]
binding = "RESUME_DATA"
id = "YOUR_KV_NAMESPACE_ID"
```

Restart the development server after changing bindings. Wrangler keeps local KV data separate from production data by default.

## 6. Validate

```bash
npm run check
npm audit
```

Do not deploy if either command fails.

## 7. Deploy

```bash
npm run deploy
```

In the Cloudflare Pages project settings:

1. Add `OPENAI_API_KEY` as an encrypted secret.
2. Add `ADMIN_SECRET` as an encrypted secret if the logs dashboard is enabled.
3. Add optional configuration from `.dev.vars.example`.
4. Confirm the `RESUME_DATA` KV binding if rate limiting or logs are required.
5. Redeploy after changing variables or bindings.

For Git-based deployment, use `public` as the build output directory and keep the repository's `wrangler.toml` as the Pages configuration source.

## 8. Verify the deployment

Check the static page, submit a chat question, and verify the logs endpoint:

```bash
curl -i -H "Authorization: Bearer YOUR_ADMIN_SECRET" https://YOUR_DOMAIN/api/logs
```

Also verify that an unauthenticated request receives `401`, an unsupported chat method receives `405`, and a missing `OPENAI_API_KEY` fails with a non-sensitive `503` response.
