chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "openPopup") {
    // Armazenar o tabId da janela que chamou a extensão
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
  }
});
