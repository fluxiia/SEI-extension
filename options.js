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
const cienteDisclaimerInput = document.getElementById('cienteDisclaimer');
// Removidos: templates antigos não são mais usados

// Elementos das abas
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const tabsHeader = document.querySelector('.tabs-header');

// Elementos da aba de modelos
const modelsList = document.getElementById('modelsList');
const modelForm = document.getElementById('modelForm');
const addModelBtn = document.getElementById('addModelBtn');
const cancelModelBtn = document.getElementById('cancelModel');
const saveModelBtn = document.getElementById('saveModel');
const modelNameInput = document.getElementById('modelName');
const modelTextInput = document.getElementById('modelText');

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
      disclaimerAccepted: false,
      // Removidos: templates antigos
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
      if (cienteDisclaimerInput) {
        cienteDisclaimerInput.checked = Boolean(settings.disclaimerAccepted);
      }
      // Conteúdos estáticos agora estão no HTML

      // Se o disclaimer ainda não foi aceito, abrir a aba automaticamente
      try {
        if (!settings.disclaimerAccepted) {
          switchTab('disclaimer');
        }
      } catch (e) {}
      // Removidos: templates antigos
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
  const disclaimerAccepted = cienteDisclaimerInput ? cienteDisclaimerInput.checked : false;
  // Removidos: templates antigos

  chrome.storage.sync.set({ 
    apiKey, 
    model, 
    temperature, 
    floatingButtonEnabled,
    signatarioNome,
    signatarioCargo,
    orgaoNome,
    orgaoSetores,
    disclaimerAccepted,
    // Removidos: templates antigos
  }, () => {
    setStatus("✅ Configurações salvas com sucesso!");
  });
});

// Função para trocar de aba
function switchTab(tabName, { focusPanel = true, updateHash = true, persist = true } = {}) {
  const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
  const activeContent = document.getElementById(`${tabName}-tab`);

  if (!activeButton || !activeContent) return;

  // Atualizar classes e ARIA
  tabButtons.forEach(button => {
    const isActive = button === activeButton;
    button.classList.toggle('active', isActive);
    if (button.getAttribute('role') === 'tab') {
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      button.setAttribute('tabindex', isActive ? '0' : '-1');
    }
  });

  tabContents.forEach(content => {
    const isActive = content === activeContent;
    content.classList.toggle('active', isActive);
    content.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  if (focusPanel) {
    // Dar foco ao painel para leitores de tela/navegação
    activeContent.focus({ preventScroll: true });
    // Garantir que o botão ativo esteja visível e focável via teclado
    activeButton.focus({ preventScroll: true });
  }

  if (updateHash) {
    try {
      if (location.hash !== `#${tabName}`) {
        history.replaceState(null, '', `#${tabName}`);
      }
    } catch (e) {}
  }

  if (persist && chrome?.storage?.sync) {
    try {
      chrome.storage.sync.set({ lastActiveTab: tabName });
    } catch (e) {}
  }
}

// Event listeners para os botões das abas
tabButtons.forEach(button => {
  // Tornar apenas o ativo focável no ciclo de tabulação quando role=tab
  if (button.getAttribute('role') === 'tab') {
    const isActive = button.classList.contains('active');
    button.setAttribute('tabindex', isActive ? '0' : '-1');
  }
  button.addEventListener('click', () => {
    const tabName = button.getAttribute('data-tab');
    switchTab(tabName, { focusPanel: true, updateHash: true, persist: true });
  });
});

// Navegação por teclado nas abas (ArrowLeft/ArrowRight/Home/End)
if (tabsHeader) {
  tabsHeader.addEventListener('keydown', (e) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(e.key)) return;

    const tabsArray = Array.from(tabButtons);
    const currentIndex = tabsArray.findIndex(b => b.classList.contains('active'));
    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabsArray.length;
    if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabsArray.length) % tabsArray.length;
    if (e.key === 'Home') nextIndex = 0;
    if (e.key === 'End') nextIndex = tabsArray.length - 1;

    const nextButton = tabsArray[nextIndex];
    if (nextButton) {
      e.preventDefault();
      nextButton.focus();
      const tabName = nextButton.getAttribute('data-tab');
      switchTab(tabName, { focusPanel: false, updateHash: true, persist: true });
    }
  });
}

