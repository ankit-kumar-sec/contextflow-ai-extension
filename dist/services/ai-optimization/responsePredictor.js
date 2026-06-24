import { llmService } from '@/services/transfer/llmService';
import { optimizationCache } from './cache';
export class ResponsePredictor {
    static getInstance() {
        if (!ResponsePredictor._instance) {
            ResponsePredictor._instance = new ResponsePredictor();
        }
        return ResponsePredictor._instance;
    }
    async predict(request) {
        if (!request.prompt) {
            throw new Error('Draft message is required for response prediction.');
        }
        const cacheKey = optimizationCache.hash({
            type: 'response-predict',
            draft: request.prompt.slice(-500),
            conversationHistory: request.conversationHistory?.slice(-500),
            recipientInfo: request.recipientInfo,
        });
        const cached = optimizationCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const systemPrompt = `You are a response prediction specialist. Predict how the recipient is likely to react to the draft message, including tone, objections, questions, and counter-strategies.`;
        const userMessage = `Conversation history:\n${request.conversationHistory ?? 'No conversation history.'}\n\nDraft message:\n${request.prompt}\n\nRecipient info:\n${request.recipientInfo ? JSON.stringify(request.recipientInfo) : 'No recipient metadata.'}\n\nReturn a JSON object with keys: predictedSentiment, likelyObjections, potentialQuestions, suggestedCounterStrategies, confidence.`;
        try {
            const result = await llmService.generateStructuredCompletion(userMessage, systemPrompt);
            const prediction = {
                predictedSentiment: result.predictedSentiment || 'neutral',
                likelyObjections: result.likelyObjections || [],
                potentialQuestions: result.potentialQuestions || [],
                suggestedCounterStrategies: result.suggestedCounterStrategies || [],
                confidence: typeof result.confidence === 'number' ? result.confidence : 0.6,
                usage: { promptTokens: 0, completionTokens: 0 },
            };
            optimizationCache.set(cacheKey, prediction, 30 * 60 * 1000);
            return prediction;
        }
        catch (error) {
            console.error('[ResponsePredictor] prediction failed', error);
            return {
                predictedSentiment: 'neutral',
                likelyObjections: ['No objections could be generated.'],
                potentialQuestions: ['What are the next steps?'],
                suggestedCounterStrategies: ['Ask a clarifying question and confirm alignment.'],
                confidence: 0.25,
                usage: { promptTokens: 0, completionTokens: 0 },
            };
        }
    }
}
export const responsePredictor = ResponsePredictor.getInstance();
