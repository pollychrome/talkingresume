import assert from 'node:assert/strict';
import test from 'node:test';

import { extractOutputText, generateAnswer } from '../functions/_shared/openai.js';

test('extractOutputText joins response output text parts', () => {
    const text = extractOutputText({
        output: [
            { content: [{ type: 'output_text', text: 'Hello ' }] },
            { content: [{ type: 'output_text', text: 'world' }] },
        ],
    });

    assert.equal(text, 'Hello world');
});

test('generateAnswer maps upstream errors to a safe application error', async () => {
    const fetchImpl = () =>
        Promise.resolve(
            Response.json(
                { error: { message: 'sensitive provider detail' } },
                { status: 429, headers: { 'x-request-id': 'request-456' } },
            ),
        );

    await assert.rejects(
        generateAnswer({
            apiKey: 'test-key',
            instructions: 'instructions',
            message: 'message',
            fetchImpl,
        }),
        (error) => {
            assert.equal(error.code, 'upstream_error');
            assert.equal(error.status, 502);
            assert.equal(error.requestId, 'request-456');
            assert.doesNotMatch(error.message, /sensitive provider detail/);
            return true;
        },
    );
});
