# Troubleshooting

Start with the deterministic checks:

```bash
node --version
npm install
npm run check
```

The supported Node.js version is 22.13 or newer.

## The development server does not start

- Run `npm run dev` from the repository root.
- Confirm `wrangler.toml` contains `pages_build_output_dir = "./public"` and does not contain a Workers-only `main` field.
- If the KV namespace ID is still a placeholder, either replace it with a real ID or comment out the entire binding block.
- Re-run `npm install` after changing `package.json` or switching Node versions.

## Chat returns `503 service_unavailable`

`OPENAI_API_KEY` is missing from `.dev.vars` or the deployed Pages environment. Restart local Wrangler or redeploy after adding it.

## Chat returns `502 upstream_error`

The OpenAI request was rejected or returned an invalid response.

1. Confirm the API key is active and has billing access.
2. Confirm `OPENAI_MODEL` names a model available to the API project.
3. Check Cloudflare Function logs for the provider request ID.
4. Retry a short message to rule out a transient provider failure.

Provider error details are intentionally not returned to visitors.

## Chat returns `504 upstream_timeout`

The provider did not answer within 20 seconds. Retry once, then check provider status and Cloudflare Function logs. Do not increase the timeout until latency and cost implications are understood.

## Chat returns `429 rate_limited`

The optional KV-backed limit was reached. Wait for the `Retry-After` interval. For local testing, change `CHAT_RATE_LIMIT_PER_MINUTE` to a positive integer no greater than 100 and restart Wrangler.

Remember that Workers KV is eventually consistent. Use Cloudflare edge rate limiting when strict enforcement is required.

## Logs return `401 unauthorized`

Send the secret in the request header:

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" https://YOUR_DOMAIN/api/logs
```

The logs endpoint does not accept `?auth=` query parameters.

## Logs return `503 service_unavailable`

`ADMIN_SECRET` is missing or shorter than 16 characters. Configure a strong secret and restart or redeploy.

## The logs dashboard is empty

- Confirm `RESUME_DATA` is bound to the Function.
- Confirm `CHAT_LOGGING_ENABLED` is not exactly `false`.
- Submit a new successful question after enabling the binding.
- Existing records expire according to `CHAT_LOG_RETENTION_DAYS`.

If KV is intentionally unbound, an empty dashboard is expected and chat still works.

## Resume answers are incomplete

- Confirm the fact exists in `src/context/hidden-context.json`.
- Add relevant whole-word keywords and section paths in `functions/_shared/resume-context.js`.
- Add a focused test in `test/resume-context.test.js`.
- Keep the visible resume and server context consistent.

Inspect the request indirectly through tests rather than logging the full prompt, which may contain private resume context.

## Conversation history looks wrong after an update

The browser history schema is versioned in its local-storage key. Clear site data for the local or deployed origin if testing older builds. Messages are rendered as plain text, so stored content cannot inject markup.

## Deployment fails

Run these separately to isolate the layer:

```bash
npm run lint
npm run format:check
npm test
npm run build
```

If the local bundle succeeds but deployment fails, check Wrangler authentication, the Pages project name, KV namespace access, and whether the dashboard configuration conflicts with `wrangler.toml`.

## Dependency audit fails

Run:

```bash
npm outdated
npm audit
```

Update the direct dependency that owns the vulnerable transitive package, then run `npm run check` again. Avoid `npm audit fix --force` unless you have reviewed the major-version changes it proposes.
