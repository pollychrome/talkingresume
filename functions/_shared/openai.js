import { AppError } from './errors.js';

export const DEFAULT_OPENAI_MODEL = 'gpt-5.6-luna';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const REQUEST_TIMEOUT_MS = 20_000;

export async function generateAnswer({
    apiKey,
    instructions,
    message,
    model = DEFAULT_OPENAI_MODEL,
    fetchImpl = fetch,
    requestId = crypto.randomUUID(),
    timeoutMs = REQUEST_TIMEOUT_MS,
}) {
    if (!apiKey) {
        throw new AppError('Chat is temporarily unavailable.', {
            code: 'service_unavailable',
            status: 503,
        });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;

    try {
        response = await fetchImpl(OPENAI_RESPONSES_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'X-Client-Request-Id': requestId,
            },
            body: JSON.stringify({
                model,
                instructions,
                input: message,
                max_output_tokens: 400,
                store: false,
            }),
            signal: controller.signal,
        });
    } catch (error) {
        const timedOut = error?.name === 'AbortError';
        const appError = new AppError(
            timedOut
                ? 'The chat service timed out. Please try again.'
                : 'The chat service is unavailable.',
            {
                code: timedOut ? 'upstream_timeout' : 'upstream_unavailable',
                status: timedOut ? 504 : 502,
                cause: error,
            },
        );
        appError.requestId = requestId;
        throw appError;
    } finally {
        clearTimeout(timeout);
    }

    const responseRequestId = response.headers.get('x-request-id');
    let data;
    try {
        data = await readResponseBody(response);
    } catch (error) {
        error.requestId = responseRequestId;
        throw error;
    }

    if (!response.ok) {
        const error = new AppError('The chat service could not complete the request.', {
            code: 'upstream_error',
            status: 502,
        });
        error.requestId = responseRequestId;
        error.upstreamStatus = response.status;
        throw error;
    }

    const answer = extractOutputText(data);
    if (!answer) {
        const error = new AppError('The chat service returned an empty response.', {
            code: 'empty_upstream_response',
            status: 502,
        });
        error.requestId = responseRequestId;
        throw error;
    }

    return { answer, requestId: responseRequestId };
}

export function extractOutputText(data) {
    if (typeof data?.output_text === 'string') {
        return data.output_text.trim();
    }

    return (data?.output ?? [])
        .flatMap((item) => item?.content ?? [])
        .filter((item) => item?.type === 'output_text' && typeof item.text === 'string')
        .map((item) => item.text)
        .join('')
        .trim();
}

async function readResponseBody(response) {
    try {
        return await response.json();
    } catch (error) {
        throw new AppError('The chat service returned an invalid response.', {
            code: 'invalid_upstream_response',
            status: 502,
            cause: error,
        });
    }
}
