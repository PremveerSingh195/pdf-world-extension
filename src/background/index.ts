/**
 * Chrome Extension Background Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[PDF Toolbox] Extension installed or updated:', details.reason);
  // Initialize default preferences in chrome.storage.local
  chrome.storage.local.get(['theme', 'recentTools', 'favorites'], (result) => {
    const updates: Record<string, any> = {};
    if (!result.theme) {
      updates.theme = 'system';
    }
    if (!result.recentTools) {
      updates.recentTools = ['merge', 'split', 'compress', 'organize', 'edit', 'sign'];
    }
    if (!result.favorites) {
      updates.favorites = ['merge', 'split', 'compress', 'sign', 'workflow'];
    }
    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates);
    }
  });
});

// Listen for messages from popup or web pages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'OPEN_APP') {
    const url = chrome.runtime.getURL('app.html') + (message.tool ? `#/${message.tool}` : '');
    chrome.tabs.create({ url });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_APP_URL') {
    sendResponse({ url: chrome.runtime.getURL('app.html') });
    return true;
  }
});
