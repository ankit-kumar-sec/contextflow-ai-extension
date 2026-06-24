"use strict";
const DEFAULT_SETTINGS = {
    apiUrl: 'https://api.contextflow.ai/v1',
    apiKey: '',
    llmModel: 'gpt-4',
    workspaceTier: 'pro',
    dataRetention: 90,
    anonymizeLogs: true,
    incognitoMode: true,
    showNotifications: true,
    autoOptimize: false,
    enableAnalytics: true,
};
async function loadSettings() {
    const stored = await chrome.storage.local.get('contextflow_settings');
    const settings = { ...DEFAULT_SETTINGS, ...(stored.contextflow_settings || {}) };
    document.getElementById('apiUrl').value = settings.apiUrl;
    document.getElementById('apiKey').value = settings.apiKey;
    document.getElementById('llmModel').value = settings.llmModel;
    document.getElementById('dataRetention').value = settings.dataRetention.toString();
    document.getElementById('anonymizeLogs').checked = settings.anonymizeLogs;
    document.getElementById('incognitoMode').checked = settings.incognitoMode;
    document.getElementById('showNotifications').checked = settings.showNotifications;
    document.getElementById('autoOptimize').checked = settings.autoOptimize;
    document.getElementById('enableAnalytics').checked = settings.enableAnalytics;
    document.querySelector(`.tier-option[data-tier="${settings.workspaceTier}"]`)?.classList.add('selected');
}
async function saveSettings() {
    const settings = {
        apiUrl: document.getElementById('apiUrl').value,
        apiKey: document.getElementById('apiKey').value,
        llmModel: document.getElementById('llmModel').value,
        workspaceTier: document.querySelector('.tier-option.selected')?.getAttribute('data-tier') || 'pro',
        dataRetention: parseInt(document.getElementById('dataRetention').value, 10),
        anonymizeLogs: document.getElementById('anonymizeLogs').checked,
        incognitoMode: document.getElementById('incognitoMode').checked,
        showNotifications: document.getElementById('showNotifications').checked,
        autoOptimize: document.getElementById('autoOptimize').checked,
        enableAnalytics: document.getElementById('enableAnalytics').checked,
    };
    await chrome.storage.local.set({ contextflow_settings: settings });
    showStatus('✅ Settings saved successfully!', 'success');
}
async function resetSettings() {
    if (confirm('Are you sure? This will reset all settings to defaults.')) {
        await chrome.storage.local.remove('contextflow_settings');
        window.location.reload();
    }
}
async function deleteAllData() {
    if (confirm('⚠️ This will permanently delete all your local data. This action cannot be undone. Are you sure?')) {
        if (confirm('Please confirm one more time: Delete ALL data?')) {
            await chrome.storage.local.clear();
            showStatus('✅ All data deleted successfully.', 'success');
            setTimeout(() => loadSettings(), 1000);
        }
    }
}
function showStatus(message, type) {
    const el = document.getElementById('statusMessage');
    if (!el)
        return;
    el.textContent = message;
    el.className = `status-message ${type}`;
    setTimeout(() => {
        el.className = 'status-message';
    }, 4000);
}
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    document.querySelectorAll('.tier-option').forEach((option) => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.tier-option').forEach((o) => o.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        try {
            await saveSettings();
        }
        catch (error) {
            showStatus(`❌ Error saving settings: ${error?.message}`, 'error');
        }
    });
    document.getElementById('resetBtn')?.addEventListener('click', resetSettings);
    document.getElementById('deleteDataBtn')?.addEventListener('click', deleteAllData);
    document.getElementById('privacyBtn')?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://contextflow.ai/privacy' });
    });
    document.getElementById('termsBtn')?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://contextflow.ai/terms' });
    });
    document.getElementById('contactBtn')?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://contextflow.ai/support' });
    });
});
