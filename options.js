const form = document.getElementById("settingsForm");
const apiKeyInput = document.getElementById("apiKey");
const modelInput = document.getElementById("model");
const temperatureInput = document.getElementById("temperature");
const tempValue = document.getElementById("tempValue");
const saveStatus = document.getElementById("saveStatus");
const floatingButtonInput = document.getElementById("floatingButtonEnabled");
const signatarioNomeInput = document.getElementById("signatarioNome");
const signatarioCargoInput = document.getElementById("signatarioCargo");
const orgaoNomeInput = document.getElementById("orgaoNome");
const orgaoSetoresInput = document.getElementById("orgaoSetores");
const documentTemplateInput = document.getElementById("documentTemplate");
const despachoTemplateInput = document.getElementById("despachoTemplate");
const oficioTemplateInput = document.getElementById("oficioTemplate");
const memorandoTemplateInput = document.getElementById("memorandoTemplate");

function setStatus(message, isError = false) {
  saveStatus.textContent = message;
  saveStatus.className = isError ? "error" : "success";
  
  setTimeout(() => {
    saveStatus.textContent = "";
    saveStatus.className = "";
  }, 3000);
}

function updateTempValue() {
  tempValue.textContent = temperatureInput.value;
}

function loadSettings() {
  chrome.storage.sync.get(
    {
      apiKey: "",
      model: "gpt-4o",
      temperature: 0.2,
      floatingButtonEnabled: true,
      signatarioNome: "",
      signatarioCargo: "",
      orgaoNome: "",
      orgaoSetores: "",
      documentTemplate: "",
      despachoTemplate: "",
      oficioTemplate: "",
      memorandoTemplate: "",
    },
    (settings) => {
      apiKeyInput.value = settings.apiKey;
      modelInput.value = settings.model;
      temperatureInput.value = settings.temperature;
      floatingButtonInput.checked = Boolean(settings.floatingButtonEnabled);
      signatarioNomeInput.value = settings.signatarioNome;
      signatarioCargoInput.value = settings.signatarioCargo;
      orgaoNomeInput.value = settings.orgaoNome;
      orgaoSetoresInput.value = settings.orgaoSetores;
      documentTemplateInput.value = settings.documentTemplate;
      despachoTemplateInput.value = settings.despachoTemplate;
      oficioTemplateInput.value = settings.oficioTemplate;
      memorandoTemplateInput.value = settings.memorandoTemplate;
      updateTempValue();
    }
  );
}

// Atualizar valor da temperatura em tempo real
temperatureInput.addEventListener("input", updateTempValue);

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim();
  const temperature = Number.parseFloat(temperatureInput.value);

  if (!apiKey) {
    setStatus("❌ Informe uma chave de API válida.", true);
    return;
  }

  const floatingButtonEnabled = floatingButtonInput.checked;
  const signatarioNome = signatarioNomeInput.value.trim();
  const signatarioCargo = signatarioCargoInput.value.trim();
  const orgaoNome = orgaoNomeInput.value.trim();
  const orgaoSetores = orgaoSetoresInput.value.trim();
  const documentTemplate = documentTemplateInput.value.trim();
  const despachoTemplate = despachoTemplateInput.value.trim();
  const oficioTemplate = oficioTemplateInput.value.trim();
  const memorandoTemplate = memorandoTemplateInput.value.trim();

  chrome.storage.sync.set({ 
    apiKey, 
    model, 
    temperature, 
    floatingButtonEnabled,
    signatarioNome,
    signatarioCargo,
    orgaoNome,
    orgaoSetores,
    documentTemplate,
    despachoTemplate,
    oficioTemplate,
    memorandoTemplate,
  }, () => {
    setStatus("✅ Configurações salvas com sucesso!");
  });
});

loadSettings();
