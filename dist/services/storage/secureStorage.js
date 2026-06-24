export class SecureStorage {
    constructor() {
        this.sessionCache = new Map();
    }
    async get(key, useSession = false) {
        if (useSession) {
            const cached = this.sessionCache.get(key);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.value;
            }
            this.sessionCache.delete(key);
            return null;
        }
        const data = await chrome.storage.local.get(key);
        return data[key] || null;
    }
    async set(key, value, ttlMs = 0, useSession = false) {
        if (useSession) {
            this.sessionCache.set(key, {
                value,
                expiresAt: ttlMs > 0 ? Date.now() + ttlMs : Number.MAX_SAFE_INTEGER,
            });
            return;
        }
        if (ttlMs > 0) {
            const entry = {
                value,
                expiresAt: Date.now() + ttlMs,
            };
            await chrome.storage.local.set({ [key]: entry });
        }
        else {
            await chrome.storage.local.set({ [key]: value });
        }
    }
    async delete(key) {
        this.sessionCache.delete(key);
        await chrome.storage.local.remove(key);
    }
    async clear() {
        this.sessionCache.clear();
        await chrome.storage.local.clear();
    }
    /**
     * Derive an encryption key from session token using PBKDF2.
     * Never store the master key; derive it on demand.
     */
    async deriveEncryptionKey(sessionToken) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(sessionToken + '__contextflow__salt'), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey({
            name: 'PBKDF2',
            salt: encoder.encode('contextflow-extension'),
            iterations: 100000,
            hash: 'SHA-256',
        }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }
    /**
     * Encrypt sensitive data (like API keys) using AES-GCM.
     */
    async encryptSensitive(data, sessionToken) {
        const key = await this.deriveEncryptionKey(sessionToken);
        const encoder = new TextEncoder();
        const plaintext = encoder.encode(data);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(ciphertext), iv.length);
        return btoa(String.fromCharCode(...combined));
    }
    /**
     * Decrypt sensitive data.
     */
    async decryptSensitive(encrypted, sessionToken) {
        const key = await this.deriveEncryptionKey(sessionToken);
        const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        const decoder = new TextDecoder();
        return decoder.decode(plaintext);
    }
}
export const secureStorage = new SecureStorage();
