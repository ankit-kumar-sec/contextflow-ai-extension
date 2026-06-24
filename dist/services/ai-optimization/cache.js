const DEFAULT_TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 120;
export class OptimizationCache {
    constructor() {
        this.cache = new Map();
    }
    set(key, result, ttl = DEFAULT_TTL_MS) {
        this.ensureCapacity();
        this.cache.set(key, {
            result,
            expiresAt: Date.now() + ttl,
        });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.result;
    }
    delete(key) {
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    ensureCapacity() {
        if (this.cache.size < MAX_ENTRIES)
            return;
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
    hash(value) {
        const raw = JSON.stringify(value, Object.keys(value).sort());
        let hash = 5381;
        for (let i = 0; i < raw.length; i += 1) {
            hash = (hash * 33) ^ raw.charCodeAt(i);
        }
        return (hash >>> 0).toString(36);
    }
}
export const optimizationCache = new OptimizationCache();
