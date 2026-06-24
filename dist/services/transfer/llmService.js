const DEFAULT_BACKEND_URL = 'https://api.contextflow.ai/v1/llm';
export class LLMService {
    constructor(options) {
        this.backendUrl = options?.backendUrl ?? DEFAULT_BACKEND_URL;
        this.apiKey = options?.apiKey;
    }
    async generateCompletion(prompt, systemPrompt, maxTokens = 512) {
        const payload = {
            prompt,
            systemPrompt,
            maxTokens,
        };
        const response = await this.callBackend('/completion', payload);
        return response.text ?? response.output ?? '';
    }
    async generateStructuredCompletion(prompt, systemPrompt, maxTokens = 512) {
        const payload = {
            prompt,
            systemPrompt,
            maxTokens,
            structured: true,
        };
        const response = await this.callBackend('/structured', payload);
        return response;
    }
    async callBackend(path, payload) {
        const response = await fetch(`${this.backendUrl}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`LLM backend returned ${response.status}: ${body}`);
        }
        return response.json();
    }
}
export const llmService = new LLMService();