// Funções para gerenciar modelos de documentos
let documentModels = [];
let editingModelId = null;

// Modelos padrão editáveis
let defaultModels = {
  'despacho-padrao': {
    name: 'Despacho Padrão',
    template: `Processo nº: {PROCESSO}
Assunto: {ASSUNTO}

DESPACHO Nº {NUMERO}

Ao {DESTINATARIO},

{CONTEUDO}

São Luís/MA, {DATA}.

Atenciosamente,

{SIGNATARIO}
{CARGO}`
  },
  'oficio-padrao': {
    name: 'Ofício Padrão',
    template: `Processo nº: {PROCESSO}
Assunto: {ASSUNTO}

OFÍCIO Nº {NUMERO}

Ao {DESTINATARIO},

{CONTEUDO}

São Luís/MA, {DATA}.

Atenciosamente,

{SIGNATARIO}
{CARGO}`
  },
  'memorando-padrao': {
    name: 'Memorando Padrão',
    template: `Processo nº: {PROCESSO}
Assunto: {ASSUNTO}

MEMORANDO Nº {NUMERO}

Ao {DESTINATARIO},

{CONTEUDO}

São Luís/MA, {DATA}.

Atenciosamente,

{SIGNATARIO}
{CARGO}`
  }
};

function loadDocumentModels() {
  chrome.storage.sync.get(['documentModels', 'defaultModels'], (result) => {
    documentModels = result.documentModels || [];
    if (result.defaultModels) {
      defaultModels = result.defaultModels;
    }
    renderModelsList();
    updateDefaultModelsDisplay();
  });
}

function loadDefaultModels() {
  chrome.storage.sync.get(['defaultModels'], (result) => {
    if (result.defaultModels) {
      defaultModels = result.defaultModels;
      updateDefaultModelsDisplay();
    }
  });
}

function saveDefaultModels() {
  chrome.storage.sync.set({ defaultModels }, () => {
    setStatus("✅ Modelos padrão salvos com sucesso!");
  });
}

function updateDefaultModelsDisplay() {
  // Atualizar previews dos modelos padrão
  const modelPreviews = document.querySelectorAll('.default-model .model-preview pre');
  modelPreviews.forEach((preview, index) => {
    const modelKeys = ['despacho-padrao', 'oficio-padrao', 'memorando-padrao'];
    if (modelKeys[index] && defaultModels[modelKeys[index]]) {
      preview.textContent = defaultModels[modelKeys[index]].template;
    }
  });
}

function saveDocumentModels() {
  chrome.storage.sync.set({ documentModels }, () => {
    setStatus("✅ Modelos salvos com sucesso!");
  });
}

function renderModelsList() {
  modelsList.innerHTML = '';
  
  if (documentModels.length === 0) {
    modelsList.innerHTML = '<div class="empty-models"><p>Nenhum modelo criado ainda. Clique em "Adicionar Novo Modelo" para começar.</p></div>';
    return;
  }
  
  documentModels.forEach((model, index) => {
    const modelItem = document.createElement('div');
    modelItem.className = 'model-item';
    modelItem.innerHTML = `
      <div class="model-header">
        <h4>${model.name}</h4>
        <div class="model-actions">
          <button class="btn-edit" data-index="${index}">✏️ Editar</button>
          <button class="btn-delete" data-index="${index}">🗑️ Excluir</button>
        </div>
      </div>
      <div class="model-preview">
        <pre>${model.text.substring(0, 200)}${model.text.length > 200 ? '...' : ''}</pre>
      </div>
    `;
    modelsList.appendChild(modelItem);
  });
  
  // Adicionar event listeners para os botões
  modelsList.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'));
      editModel(index);
    });
  });
  
  modelsList.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'));
      deleteModel(index);
    });
  });
}

function showModelForm() {
  modelForm.style.display = 'block';
  addModelBtn.style.display = 'none';
  modelNameInput.focus();
}

function hideModelForm() {
  modelForm.style.display = 'none';
  addModelBtn.style.display = 'block';
  editingModelId = null;
  modelNameInput.value = '';
  modelTextInput.value = '';
  
  // Resetar título do formulário
  const formTitle = document.querySelector('#modelForm h3');
  if (formTitle) {
    formTitle.textContent = '📝 Novo Modelo de Documento';
  }
}

