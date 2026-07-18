import assert from 'node:assert/strict';
import test from 'node:test';

import { enforceRateLimit } from '../functions/_shared/rate-limit.js';
import { MemoryKv } from '../test-support/memory-kv.js';

test('enforceRateLimit stores only a hashed visitor identifier', async () => {
    const kv = new MemoryKv();
    const request = new Request('https://example.com/api/chat', {
        headers: { 'CF-Connecting-IP': '192.0.2.1' },
    });

    await enforceRateLimit({ kv, request, secret: 'rate-limit-secret' });

    const [key] = kv.entries.keys();
    assert.match(key, /^rate:/);
    assert.doesNotMatch(key, /192\.0\.2\.1/);
});

test('enforceRateLimit rejects requests over the configured limit', async () => {
    const kv = new MemoryKv();
    const request = new Request('https://example.com/api/chat', {
        headers: { 'CF-Connecting-IP': '192.0.2.1' },
    });

    await enforceRateLimit({ kv, request, secret: 'secret', requestLimit: 1 });
    await assert.rejects(enforceRateLimit({ kv, request, secret: 'secret', requestLimit: 1 }), {
        code: 'rate_limited',
        status: 429,
    });
});
