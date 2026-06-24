/**
 * Secure Backend Proxy
 *
 * All LLM requests go through a secure backend proxy instead of directly to OpenAI/etc.
 * This allows:
 * - API key protection (never exposed in client)
 * - Rate limiting and quota management
 * - Request validation and sanitization
 * - Audit logging
 * - Cost control
 */
export class BackendProxy {
    constructor(apiUrl, apiKey, model = 'gpt-4') {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.model = model;
    }
    async sendRequest(payload) {
        if (!this.apiKey) {
            return {
                success: false,
                error: 'API key not configured. Please visit extension settings.',
                timestamp: Date.now(),
            };
        }
        try {
            const response = await fetch(`${this.apiUrl}/llm/proxy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                    'User-Agent': 'ContextFlow-Extension/0.1.0',
                    'X-Request-ID': this.generateRequestId(),
                },
                body: JSON.stringify({
                    ...payload,
                    model: payload.model || this.model,
                    timestamp: Date.now(),
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                const errorMsg = response.status === 401 ? 'Authentication failed. Check your API key.' : `Backend error: ${response.status}`;
                return {
                    success: false,
                    error: errorMsg,
                    timestamp: Date.now(),
                };
            }
            const data = (await response.json());
            return data;
        }
        catch (error) {
            console.error('[BackendProxy] Request failed:', error);
            return {
                success: false,
                error: `Network error: ${error?.message || 'Unknown'}`,
                timestamp: Date.now(),
            };
        }
    }
    async sendCompletion(prompt, systemPrompt, maxTokens = 512) {
        const response = await this.sendRequest({
            type: 'completion',
            prompt,
            systemPrompt,
            maxTokens,
        });
        if (!response.success || !response.data) {
            throw new Error(response.error || 'Completion failed');
        }
        return response.data.text;
    }
    async sendStructuredCompletion(prompt, systemPrompt) {
        const response = await this.sendRequest({
            type: 'structured_completion',
            prompt,
            systemPrompt,
        });
        if (!response.success || !response.data) {
            throw new Error(response.error || 'Structured completion failed');
        }
        return response.data;
    }
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Health check: verify backend connectivity and authentication.
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.apiUrl}/health`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                },
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
}
let proxyInstance = null;
export function initializeBackendProxy(apiUrl, apiKey, model) {
    proxyInstance = new BackendProxy(apiUrl, apiKey, model);
}
export function getBackendProxy() {
    if (!proxyInstance) {
        throw new Error('Backend proxy not initialized. Call initializeBackendProxy first.');
    }
    return proxyInstance;
}
