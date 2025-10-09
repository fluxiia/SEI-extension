const form = document.getElementById("settingsForm");
const apiKeyInput = document.getElementById("apiKey");
const modelInput = document.getElementById("model");
const temperatureInput = document.getElementById("temperature");
const saveStatus = document.getElementById("saveStatus");
const floatingButtonInput = document.getElementById("floatingButtonEnabled");

function setStatus(message, isError = false) {
  saveStatus.textContent = message;
  saveStatus.style.color = isError ? "#b42318" : "inherit";
}

function loadSettings() {
  chrome.storage.sync.get(
    {
      apiKey: "",
      model: "gpt-3.5-turbo",
      temperature: 0.2,
      floatingButtonEnabled: true
    },
    (settings) => {
      apiKeyInput.value = settings.apiKey;
      modelInput.value = settings.model;
      temperatureInput.value = settings.temperature;
      floatingButtonInput.checked = Boolean(settings.floatingButtonEnabled);
    }
  );
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim();
  const temperature = Number.parseFloat(temperatureInput.value);

  if (!apiKey) {
    setStatus("Informe uma chave de API válida.", true);
    return;
  }

  const floatingButtonEnabled = floatingButtonInput.checked;

  chrome.storage.sync.set({ apiKey, model, temperature, floatingButtonEnabled }, () => {
    setStatus("Configurações salvas!");
    setTimeout(() => setStatus(""), 2500);
  });
});

loadSettings();
