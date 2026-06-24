"use strict";
const state = {
    activeTab: 'optimizer',
    results: {
        optimizer: '',
        compress: '',
        coach: '',
        predict: '',
    },
};
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach((el) => el.classList.remove('active'));
    document.getElementById(tabName)?.classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    state.activeTab = tabName;
}
function showLoading(tabName) {
    const loadingEl = document.getElementById(`${tabName}Loading`);
    const resultEl = document.getElementById(`${tabName}Result`);
    if (loadingEl)
        loadingEl.style.display = 'block';
    if (resultEl)
        resultEl.style.display = 'none';
}
function hideLoading(tabName) {
    const loadingEl = document.getElementById(`${tabName}Loading`);
    if (loadingEl)
        loadingEl.style.display = 'none';
}
function displayResult(tabName, result, isError = false) {
    const resultEl = document.getElementById(`${tabName}Result`);
    if (!resultEl)
        return;
    resultEl.textContent = result;
    resultEl.classList.toggle('error', isError);
    resultEl.classList.toggle('success', !isError);
    resultEl.style.display = 'block';
    state.results[tabName] = result;
}
async function callBackgroundService(type, request) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type, request }, (response) => {
            if (!response) {
                reject(new Error('No response from background service'));
                return;
            }
            if (response.error) {
                reject(new Error(response.error));
                return;
            }
            resolve(response.result);
        });
    });
}
function formatOptimizedPromptResult(result) {
    const { optimized, improvements, tokenSavings } = result;
    const lines = [
        '✅ Optimization Complete',
        '',
        `📝 Optimized Prompt:\n${optimized}`,
        '',
        `💾 Token Savings: ${tokenSavings || 0} tokens`,
        '',
        `🎯 Improvements Applied:`,
        ...(improvements || []).map((imp) => `  • ${imp}`),
    ];
    return lines.join('\n');
}
function formatCompressedContextResult(result) {
    const { summary, keyPoints, actionItems, compressedTokens, originalTokens } = result;
    const lines = [
        '✅ Context Compressed',
        '',
        `📄 Summary:\n${summary}`,
        '',
        `🔑 Key Points:`,
        ...(keyPoints || []).map((kp) => `  • ${kp}`),
        '',
        `✅ Action Items:`,
        ...(actionItems || []).map((ai) => `  • ${ai}`),
        '',
        `💾 Token Reduction: ${originalTokens - compressedTokens} tokens saved`,
    ];
    return lines.join('\n');
}
function formatCoachingAdviceResult(result) {
    const { overall, toneSuggestion, contentSuggestions, nextStepRecommendation, confidence } = result;
    const lines = [
        '✅ Coaching Analysis Complete',
        '',
        `📊 Overall Assessment:\n${overall}`,
        '',
        `🎤 Tone Suggestion:\n${toneSuggestion}`,
        '',
        `📋 Content Suggestions:`,
        ...(contentSuggestions || []).map((cs) => `  • ${cs}`),
        '',
        `➡️ Next Step:\n${nextStepRecommendation}`,
        '',
        `🎯 Confidence: ${(confidence * 100).toFixed(0)}%`,
    ];
    return lines.join('\n');
}
function formatPredictedResponseResult(result) {
    const { predictedSentiment, likelyObjections, potentialQuestions, suggestedCounterStrategies, confidence } = result;
    const lines = [
        '✅ Response Prediction Complete',
        '',
        `💭 Predicted Sentiment: ${predictedSentiment.toUpperCase()}`,
        '',
        `⚠️ Likely Objections:`,
        ...(likelyObjections || []).map((lo) => `  • ${lo}`),
        '',
        `❓ Potential Questions:`,
        ...(potentialQuestions || []).map((pq) => `  • ${pq}`),
        '',
        `🛡️ Counter-Strategies:`,
        ...(suggestedCounterStrategies || []).map((cs) => `  • ${cs}`),
        '',
        `🎯 Confidence: ${(confidence * 100).toFixed(0)}%`,
    ];
    return lines.join('\n');
}
async function handleOptimizeClick() {
    const prompt = document.getElementById('optimizerPrompt')?.value?.trim();
    const conversationHistory = document.getElementById('optimizerHistory')?.value?.trim();
    const tier = document.getElementById('optimizerTier')?.value;
    if (!prompt) {
        displayResult('optimizer', '❌ Please enter a prompt to optimize.', true);
        return;
    }
    showLoading('optimizer');
    try {
        const result = await callBackgroundService('OPTIMIZE_PROMPT', {
            prompt,
            conversationHistory: conversationHistory || undefined,
            workspaceTier: tier,
        });
        const formatted = formatOptimizedPromptResult(result);
        displayResult('optimizer', formatted);
    }
    catch (error) {
        displayResult('optimizer', `❌ Error: ${error?.message || 'Unknown error'}`, true);
    }
    finally {
        hideLoading('optimizer');
    }
}
async function handleCompressClick() {
    const text = document.getElementById('compressText')?.value?.trim();
    const tier = document.getElementById('compressTier')?.value;
    if (!text) {
        displayResult('compress', '❌ Please enter text to compress.', true);
        return;
    }
    showLoading('compress');
    try {
        const result = await callBackgroundService('COMPRESS_CONTEXT', {
            conversationHistory: text,
            workspaceTier: tier,
        });
        const formatted = formatCompressedContextResult(result);
        displayResult('compress', formatted);
    }
    catch (error) {
        displayResult('compress', `❌ Error: ${error?.message || 'Unknown error'}`, true);
    }
    finally {
        hideLoading('compress');
    }
}
async function handleCoachClick() {
    const draft = document.getElementById('coachDraft')?.value?.trim();
    const history = document.getElementById('coachHistory')?.value?.trim();
    const name = document.getElementById('coachRecipient')?.value?.trim();
    const role = document.getElementById('coachRole')?.value?.trim();
    if (!draft) {
        displayResult('coach', '❌ Please enter a draft to analyze.', true);
        return;
    }
    showLoading('coach');
    try {
        const result = await callBackgroundService('AI_COACH', {
            prompt: draft,
            conversationHistory: history || undefined,
            recipientInfo: name || role ? { name: name || undefined, role: role || undefined } : undefined,
            workspaceTier: 'pro',
        });
        const formatted = formatCoachingAdviceResult(result);
        displayResult('coach', formatted);
    }
    catch (error) {
        displayResult('coach', `❌ Error: ${error?.message || 'Unknown error'}`, true);
    }
    finally {
        hideLoading('coach');
    }
}
async function handlePredictClick() {
    const draft = document.getElementById('predictDraft')?.value?.trim();
    const history = document.getElementById('predictHistory')?.value?.trim();
    const name = document.getElementById('predictRecipient')?.value?.trim();
    const role = document.getElementById('predictRole')?.value?.trim();
    if (!draft) {
        displayResult('predict', '❌ Please enter a draft to analyze.', true);
        return;
    }
    showLoading('predict');
    try {
        const result = await callBackgroundService('PREDICT_RESPONSE', {
            prompt: draft,
            conversationHistory: history || undefined,
            recipientInfo: name || role ? { name: name || undefined, role: role || undefined } : undefined,
            workspaceTier: 'pro',
        });
        const formatted = formatPredictedResponseResult(result);
        displayResult('predict', formatted);
    }
    catch (error) {
        displayResult('predict', `❌ Error: ${error?.message || 'Unknown error'}`, true);
    }
    finally {
        hideLoading('predict');
    }
}
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.getAttribute('data-tab');
            switchTab(tab);
        });
    });
    document.getElementById('optimizeBtn')?.addEventListener('click', handleOptimizeClick);
    document.getElementById('compressBtn')?.addEventListener('click', handleCompressClick);
    document.getElementById('coachBtn')?.addEventListener('click', handleCoachClick);
    document.getElementById('predictBtn')?.addEventListener('click', handlePredictClick);
    document.getElementById('settingsLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage?.();
    });
    document.getElementById('helpLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('ContextFlow AI - Quick Help\n\n' +
            '🔧 Optimize: Improve your prompt quality and clarity\n' +
            '📦 Compress: Summarize long conversations\n' +
            '💡 Coach: Get advice on your draft messages\n' +
            '🔮 Predict: Forecast how recipients might respond\n\n' +
            'Need help? Visit: https://contextflow.ai/help');
    });
});
