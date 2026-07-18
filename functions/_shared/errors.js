export class AppError extends Error {
    constructor(message, { code = 'internal_error', status = 500, cause } = {}) {
        super(message, { cause });
        this.name = 'AppError';
        this.code = code;
        this.status = status;
    }
}

export function isAppError(error) {
    return error instanceof AppError;
}
