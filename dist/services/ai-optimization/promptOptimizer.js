import { llmService } from '@/services/transfer/llmService';
import { optimizationCache } from './cache';
export class PromptOptimizer {
    static getInstance() {
        if (!PromptOptimizer._instance) {
            PromptOptimizer._instance = new PromptOptimizer();
        }
        return PromptOptimizer._instance;
    }
    async optimize(request) {
        const cacheKey = optimizationCache.hash({
            type: 'prompt-optimize',
            prompt: request.prompt,
            conversationHistory: request.conversationHistory?.slice(-1000),
            tier: request.workspaceTier,
            recipientInfo: request.recipientInfo,
        });
        const cached = optimizationCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const tier = request.workspaceTier ?? 'pro';
        const strategies = this.buildStrategyList(tier, request.customInstructions);
        const systemPrompt = `You are an expert prompt engineer. Improve the user's prompt to maximize relevance, precision, and usefulness while keeping it concise.`;
        const userMessage = `Original prompt:\n${request.prompt}\n\n${request.conversationHistory ? `Conversation history:\n${request.conversationHistory}\n\n` : ''}${request.recipientInfo ? `Recipient info: ${JSON.stringify(request.recipientInfo)}\n\n` : ''}Apply the following guidelines:\n${strategies.map((strategy) => `- ${strategy}`).join('\n')}\n\nReturn only the optimized prompt.`;
        try {
            const optimized = (await llmService.generateCompletion(userMessage, systemPrompt, 500)).trim();
            const improvements = this.evaluateImprovements(request.prompt, optimized);
            const result = {
                original: request.prompt,
                optimized,
                tokenSavings: this.estimateTokenSavings(request.prompt, optimized),
                improvements,
                usage: { promptTokens: 0, completionTokens: 0 },
            };
            optimizationCache.set(cacheKey, result, 60 * 60 * 1000);
            return result;
        }
        catch (error) {
            console.error('[PromptOptimizer] optimization failed', error);
            return {
                original: request.prompt,
                optimized: request.prompt,
                tokenSavings: 0,
                improvements: ['Fallback returned original prompt due to optimization failure.'],
                usage: { promptTokens: 0, completionTokens: 0 },
            };
        }
    }
    buildStrategyList(tier, customInstructions) {
        const list = [
            'Clarify the user goal explicitly.',
            'Structure the request with clear roles, constraints, and output format.',
            'Reduce ambiguity and avoid generic wording.',
            'Preserve important context from the conversation history.',
        ];
        if (tier === 'pro' || tier === 'ultimate') {
            list.push('Include a preferred response length and tone.');
            list.push('Add optional examples or expected output patterns.');
        }
        if (tier === 'ultimate') {
            list.push('Add a short fallback strategy if the recipient asks for clarification.');
            list.push('Use role-based phrasing to bias the assistant toward expert answers.');
        }
        if (customInstructions) {
            list.push(`Respect these custom instructions: ${customInstructions}`);
        }
        return list;
    }
    estimateTokenSavings(original, optimized) {
        const originalTokens = Math.ceil(original.length / 4);
        const optimizedTokens = Math.ceil(optimized.length / 4);
        return Math.max(0, originalTokens - optimizedTokens);
    }
    evaluateImprovements(original, optimized) {
        if (original === optimized) {
            return ['Prompt already well-formed.'];
        }
        const improvements = [];
        if (optimized.length < original.length) {
            improvements.push('Reduced verbosity.');
        }
        if (optimized.includes('goal') || optimized.includes('objective')) {
            improvements.push('Clarified the objective.');
        }
        if (optimized.includes('step') || optimized.includes('outline') || optimized.includes('first')) {
            improvements.push('Added structure.');
        }
        if (improvements.length === 0) {
            improvements.push('Applied general prompt refinement.');
        }
        return improvements;
    }
}
export const promptOptimizer = PromptOptimizer.getInstance();
