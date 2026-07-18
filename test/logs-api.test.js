import assert from 'node:assert/strict';
import test from 'node:test';

import { onRequest, renderDashboard } from '../functions/api/logs.js';

test('logs endpoint is unavailable when ADMIN_SECRET is not configured', async (t) => {
    const consoleMock = t.mock.method(console, 'error', () => {});
    const response = await onRequest({
        request: new Request('https://example.com/api/logs', {
            headers: { Authorization: 'Bearer undefined' },
        }),
        env: {},
    });

    assert.equal(response.status, 503);
    assert.equal(consoleMock.mock.callCount(), 1);
});

test('logs dashboard escapes stored content', () => {
    const html = renderDashboard([
        {
            sessionId: 'session_identifier_1234',
            timestamp: '2026-07-18T12:00:00.000Z',
            question: '<script>alert(1)</script>',
            answer: '<img src=x onerror=alert(1)>',
        },
    ]);

    assert.doesNotMatch(html, /<script>alert/);
    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