function editModel(index) {
  const model = documentModels[index];
  editingModelId = index;
  modelNameInput.value = model.name;
  modelTextInput.value = model.text;
  showModelForm();
}

function deleteModel(index) {
  if (confirm('Tem certeza que deseja excluir este modelo?')) {
    documentModels.splice(index, 1);
    saveDocumentModels();
    renderModelsList();
  }
}

function saveModel() {
  const name = modelNameInput.value.trim();
  const text = modelTextInput.value.trim();
  
  if (!name || !text) {
    setStatus("❌ Preencha todos os campos obrigatórios.", true);
    return;
  }
  
  // Verificar se é um modelo padrão
  if (editingModelId && editingModelId.startsWith('default-')) {
    saveDefaultModel();
    return;
  }
  
  const model = { name, text };
  
  if (editingModelId !== null) {
    // Editando modelo existente
    documentModels[editingModelId] = model;
  } else {
    // Criando novo modelo
    documentModels.push(model);
  }
  
  saveDocumentModels();
  renderModelsList();
  hideModelForm();
}

function editDefaultModel(modelKey) {
  const model = defaultModels[modelKey];
  if (!model) {
    setStatus("❌ Modelo não encontrado.", true);
    return;
  }
  
  // Preencher o formulário com os dados do modelo padrão
  modelNameInput.value = model.name;
  modelTextInput.value = model.template;
  
  // Marcar como editando modelo padrão
  editingModelId = 'default-' + modelKey;
  
  // Mostrar formulário
  showModelForm();
  
  // Atualizar título do formulário
  const formTitle = document.querySelector('#modelForm h3');
  if (formTitle) {
    formTitle.textContent = '✏️ Editar Modelo Padrão';
  }
}

function saveDefaultModel() {
  const name = modelNameInput.value.trim();
  const text = modelTextInput.value.trim();
  
  if (!name || !text) {
    setStatus("❌ Preencha todos os campos obrigatórios.", true);
    return;
  }
  
  if (editingModelId && editingModelId.startsWith('default-')) {
    const modelKey = editingModelId.replace('default-', '');
    defaultModels[modelKey] = { name, template: text };
    saveDefaultModels();
    updateDefaultModelsDisplay();
    hideModelForm();
  }
}

// Event listeners para modelos
addModelBtn.addEventListener('click', showModelForm);
cancelModelBtn.addEventListener('click', hideModelForm);
saveModelBtn.addEventListener('click', saveModel);

// Event listeners para modelos padrão
document.addEventListener('click', (event) => {
  if (event.target.classList.contains('btn-edit-default')) {
    const modelKey = event.target.getAttribute('data-model');
    editDefaultModel(modelKey);
  }
});

// Inicialização com hash/persistência respeitando o disclaimer
function initializeTabsWithState(disclaimerAccepted) {
  const hash = (location.hash || '').replace('#', '');
  if (!disclaimerAccepted) {
    // Força a aba de disclaimer quando não aceito
    switchTab('disclaimer', { focusPanel: false, updateHash: true, persist: true });
    return;
  }

  if (hash) {
    switchTab(hash, { focusPanel: false, updateHash: false, persist: false });
    return;
  }

  try {
    chrome.storage.sync.get({ lastActiveTab: 'ai-model' }, ({ lastActiveTab }) => {
      switchTab(lastActiveTab || 'ai-model', { focusPanel: false, updateHash: true, persist: false });
    });
  } catch (e) {
    switchTab('ai-model', { focusPanel: false, updateHash: true, persist: false });
  }
}

// Após carregar configurações, inicializar as abas considerando o estado
const originalLoadSettings = loadSettings;
function loadSettingsAndInitTabs() {
  chrome.storage.sync.get({ disclaimerAccepted: false }, (settings) => {
    // Carrega todas as configs normalmente
    originalLoadSettings();
    // Inicializa estado das abas
    initializeTabsWithState(Boolean(settings.disclaimerAccepted));
  });
}

loadSettingsAndInitTabs();
loadDocumentModels();
