const form = document.getElementById("settingsForm");
const apiKeyInput = document.getElementById("apiKey");
const modelInput = document.getElementById("model");
const temperatureInput = document.getElementById("temperature");
const saveStatus = document.getElementById("saveStatus");

function setStatus(message, isError = false) {
  saveStatus.textContent = message;
  saveStatus.style.color = isError ? "#b42318" : "inherit";
}

function loadSettings() {
  chrome.storage.sync.get(
    {
      apiKey: "",
      model: "gpt-3.5-turbo",
      temperature: 0.2
    },
    (settings) => {
      apiKeyInput.value = settings.apiKey;
      modelInput.value = settings.model;
      temperatureInput.value = settings.temperature;
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

  chrome.storage.sync.set({ apiKey, model, temperature }, () => {
    setStatus("Configurações salvas!");
    setTimeout(() => setStatus(""), 2500);
  });
});

loadSettings();
