import assert from 'node:assert/strict';
import test from 'node:test';

import { readInteractionLogs, writeInteractionLog } from '../functions/_shared/logging.js';
import { MemoryKv } from '../test-support/memory-kv.js';

test('writeInteractionLog stores one immutable entry without IP data', async () => {
    const kv = new MemoryKv();

    await writeInteractionLog(
        kv,
        {
            sessionId: 'session_identifier_1234',
            timestamp: '2026-07-18T12:00:00.000Z',
            question: 'Question',
            answer: 'Answer',
        },
        { retentionDays: 30 },
    );

    assert.equal(kv.entries.size, 1);
    const [key, value] = [...kv.entries.entries()][0];
    assert.match(key, /^interaction:/);
    assert.doesNotMatch(value, /ip|userAgent/i);
    assert.equal(kv.putOptions.get(key).expirationTtl, 30 * 86_400);
});

test('readInteractionLogs skips malformed entries', async () => {
    const kv = new MemoryKv({
        'interaction:1': JSON.stringify({
            sessionId: 'session_identifier_1234',
            timestamp: '2026-07-18T12:00:00.000Z',
            question: 'Question',
        }),
        'interaction:2': '{not-json',
        'interaction:3': JSON.stringify({ question: 'Missing timestamp' }),
        'unrelated:1': '{}',
    });

    const interactions = await readInteractionLogs(kv);

    assert.equal(interactions.length, 1);
    assert.equal(interactions[0].question, 'Question');
});

test('readInteractionLogs applies its limit to the newest entries', async () => {
    const kv = new MemoryKv();
    const baseEntry = {
        sessionId: 'session_identifier_1234',
        answer: 'Answer',
    };

    await writeInteractionLog(kv, {
        ...baseEntry,
        timestamp: '2026-07-17T12:00:00.000Z',
        question: 'Older',
    });
    await writeInteractionLog(kv, {
        ...baseEntry,
        timestamp: '2026-07-18T12:00:00.000Z',
        question: 'Newer',
    });

    const interactions = await readInteractionLogs(kv, { limit: 1 });

    assert.equal(interactions.length, 1);
    assert.equal(interactions[0].question, 'Newer');
});
