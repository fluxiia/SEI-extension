chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "openPopup") {
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 420,
      height: 640
    });
    sendResponse?.({ success: true });
  }
});
