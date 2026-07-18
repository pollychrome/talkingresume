import { requireAdmin } from '../_shared/auth.js';
import { errorResponse, methodNotAllowed } from '../_shared/http.js';
import { readInteractionLogs } from '../_shared/logging.js';

const DASHBOARD_HEADERS = {
    'Cache-Control': 'no-store',
    'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'Content-Type': 'text/html; charset=utf-8',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
};

export async function onRequest(context) {
    if (context.request.method !== 'GET') {
        return methodNotAllowed(['GET']);
    }

    try {
        requireAdmin(context.request, context.env.ADMIN_SECRET);

        if (!context.env.RESUME_DATA) {
            return new Response(renderDashboard([]), { headers: DASHBOARD_HEADERS });
        }

        const interactions = await readInteractionLogs(context.env.RESUME_DATA, {
            limit: normalizeLimit(context.env.LOG_DASHBOARD_ENTRY_LIMIT),
        });

        return new Response(renderDashboard(interactions), { headers: DASHBOARD_HEADERS });
    } catch (error) {
        if (!error.status || error.status >= 500) {
            console.error('Logs request failed', { name: error.name, status: error.status });
        }
        return errorResponse(error);
    }
}

export function renderDashboard(interactions) {
    const sessions = groupBySession(interactions);
    const sessionMarkup = sessions.length
        ? sessions.map(renderSession).join('')
        : '<p class="empty">No interactions have been logged.</p>';

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Chat logs</title>
    <style>
        :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
        body { margin: 0 auto; max-width: 72rem; padding: 2rem 1rem; }
        h1 { margin: 0 0 1.5rem; }
        details { border: 1px solid #8886; border-radius: .5rem; margin: 1rem 0; overflow: hidden; }
        summary { cursor: pointer; display: flex; gap: 1rem; justify-content: space-between; padding: 1rem; }
        .interactions { border-top: 1px solid #8886; padding: 0 1rem; }
        article { border-bottom: 1px solid #8884; padding: 1rem 0; }
        article:last-child { border-bottom: 0; }
        time, .meta, .empty { color: #777; }
        .question, .answer, .error { white-space: pre-wrap; }
        .question { color: #1673aa; }
        .answer { color: #238636; }
        .error { color: #c62828; }
        @media (prefers-color-scheme: dark) {
            time, .meta, .empty { color: #aaa; }
            .question { color: #79c0ff; }
            .answer { color: #7ee787; }
            .error { color: #ff7b72; }
        }
    </style>
</head>
<body>
    <main>
        <h1>Chat logs</h1>
        ${sessionMarkup}
    </main>
</body>
</html>`;
}

function groupBySession(interactions) {
    const sessions = new Map();

    for (const interaction of interactions) {
        const sessionId = interaction.sessionId ?? 'unknown';
        const session = sessions.get(sessionId) ?? [];
        session.push(interaction);
        sessions.set(sessionId, session);
    }

    return [...sessions.entries()]
        .map(([sessionId, entries]) => ({
            sessionId,
            entries: entries.sort((left, right) => left.timestamp.localeCompare(right.timestamp)),
        }))
        .sort((left, right) =>
            right.entries.at(-1).timestamp.localeCompare(left.entries.at(-1).timestamp),
        );
}

function renderSession({ sessionId, entries }) {
    const firstTimestamp = entries[0]?.timestamp;
    const label = formatTimestamp(firstTimestamp);

    return `<details>
        <summary>
            <span>${escapeHtml(label)}</span>
            <span class="meta">${entries.length} ${entries.length === 1 ? 'interaction' : 'interactions'} · ${escapeHtml(sessionId.slice(0, 8))}</span>
        </summary>
        <div class="interactions">${entries.map(renderInteraction).join('')}</div>
    </details>`;
}

function renderInteraction(interaction) {
    const answer = interaction.answer
        ? `<p class="answer"><strong>A:</strong> ${escapeHtml(interaction.answer)}</p>`
        : '';
    const error = interaction.errorCode
        ? `<p class="error"><strong>Error:</strong> ${escapeHtml(interaction.errorCode)}</p>`
        : '';

    return `<article>
        <time datetime="${escapeHtml(interaction.timestamp)}">${escapeHtml(formatTimestamp(interaction.timestamp))}</time>
        <p class="question"><strong>Q:</strong> ${escapeHtml(interaction.question)}</p>
        ${answer}${error}
    </article>`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime())
        ? 'Unknown time'
        : date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

function normalizeLimit(value) {
    const limit = Number(value);
    return Number.isInteger(limit) && limit > 0 && limit <= 5_000 ? limit : 1_000;
}
