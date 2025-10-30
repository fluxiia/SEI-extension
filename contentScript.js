const BUTTON_ID = "sei-despacho-ia-floating-button";
const DEFAULT_SETTINGS = { floatingButtonEnabled: true, disclaimerAccepted: false };

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

    // Estilo base e posição inicial
    button.style.position = "fixed";
    button.style.zIndex = "2147483647";
    button.style.bottom = "24px";
    button.style.right = "24px";

    // Restaurar posição salva
    try {
      chrome.storage.sync.get({ seiSmartBtnPos: null }, ({ seiSmartBtnPos }) => {
        if (seiSmartBtnPos && typeof seiSmartBtnPos.top === 'number' && typeof seiSmartBtnPos.left === 'number') {
          button.style.top = seiSmartBtnPos.top + 'px';
          button.style.left = seiSmartBtnPos.left + 'px';
          button.style.bottom = "auto";
          button.style.right = "auto";
        }
      });
    } catch (e) {}

    // Tornar arrastável
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startTop = 0;
    let startLeft = 0;

    const onMouseMove = (ev) => {
      if (!dragging) return;
      ev.preventDefault();
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let newTop = startTop + dy;
      let newLeft = startLeft + dx;
      // Limites da janela
      const maxTop = window.innerHeight - button.offsetHeight - 8;
      const maxLeft = window.innerWidth - button.offsetWidth - 8;
      newTop = Math.max(8, Math.min(maxTop, newTop));
      newLeft = Math.max(8, Math.min(maxLeft, newLeft));
      button.style.top = newTop + 'px';
      button.style.left = newLeft + 'px';
      button.style.bottom = "auto";
      button.style.right = "auto";
    };

    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      // Persistir posição
      const rect = button.getBoundingClientRect();
      try {
        chrome.storage.sync.set({ seiSmartBtnPos: { top: Math.round(rect.top), left: Math.round(rect.left) } });
      } catch (e) {}
    };

    button.addEventListener('mousedown', (ev) => {
      // Permitir clique normal sem arraste se movimento for pequeno
      if (ev.button !== 0) return;
      dragging = true;
      startX = ev.clientX;
      startY = ev.clientY;
      // Fixar posição absoluta inicial
      const rect = button.getBoundingClientRect();
      startTop = rect.top;
      startLeft = rect.left;
      button.style.top = startTop + 'px';
      button.style.left = startLeft + 'px';
      button.style.bottom = "auto";
      button.style.right = "auto";
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
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
