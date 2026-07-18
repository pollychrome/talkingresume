import { AppError } from './errors.js';

const WINDOW_SECONDS = 60;
const DEFAULT_REQUEST_LIMIT = 10;

export async function enforceRateLimit({
    kv,
    request,
    secret,
    requestLimit = DEFAULT_REQUEST_LIMIT,
}) {
    if (!kv) {
        return;
    }

    const ipAddress = request.headers.get('CF-Connecting-IP');
    if (!ipAddress) {
        return;
    }

    const limit = normalizeRequestLimit(requestLimit);
    const windowId = Math.floor(Date.now() / (WINDOW_SECONDS * 1_000));
    const visitorId = await digest(`${secret ?? ''}:${ipAddress}`);
    const key = `rate:${windowId}:${visitorId}`;
    const currentCount = Number((await kv.get(key)) ?? 0);

    if (currentCount >= limit) {
        const error = new AppError('Too many requests. Please try again shortly.', {
            code: 'rate_limited',
            status: 429,
        });
        error.retryAfter = WINDOW_SECONDS;
        throw error;
    }

    await kv.put(key, String(currentCount + 1), {
        expirationTtl: WINDOW_SECONDS * 2,
    });
}

async function digest(value) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizeRequestLimit(value) {
    const limit = Number(value);
    return Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : DEFAULT_REQUEST_LIMIT;
}
