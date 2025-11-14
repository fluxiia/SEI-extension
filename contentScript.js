const BUTTON_ID = "sei-despacho-ia-floating-button";
const DEFAULT_SETTINGS = { floatingButtonEnabled: true, disclaimerAccepted: false };
let ckeElements = null;
let iframes = null;

if (window.top === window.self) {
  let shouldShowButton = false;

  function diagnosticarAmbiente() {
    // Verificar elementos DOM
    ckeElements = document.querySelectorAll('.cke, [id*="cke_"]');
    iframes = document.querySelectorAll('iframe');
  }

  const removeButton = () => {
    const button = document.getElementById(BUTTON_ID);
    if (button) {
      button.remove();
    }
  };


  const ensureButton = () => {
    diagnosticarAmbiente()
    if (ckeElements.length === 0) {
      return;
    }

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

    // Estilo base e posição inicial
    button.style.position = "fixed";
    button.style.zIndex = "2147483647";
    button.style.bottom = "24px";
    button.style.right = "24px";

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
    const enabled = Boolean(settings.floatingButtonEnabled) && Boolean(settings.disclaimerAccepted);
    applySetting(enabled);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }

    const hasFloating = Object.prototype.hasOwnProperty.call(changes, "floatingButtonEnabled");
    const hasDisclaimer = Object.prototype.hasOwnProperty.call(changes, "disclaimerAccepted");

    if (!hasFloating && !hasDisclaimer) {
      return;
    }

    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
      const enabled = Boolean(settings.floatingButtonEnabled) && Boolean(settings.disclaimerAccepted);
      applySetting(enabled);
    });
  });

}
