import assert from 'node:assert/strict';
import test from 'node:test';

import { onRequest } from '../functions/api/chat.js';

test('chat endpoint validates the HTTP method', async () => {
    const response = await onRequest({
        request: new Request('https://example.com/api/chat'),
        env: {},
    });

    assert.equal(response.status, 405);
    assert.equal(response.headers.get('Allow'), 'POST');
});

test('chat endpoint rejects an empty message without calling OpenAI', async (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', () => {
        throw new Error('fetch should not be called');
    });
    const response = await onRequest({
        request: createChatRequest('  '),
        env: { OPENAI_API_KEY: 'test-key' },
    });

    assert.equal(response.status, 400);
    assert.equal(fetchMock.mock.callCount(), 0);
    assert.deepEqual(await response.json(), {
        error: {
            code: 'invalid_message',
            message: 'Message is required.',
        },
    });
});

test('chat endpoint calls the Responses API with privacy-safe defaults', async (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', () =>
        Promise.resolve(
            Response.json(
                {
                    output: [
                        {
                            content: [{ type: 'output_text', text: 'A concise answer.' }],
                        },
                    ],
                },
                { headers: { 'x-request-id': 'request-123' } },
            ),
        ),
    );
    const response = await onRequest({
        request: createChatRequest('What are your skills?'),
        env: { OPENAI_API_KEY: 'test-key' },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { message: 'A concise answer.' });
    assert.equal(fetchMock.mock.callCount(), 1);

    const [url, options] = fetchMock.mock.calls[0].arguments;
    const body = JSON.parse(options.body);
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(body.model, 'gpt-5.6-luna');
    assert.equal(body.store, false);
    assert.equal(body.input, 'What are your skills?');
    assert.doesNotMatch(options.headers.Authorization, /undefined/);
});

function createChatRequest(message) {
    return new Request('https://example.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });
}
