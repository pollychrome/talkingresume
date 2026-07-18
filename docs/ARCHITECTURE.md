# Architecture

## System boundaries

```text
Browser
  ├─ public/index.html + public/styles.css
  └─ public/js/chat.js
          │ POST /api/chat
          ▼
Cloudflare Pages Functions
  ├─ functions/api/              HTTP transport and status mapping
  ├─ functions/_shared/          Domain and infrastructure modules
  ├─ bundled resume context      src/context/hidden-context.json
  ├─ OpenAI Responses API        Answer generation
  └─ Cloudflare KV (optional)    Rate counters and expiring logs
```

The route handlers are intentionally thin. They validate the transport, coordinate shared services, and translate failures into public HTTP responses. Context selection, prompting, provider access, authentication, rate limiting, and logging are separate modules so they can be tested independently.

## Chat flow

1. The browser sends `{ "message": "..." }` to `POST /api/chat` with a random local session ID in `X-Chat-Session`.
2. The route enforces the method, content type, body size, message type, and 280-character limit.
3. If KV is bound, a one-minute per-visitor limit is checked using a one-way hash. Raw IP addresses are never stored.
4. `selectRelevantContext` includes identity fields plus sections matching whole-word keyword categories. Experience and skills are the fallback.
5. `buildInstructions` treats the resume JSON as untrusted reference data and asks for concise plain text.
6. `generateAnswer` calls `POST /v1/responses` with the configured model, a timeout, a client request ID, a bounded output, and `store: false`.
7. The browser renders the answer with `textContent`. Model output is never inserted as HTML.
8. If enabled, one immutable interaction record is written to KV with an expiration TTL through `context.waitUntil`.

## Module responsibilities

| Module                      | Responsibility                                |
| --------------------------- | --------------------------------------------- |
| `api/chat.js`               | Chat orchestration and HTTP response mapping  |
| `api/logs.js`               | Authenticated, escaped HTML dashboard         |
| `_shared/http.js`           | JSON parsing and consistent API responses     |
| `_shared/resume-context.js` | Relevant-context selection                    |
| `_shared/prompt.js`         | Provider-independent instruction construction |
| `_shared/openai.js`         | OpenAI request/response boundary              |
| `_shared/rate-limit.js`     | KV-backed soft request limit                  |
| `_shared/logging.js`        | Immutable, expiring interaction records       |
| `_shared/auth.js`           | Logs-dashboard bearer authentication          |

## API contracts

### `POST /api/chat`

Request:

```json
{
    "message": "What are your strongest skills?"
}
```

Success:

```json
{
    "message": "Plain-text answer"
}
```

Error:

```json
{
    "error": {
        "code": "invalid_message",
        "message": "Message is required."
    }
}
```

Expected statuses include `400`, `405`, `413`, `415`, `429`, `502`, `503`, and `504`. Internal and provider error details are never returned to the browser.

### `GET /api/logs`

Requires `Authorization: Bearer <ADMIN_SECRET>`. Query-string credentials are rejected to avoid leaking secrets through browser history, analytics, logs, or referrer headers.

The dashboard uses native `<details>` elements rather than JavaScript, escapes every stored value, sets `Cache-Control: no-store`, and applies a restrictive Content Security Policy.

## KV data model

Interaction keys are append-only:

```text
interaction:{reverseTimestamp}:{sessionId}:{uuid}
```

Each value contains the session ID, timestamp, question, answer or error code, and optional OpenAI request ID. The reversed timestamp keeps the newest records first under KV's lexicographic listing. Records expire after `CHAT_LOG_RETENTION_DAYS` (90 by default). Append-only writes avoid the lost-update problem caused by read-modify-write session arrays in eventually consistent KV.

Rate-limit keys are short-lived:

```text
rate:{minuteWindow}:{sha256(visitorSalt + ip)}
```

This is a cost-control backstop, not a strict distributed quota: Workers KV counters are not atomic and are eventually consistent. For an adversarial or high-traffic deployment, enforce the primary limit with Cloudflare's edge rate-limiting product and keep this application check as defense in depth.

## Security and privacy decisions

- OpenAI and admin credentials exist only in server-side environment variables.
- OpenAI responses are requested with `store: false`.
- Raw visitor IP addresses and user-agent strings are not logged.
- Chat and dashboard responses are non-cacheable.
- Browser and dashboard output paths are safe against stored XSS.
- Missing or weak `ADMIN_SECRET` configuration fails closed.
- Provider failures expose stable application errors and preserve request IDs only in server logs/KV.
- Log retention is bounded by KV TTL rather than a full namespace scan on every request.

## Configuration

| Variable                     | Required            | Default        | Purpose                                       |
| ---------------------------- | ------------------- | -------------- | --------------------------------------------- |
| `OPENAI_API_KEY`             | Yes                 | —              | Provider authentication                       |
| `OPENAI_MODEL`               | No                  | `gpt-5.6-luna` | Model override                                |
| `ADMIN_SECRET`               | For logs            | —              | Dashboard bearer token; minimum 16 characters |
| `RATE_LIMIT_SALT`            | Recommended with KV | `ADMIN_SECRET` | Visitor-hash salt                             |
| `CHAT_RATE_LIMIT_PER_MINUTE` | No                  | `10`           | Soft per-visitor application limit            |
| `CHAT_LOGGING_ENABLED`       | No                  | `true`         | Set to `false` to disable interaction logs    |
| `CHAT_LOG_RETENTION_DAYS`    | No                  | `90`           | Log TTL, clamped to 1–365 days                |
| `LOG_DASHBOARD_ENTRY_LIMIT`  | No                  | `1000`         | Dashboard read cap, clamped to 1–5000         |

## Verification strategy

- Unit tests cover validation, context routing, provider parsing, authentication, rate limiting, logging, and XSS escaping.
- Endpoint tests verify public contracts and the OpenAI request shape.
- ESLint and Prettier enforce consistent source quality.
- `wrangler pages functions build` verifies the deployable bundle, including the JSON context import.
- `npm audit` tracks vulnerable tooling dependencies.
