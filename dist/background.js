import { aiCoach, contextCompressor, promptOptimizer, responsePredictor } from './services/ai-optimization';
chrome.runtime.onInstalled.addListener(() => {
    console.log('ContextFlow AI extension installed.');
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const isTrustedSender = sender.id === chrome.runtime.id;
    if (!isTrustedSender) {
        console.warn('Rejected message from untrusted sender:', sender.id);
        return false;
    }
    if (!message || typeof message !== 'object') {
        return false;
    }
    const request = message.request;
    if (message.type === 'OPTIMIZE_PROMPT' && request) {
        promptOptimizer.optimize(request).then((result) => sendResponse({ result })).catch((error) => sendResponse({ error: error?.message ?? 'Unknown error' }));
        return true;
    }
    if (message.type === 'COMPRESS_CONTEXT' && request) {
        contextCompressor.compress(request).then((result) => sendResponse({ result })).catch((error) => sendResponse({ error: error?.message ?? 'Unknown error' }));
        return true;
    }
    if (message.type === 'AI_COACH' && request) {
        aiCoach.coach(request).then((result) => sendResponse({ result })).catch((error) => sendResponse({ error: error?.message ?? 'Unknown error' }));
        return true;
    }
    if (message.type === 'PREDICT_RESPONSE' && request) {
        responsePredictor.predict(request).then((result) => sendResponse({ result })).catch((error) => sendResponse({ error: error?.message ?? 'Unknown error' }));
        return true;
    }
    return false;
});
