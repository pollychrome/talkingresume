import resumeContext from '../../src/context/hidden-context.json' with { type: 'json' };

import { AppError, isAppError } from '../_shared/errors.js';
import { errorResponse, jsonResponse, methodNotAllowed, readJson } from '../_shared/http.js';
import { writeInteractionLog } from '../_shared/logging.js';
import { generateAnswer } from '../_shared/openai.js';
import { buildInstructions } from '../_shared/prompt.js';
import { enforceRateLimit } from '../_shared/rate-limit.js';
import { selectRelevantContext } from '../_shared/resume-context.js';

const MAX_MESSAGE_LENGTH = 280;

export async function onRequest(context) {
    if (context.request.method !== 'POST') {
        return methodNotAllowed(['POST']);
    }

    const timestamp = new Date().toISOString();
    let message;

    try {
        const body = await readJson(context.request);
        message = validateMessage(body?.message);

        await enforceRateLimit({
            kv: context.env.RESUME_DATA,
            request: context.request,
            secret:
                context.env.RATE_LIMIT_SALT ??
                context.env.ADMIN_SECRET ??
                context.env.OPENAI_API_KEY,
            requestLimit: context.env.CHAT_RATE_LIMIT_PER_MINUTE,
        });

        const relevantContext = selectRelevantContext(message, resumeContext);
        const { answer, requestId } = await generateAnswer({
            apiKey: context.env.OPENAI_API_KEY,
            model: context.env.OPENAI_MODEL,
            instructions: buildInstructions(relevantContext),
            message,
        });

        scheduleLog(context, {
            sessionId: context.request.headers.get('X-Chat-Session'),
            timestamp,
            question: message,
            answer,
            requestId,
        });

        return jsonResponse({ message: answer });
    } catch (error) {
        const appError = isAppError(error)
            ? error
            : new AppError('The request could not be completed.');

        if (appError.status >= 500) {
            console.error('Chat request failed', {
                code: appError.code,
                requestId: appError.requestId,
                status: appError.status,
                upstreamStatus: appError.upstreamStatus,
            });
        }

        if (message) {
            scheduleLog(context, {
                sessionId: context.request.headers.get('X-Chat-Session'),
                timestamp,
                question: message,
                errorCode: appError.code,
                requestId: appError.requestId,
            });
        }

        const response = errorResponse(appError);
        if (appError.retryAfter) {
            response.headers.set('Retry-After', String(appError.retryAfter));
        }
        return response;
    }
}

export function validateMessage(value) {
    if (typeof value !== 'string') {
        throw new AppError('Message must be a string.', {
            code: 'invalid_message',
            status: 400,
        });
    }

    const message = value.trim();
    if (!message) {
        throw new AppError('Message is required.', {
            code: 'invalid_message',
            status: 400,
        });
    }

    if ([...message].length > MAX_MESSAGE_LENGTH) {
        throw new AppError(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`, {
            code: 'invalid_message',
            status: 400,
        });
    }

    return message;
}

function scheduleLog(context, entry) {
    if (!context.env.RESUME_DATA || context.env.CHAT_LOGGING_ENABLED === 'false') {
        return;
    }

    const logPromise = writeInteractionLog(context.env.RESUME_DATA, entry, {
        retentionDays: context.env.CHAT_LOG_RETENTION_DAYS,
    }).catch((error) => {
        console.error('Interaction logging failed', { name: error.name });
    });

    context.waitUntil?.(logPromise);
}
