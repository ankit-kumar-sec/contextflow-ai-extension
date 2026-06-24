export { promptOptimizer } from './promptOptimizer';
export { contextCompressor } from './contextCompressor';
export { aiCoach } from './aiCoach';
export { responsePredictor } from './responsePredictor';
export * from './types';
import { promptOptimizer } from './promptOptimizer';
import { contextCompressor } from './contextCompressor';
export async function optimizeAndCompress(request) {
    const compressed = await contextCompressor.compress(request);
    const optimized = await promptOptimizer.optimize({
        ...request,
        prompt: request.prompt ?? compressed.summary,
        conversationHistory: compressed.summary,
    });
    return { compressed, optimized };
}
