import { AppError, isAppError } from './errors.js';

const JSON_HEADERS = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
};

export function jsonResponse(body, { status = 200, headers = {} } = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...JSON_HEADERS, ...headers },
    });
}

export function errorResponse(error) {
    const appError = isAppError(error)
        ? error
        : new AppError('The request could not be completed.');

    return jsonResponse(
        {
            error: {
                code: appError.code,
                message: appError.message,
            },
        },
        { status: appError.status },
    );
}

export function methodNotAllowed(allowedMethods) {
    return jsonResponse(
        {
            error: {
                code: 'method_not_allowed',
                message: 'Method not allowed.',
            },
        },
        {
            status: 405,
            headers: { Allow: allowedMethods.join(', ') },
        },
    );
}

export async function readJson(request, { maxBytes = 2_048 } = {}) {
    const contentType = request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/json') {
        throw new AppError('Content-Type must be application/json.', {
            code: 'unsupported_media_type',
            status: 415,
        });
    }

    const contentLength = Number(request.headers.get('Content-Length'));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        throw new AppError('Request body is too large.', {
            code: 'payload_too_large',
            status: 413,
        });
    }

    const rawBody = await readBodyWithLimit(request, maxBytes);

    try {
        return JSON.parse(rawBody);
    } catch (error) {
        throw new AppError('Request body must contain valid JSON.', {
            code: 'invalid_json',
            status: 400,
            cause: error,
        });
    }
}

async function readBodyWithLimit(request, maxBytes) {
    if (!request.body) return '';

    const reader = request.body.getReader();
    const chunks = [];
    let byteLength = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        byteLength += value.byteLength;
        if (byteLength > maxBytes) {
            await reader.cancel();
            throw new AppError('Request body is too large.', {
                code: 'payload_too_large',
                status: 413,
            });
        }
        chunks.push(value);
    }

    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }

    return new TextDecoder().decode(bytes);
}
