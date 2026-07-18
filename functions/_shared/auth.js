import { AppError } from './errors.js';

export function requireAdmin(request, adminSecret) {
    if (typeof adminSecret !== 'string' || adminSecret.length < 16) {
        throw new AppError('The logs dashboard is not configured.', {
            code: 'service_unavailable',
            status: 503,
        });
    }

    const authorization = request.headers.get('Authorization') ?? '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

    if (!constantTimeEqual(token, adminSecret)) {
        throw new AppError('Unauthorized.', {
            code: 'unauthorized',
            status: 401,
        });
    }
}

function constantTimeEqual(left, right) {
    const maxLength = Math.max(left.length, right.length);
    let difference = left.length ^ right.length;

    for (let index = 0; index < maxLength; index += 1) {
        difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
    }

    return difference === 0;
}
