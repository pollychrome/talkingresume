const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const DEFAULT_RETENTION_DAYS = 90;
const LOG_KEY_TIME_CEILING = 9_999_999_999_999;

export function normalizeSessionId(value) {
    return SESSION_ID_PATTERN.test(value ?? '') ? value : crypto.randomUUID();
}

export function writeInteractionLog(
    kv,
    { sessionId, timestamp, question, answer = null, errorCode = null, requestId = null },
    { retentionDays = DEFAULT_RETENTION_DAYS } = {},
) {
    if (!kv) {
        return Promise.resolve();
    }

    const normalizedSessionId = normalizeSessionId(sessionId);
    const timestampMs = Date.parse(timestamp);
    const normalizedTimestamp = Number.isNaN(timestampMs) ? Date.now() : timestampMs;
    const reverseTimestamp = String(LOG_KEY_TIME_CEILING - normalizedTimestamp).padStart(13, '0');
    const key = ['interaction', reverseTimestamp, normalizedSessionId, crypto.randomUUID()].join(
        ':',
    );

    const value = JSON.stringify({
        sessionId: normalizedSessionId,
        timestamp,
        question,
        answer,
        errorCode,
        requestId,
    });

    return kv.put(key, value, {
        expirationTtl: normalizeRetentionSeconds(retentionDays),
    });
}

export async function readInteractionLogs(kv, { limit = 1_000 } = {}) {
    if (!kv) {
        return [];
    }

    const entryLimit = normalizeEntryLimit(limit);
    const keys = await listKeys(kv, 'interaction:', entryLimit);
    const interactions = [];

    for (let offset = 0; offset < keys.length; offset += 50) {
        const batch = keys.slice(offset, offset + 50);
        const values = await Promise.all(batch.map(({ name }) => kv.get(name)));

        for (const value of values) {
            if (!value) continue;
            try {
                const interaction = normalizeInteraction(JSON.parse(value));
                if (interaction) interactions.push(interaction);
            } catch {
                // A malformed log entry should not take down the entire dashboard.
            }
        }
    }

    return interactions;
}

function normalizeInteraction(value) {
    if (
        !value ||
        typeof value !== 'object' ||
        typeof value.timestamp !== 'string' ||
        Number.isNaN(Date.parse(value.timestamp)) ||
        typeof value.question !== 'string'
    ) {
        return null;
    }

    return {
        sessionId: SESSION_ID_PATTERN.test(value.sessionId ?? '') ? value.sessionId : 'unknown',
        timestamp: value.timestamp,
        question: value.question,
        answer: typeof value.answer === 'string' ? value.answer : null,
        errorCode: typeof value.errorCode === 'string' ? value.errorCode : null,
        requestId: typeof value.requestId === 'string' ? value.requestId : null,
    };
}

async function listKeys(kv, prefix, limit) {
    const keys = [];
    let cursor;

    do {
        const page = await kv.list({
            prefix,
            cursor,
            limit: Math.min(1_000, limit - keys.length),
        });
        keys.push(...page.keys);
        cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor && keys.length < limit);

    return keys;
}

function normalizeRetentionSeconds(value) {
    const days = Number(value);
    const normalizedDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 365) : 90;
    return Math.round(normalizedDays * 86_400);
}

function normalizeEntryLimit(value) {
    const limit = Number(value);
    return Number.isInteger(limit) && limit > 0 && limit <= 5_000 ? limit : 1_000;
}
