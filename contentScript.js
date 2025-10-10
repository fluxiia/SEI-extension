const BUTTON_ID = "sei-despacho-ia-floating-button";
const DEFAULT_SETTINGS = { floatingButtonEnabled: true };

if (window.top === window.self) {
  let shouldShowButton = false;

  const removeButton = () => {
    const button = document.getElementById(BUTTON_ID);
    if (button) {
      button.remove();
    }
  };

  const ensureButton = () => {
    if (!shouldShowButton || document.getElementById(BUTTON_ID)) {
      return;
    }

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "🧠 SEI Smart";
    button.title = "Abrir o SEI Smart - Assistente de Despachos IA";
    button.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "openPopup" });
    });

    const appendButton = () => {
      if (!shouldShowButton || document.getElementById(BUTTON_ID) || !document.body) {
        return;
      }
      document.body.appendChild(button);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", appendButton, { once: true });
    } else {
      appendButton();
    }
  };

  const applySetting = (enabled) => {
    shouldShowButton = enabled;
    if (enabled) {
      ensureButton();
    } else {
      removeButton();
    }
  };

  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    applySetting(Boolean(settings.floatingButtonEnabled));
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !Object.prototype.hasOwnProperty.call(changes, "floatingButtonEnabled")) {
      return;
    }

    applySetting(Boolean(changes.floatingButtonEnabled.newValue));
  });
}
