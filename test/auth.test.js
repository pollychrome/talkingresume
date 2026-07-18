import assert from 'node:assert/strict';
import test from 'node:test';

import { requireAdmin } from '../functions/_shared/auth.js';

const ADMIN_SECRET = 'a-secure-admin-secret';

test('requireAdmin accepts an exact bearer token', () => {
    const request = new Request('https://example.com/api/logs', {
        headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });

    assert.doesNotThrow(() => requireAdmin(request, ADMIN_SECRET));
});

test('requireAdmin rejects requests when the secret is missing', () => {
    const request = new Request('https://example.com/api/logs', {
        headers: { Authorization: 'Bearer undefined' },
    });

    assert.throws(() => requireAdmin(request), {
        code: 'service_unavailable',
        status: 503,
    });
});

test('requireAdmin does not accept query-string credentials', () => {
    const request = new Request(`https://example.com/api/logs?auth=${ADMIN_SECRET}`);

    assert.throws(() => requireAdmin(request, ADMIN_SECRET), {
        code: 'unauthorized',
        status: 401,
    });
});
