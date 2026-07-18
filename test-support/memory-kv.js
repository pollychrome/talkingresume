export class MemoryKv {
    constructor(entries = {}) {
        this.entries = new Map(Object.entries(entries));
        this.putOptions = new Map();
    }

    get(key) {
        return Promise.resolve(this.entries.get(key) ?? null);
    }

    put(key, value, options = {}) {
        this.entries.set(key, value);
        this.putOptions.set(key, options);
        return Promise.resolve();
    }

    list({ prefix = '', cursor, limit = 1_000 } = {}) {
        const matchingKeys = [...this.entries.keys()]
            .filter((key) => key.startsWith(prefix))
            .sort();
        const offset = Number(cursor ?? 0);
        const page = matchingKeys.slice(offset, offset + limit);
        const nextOffset = offset + page.length;

        return Promise.resolve({
            keys: page.map((name) => ({ name })),
            cursor: String(nextOffset),
            list_complete: nextOffset >= matchingKeys.length,
        });
    }
}
