import { llmService } from '@/services/transfer/llmService';
import { optimizationCache } from './cache';
export class ContextCompressor {
    static getInstance() {
        if (!ContextCompressor._instance) {
            ContextCompressor._instance = new ContextCompressor();
        }
        return ContextCompressor._instance;
    }
    async compress(request) {
        const source = request.conversationHistory ?? request.prompt ?? '';
        if (source.length < 400) {
            return {
                summary: source,
                keyPoints: source ? [source.trim()] : [],
                entities: [],
                actionItems: [],
                tokenCount: Math.ceil(source.length / 4),
                originalTokens: Math.ceil(source.length / 4),
                compressedTokens: Math.ceil(source.length / 4),
            };
        }
        const cacheKey = optimizationCache.hash({
            type: 'context-compress',
            source: source.slice(-2000),
            tier: request.workspaceTier,
        });
        const cached = optimizationCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const maxSummaryWords = request.workspaceTier === 'free' ? 120 : request.workspaceTier === 'pro' ? 240 : 360;
        const systemPrompt = `You are a context compression engine. Compress the text into a concise, relevant summary with clear action items and entities. Preserve meaning and leave out noise.`;
        const userMessage = `Conversation content:\n${source}\n\nReturn JSON with keys:\n- summary\n- keyPoints\n- entities\n- actionItems\n
The summary should not exceed ${maxSummaryWords} words.`;
        try {
            const result = await llmService.generateStructuredCompletion(userMessage, systemPrompt);
            const compressed = {
                summary: result.summary.trim(),
                keyPoints: result.keyPoints || [],
                entities: result.entities || [],
                actionItems: result.actionItems || [],
                tokenCount: Math.ceil(result.summary.length / 4) + Math.ceil((result.keyPoints || []).join(' ').length / 4),
                originalTokens: Math.ceil(source.length / 4),
                compressedTokens: Math.ceil(result.summary.length / 4),
            };
            optimizationCache.set(cacheKey, compressed, 2 * 60 * 60 * 1000);
            return compressed;
        }
        catch (error) {
            console.error('[ContextCompressor] compression failed', error);
            const fallbackSummary = source.slice(0, 1200).trim() + (source.length > 1200 ? '...' : '');
            return {
                summary: fallbackSummary,
                keyPoints: ['Compression fallback used due to processing error.'],
                entities: [],
                actionItems: [],
                tokenCount: Math.ceil(fallbackSummary.length / 4),
                originalTokens: Math.ceil(source.length / 4),
                compressedTokens: Math.ceil(fallbackSummary.length / 4),
            };
        }
    }
}
export const contextCompressor = ContextCompressor.getInstance();
