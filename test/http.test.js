import assert from 'node:assert/strict';
import test from 'node:test';

import { errorResponse, readJson } from '../functions/_shared/http.js';

test('readJson parses a bounded JSON request', async () => {
    const request = new Request('https://example.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ message: 'Hello' }),
    });

    assert.deepEqual(await readJson(request), { message: 'Hello' });
});

test('readJson rejects unsupported content types', async () => {
    const request = new Request('https://example.com', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'Hello',
    });

    await assert.rejects(readJson(request), {
        code: 'unsupported_media_type',
        status: 415,
    });
});

test('readJson enforces the actual encoded body size', async () => {
    const request = new Request('https://example.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'x'.repeat(100) }),
    });

    await assert.rejects(readJson(request, { maxBytes: 20 }), {
        code: 'payload_too_large',
        status: 413,
    });
});

test('errorResponse never leaks unexpected error details', async () => {
    const response = errorResponse(new Error('database password leaked'));

    assert.equal(response.status, 500);
    assert.doesNotMatch(await response.text(), /database password/i);
});
