chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "openPopup") {
    if (sender?.tab?.id) {
      chrome.storage.local.set({ sourceTabId: sender.tab.id });
    }

    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 750,
      height: 700
    });
    sendResponse?.({ success: true });
    return;
  }

  if (message?.action === "injectSeiProArvore") {
    try {
      if (!sender?.tab?.id) {
        sendResponse?.({ success: false, error: "tabId ausente" });
        return;
      }
      chrome.scripting.executeScript(
        {
          target: { tabId: sender.tab.id, allFrames: false },
          world: "MAIN",
          files: ["sei-pro-arvore.js"]
        },
        () => {
          const lastErr = chrome.runtime.lastError;
          if (lastErr) {
            sendResponse?.({ success: false, error: lastErr.message });
          } else {
            sendResponse?.({ success: true });
          }
        }
      );
      return true;
    } catch (err) {
      sendResponse?.({ success: false, error: err?.message || String(err) });
      return true;
    }
  }
});
