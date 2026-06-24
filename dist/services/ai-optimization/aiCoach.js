import { llmService } from '@/services/transfer/llmService';
import { optimizationCache } from './cache';
export class AICoach {
    static getInstance() {
        if (!AICoach._instance) {
            AICoach._instance = new AICoach();
        }
        return AICoach._instance;
    }
    async coach(request) {
        const cacheKey = optimizationCache.hash({
            type: 'ai-coach',
            prompt: request.prompt?.slice(-500),
            conversationHistory: request.conversationHistory?.slice(-1000),
            recipientInfo: request.recipientInfo,
        });
        const cached = optimizationCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const systemPrompt = `You are an executive communication coach. Analyze the draft and the conversation history, then provide actionable advice for clarity, tone, structure, and next steps.`;
        const userMessage = `Conversation history:\n${request.conversationHistory ?? 'No history provided.'}\n\nDraft:\n${request.prompt}\n\nRecipient info:\n${request.recipientInfo ? JSON.stringify(request.recipientInfo) : 'No recipient metadata.'}\n\nReturn a JSON object with keys: overall, toneSuggestion, contentSuggestions, missingContext, nextStepRecommendation, confidence.`;
        try {
            const result = await llmService.generateStructuredCompletion(userMessage, systemPrompt);
            const advice = {
                overall: result.overall.trim(),
                toneSuggestion: result.toneSuggestion.trim(),
                contentSuggestions: result.contentSuggestions || [],
                missingContext: result.missingContext || [],
                nextStepRecommendation: result.nextStepRecommendation.trim(),
                confidence: typeof result.confidence === 'number' ? result.confidence : 0.65,
                usage: { promptTokens: 0, completionTokens: 0 },
            };
            optimizationCache.set(cacheKey, advice, 30 * 60 * 1000);
            return advice;
        }
        catch (error) {
            console.error('[AICoach] coach failed', error);
            return {
                overall: 'Unable to generate coaching feedback at this time.',
                toneSuggestion: 'Use a professional and concise tone.',
                contentSuggestions: ['Make your purpose clearer.', 'Add a direct next step.'],
                missingContext: ['Recipient goals', 'Expected timeline'],
                nextStepRecommendation: 'Review the draft for clarity and add a specific call to action.',
                confidence: 0.3,
                usage: { promptTokens: 0, completionTokens: 0 },
            };
        }
    }
}
export const aiCoach = AICoach.getInstance();
