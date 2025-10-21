const dispatchText = document.getElementById("dispatchText");
const documentName = document.getElementById("documentName");
const promptExtra = document.getElementById("promptExtra");
const generateButton = document.getElementById("generateButton");
const writeManuallyButton = document.getElementById("writeManuallyButton");
const openOptionsButton = document.getElementById("openOptionsButton");
const statusMessage = document.getElementById("statusMessage");
const resultSection = document.getElementById("resultSection");
const resultTitle = document.getElementById("resultTitle");
const resultHint = document.getElementById("resultHint");
const responseTextEl = document.getElementById("responseText");
const useResponseButton = document.getElementById("useResponseButton");
const targetTabSelect = document.getElementById("targetTab");
const captureTextButton = document.getElementById("captureTextButton");
const captureSourceSection = document.getElementById("captureSourceSection");
const captureSourceTab = document.getElementById("captureSourceTab");
const confirmCaptureButton = document.getElementById("confirmCaptureButton");
const cancelCaptureButton = document.getElementById("cancelCaptureButton");
const reloadTargetTabsButton = document.getElementById("reloadTargetTabsButton");

// Novos elementos para funcionalidade de novo documento
const newDocumentContext = document.getElementById("newDocumentContext");
const responseModeFields = document.getElementById("responseModeFields");
const newDocumentFields = document.getElementById("newDocumentFields");
const additionalContextFields = document.getElementById("additionalContextFields");

// Elemento do modelo de documento
const documentModelSelect = document.getElementById("documentModelSelect");
const modelPreview = document.getElementById("modelPreview");
const previewToggle = document.getElementById("previewToggle");
const previewContent = document.getElementById("previewContent");
const previewText = document.getElementById("previewText");

// Elementos do modal de créditos
const openCreditsButton = document.getElementById("openCreditsButton");
const creditsModal = document.getElementById("creditsModal");
const closeCreditsButton = document.getElementById("closeCreditsButton");

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      {
        apiKey: "",
        model: "gpt-4o",
        temperature: 0.2,
        signatarioNome: "",
        signatarioCargo: "",
        orgaoNome: "",
        orgaoSetores: "",
        documentTemplate: "",
        despachoTemplate: "",
        oficioTemplate: "",
        memorandoTemplate: "",
        documentModels: [],
      },
      resolve
    );
  });
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = "#000";
  statusMessage.style.background = isError ? "#fee2e2" : "#e7f3ff";
  statusMessage.style.borderColor = isError ? "#fca5a5" : "#b3d9ff";
}

// Modelos genéricos pré-definidos
const predefinedModels = {
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

// Função para obter o modelo selecionado
function getSelectedModel() {
  const selectedModel = documentModelSelect.value;
  return predefinedModels[selectedModel] || predefinedModels['despacho-padrao'];
}

// Função para atualizar o preview do modelo
function updateModelPreview() {
  const selectedModel = getSelectedModel();
  if (previewText && selectedModel) {
    previewText.textContent = selectedModel.template;
  }
}

// Função para alternar o preview
function togglePreview() {
  const isExpanded = previewContent.style.display !== 'none';

  if (isExpanded) {
    previewContent.style.display = 'none';
    previewToggle.textContent = '🔽';
    previewToggle.classList.remove('expanded');
  } else {
    previewContent.style.display = 'block';
    previewToggle.textContent = '🔼';
    previewToggle.classList.add('expanded');
    updateModelPreview();
  }
}

// Função para popular o combo com modelos disponíveis
function populateModelSelect() {
  // Limpar opções existentes
  documentModelSelect.innerHTML = '';

  // Adicionar apenas os modelos que existem
  Object.keys(predefinedModels).forEach(key => {
    const model = predefinedModels[key];
    const option = document.createElement('option');
    option.value = key;
    option.textContent = model.name;
    documentModelSelect.appendChild(option);
  });
}

// Função para carregar modelos do storage
async function loadModelsFromStorage() {
  try {
    const settings = await loadSettings();
    if (settings.defaultModels) {
      // Atualizar modelos pré-definidos com os do storage
      Object.assign(predefinedModels, settings.defaultModels);
    }

    // Popular o combo com os modelos disponíveis
    populateModelSelect();
    updateModelPreview();
  } catch (error) {
    console.error('Erro ao carregar modelos:', error);
  }
}

// Função para captura automática de telas
async function autoCaptureIfNeeded() {
  const documentType = document.querySelector('input[name="documentType"]:checked').value;

  // Captura automática para ambos os modos (new e response)
  if (!dispatchText.value.trim()) {
    setStatus("📸 Capturando automaticamente o texto do documento...");

    try {
      // Buscar janelas do SEI automaticamente
      const allTabs = await chrome.tabs.query({});
      const seiTabs = allTabs.filter(t => {
        const isSei = t.url && /\/sei\//i.test(t.url);
        return isSei;
      });

      if (seiTabs.length === 0) {
        setStatus("❌ Nenhuma janela do SEI encontrada. Cole o texto manualmente.", true);
        return false;
      }

      // Priorizar janelas com documentos
      const docTabs = seiTabs.filter(t =>
        t.url.includes('documento_visualizar') ||
        t.url.includes('controlador.php?acao=procedimento') ||
        t.url.includes('controlador.php?acao=documento') ||
        t.url.includes('documento') ||
        t.url.includes('visualizar')
      );

      console.log('Tabs do SEI encontradas:', seiTabs.length);
      console.log('Tabs com documentos:', docTabs.length);

      const targetTab = docTabs.length > 0 ? docTabs[0] : seiTabs[0];
      console.log('Tab selecionada para captura:', targetTab.url);
      console.log('Tab ID:', targetTab.id);

      // Executar captura automática
      const results = await chrome.scripting.executeScript({
        target: {
          tabId: targetTab.id,
          allFrames: true
        },
        func: function () {
          console.log('Executando captura no frame:', window.location.href);

          // Lista expandida de seletores para captura
          const possiveisElementos = [
            // Seletores específicos do SEI
            document.querySelector('#divConteudo'),
            document.querySelector('#divInfraAreaTelaD'),
            document.querySelector('#divEditor'),
            document.querySelector('.editor-visualizacao'),
            document.querySelector('#conteudo'),
            document.querySelector('.conteudo'),
            document.querySelector('#divConteudoDocumento'),
            document.querySelector('.conteudo-documento'),
            document.querySelector('#areaConteudo'),
            document.querySelector('.area-conteudo'),

            // Seletores genéricos
            document.querySelector('main'),
            document.querySelector('.main-content'),
            document.querySelector('#main'),
            document.querySelector('.content'),
            document.querySelector('#content'),
            document.querySelector('article'),
            document.querySelector('.documento'),
            document.querySelector('#documento'),

            // Fallback para body
            document.querySelector('body')
          ];

          let melhorTexto = '';
          let melhorElemento = '';
          let melhorScore = 0;

          for (let elemento of possiveisElementos) {
            if (elemento) {
              let texto = elemento.innerText || elemento.textContent || '';
              texto = texto.trim();

              // Calcular score baseado no tamanho e qualidade do texto
              let score = texto.length;

              // Bonus para elementos específicos do SEI
              if (elemento.id === 'divConteudo' || elemento.id === 'divInfraAreaTelaD') {
                score *= 1.5;
              }

              // Penalizar textos muito curtos ou muito longos (provavelmente não são o conteúdo principal)
              if (texto.length < 20) {
                score *= 0.1;
              } else if (texto.length > 50000) {
                score *= 0.8;
              }

              if (score > melhorScore) {
                melhorTexto = texto;
                melhorElemento = elemento.tagName + (elemento.id ? '#' + elemento.id : '');
                melhorScore = score;
              }
            }
          }

          console.log('Texto encontrado:', melhorTexto.length, 'caracteres');
          console.log('Elemento:', melhorElemento);
          console.log('Score:', melhorScore);

          // Reduzir o limite mínimo para capturar mais conteúdo
          if (melhorTexto && melhorTexto.length > 20) {
            return {
              success: true,
              text: melhorTexto,
              from: melhorElemento,
              url: window.location.href,
              score: melhorScore
            };
          }

          return { success: false, reason: 'Sem conteúdo suficiente neste frame' };
        }
      });

      // Procurar o melhor resultado
      let melhorResultado = null;
      let melhorScore = 0;

      console.log('Resultados da captura:', results.length);

      for (let i = 0; i < results.length; i++) {
        const res = results[i]?.result;
        if (res && res.success && res.text) {
          console.log(`Resultado ${i}:`, {
            textLength: res.text.length,
            score: res.score || res.text.length,
            from: res.from,
            url: res.url
          });

          const score = res.score || res.text.length;
          if (score > melhorScore) {
            melhorResultado = res;
            melhorScore = score;
          }
        }
      }

      if (melhorResultado) {
        dispatchText.value = melhorResultado.text;
        setStatus("✅ Texto capturado automaticamente!");
        console.log('Captura bem-sucedida:', melhorResultado.from);
        return true;
      } else {
        // Tentar captura mais simples como fallback
        console.log('Tentando captura de fallback...');
        try {
          const fallbackResults = await chrome.scripting.executeScript({
            target: {
              tabId: targetTab.id,
              allFrames: false
            },
            func: function () {
              // Captura mais simples - apenas o body
              const body = document.body;
              if (body) {
                const texto = body.innerText || body.textContent || '';
                const textoLimpo = texto.trim();

                if (textoLimpo.length > 20) {
                  return {
                    success: true,
                    text: textoLimpo,
                    from: 'body',
                    url: window.location.href
                  };
                }
              }
              return { success: false, reason: 'Fallback também falhou' };
            }
          });

          if (fallbackResults && fallbackResults[0] && fallbackResults[0].result && fallbackResults[0].result.success) {
            dispatchText.value = fallbackResults[0].result.text;
            setStatus("✅ Texto capturado com método alternativo!");
            console.log('Captura de fallback bem-sucedida');
            return true;
          }
        } catch (fallbackError) {
          console.error('Erro no fallback:', fallbackError);
        }

        setStatus("⚠️ Não foi possível capturar automaticamente. Cole o texto manualmente.", true);
        return false;
      }
    } catch (error) {
      console.error('Erro na captura automática:', error);
      setStatus("⚠️ Erro na captura automática. Cole o texto manualmente.", true);
      return false;
    }
  }

  return true;
}

function toggleLoading(isLoading) {
  generateButton.disabled = isLoading;
  generateButton.textContent = isLoading ? "⏳ Gerando..." : "✨ Gerar Resposta";
}

// Função para controlar a interface baseada no modo selecionado
function updateInterfaceMode() {
  const documentType = document.querySelector('input[name="documentType"]:checked').value;
  const isNewDocument = documentType === 'new';

  if (isNewDocument) {
    // Modo novo documento
    responseModeFields.style.display = 'none';
    newDocumentFields.style.display = 'block';
    document.getElementById('documentNameGroup').style.display = 'none'; // Ocultar campo nome do documento
    additionalContextFields.querySelector('label').textContent = '💡 Informações Adicionais (opcional)';
    additionalContextFields.querySelector('textarea').placeholder = 'Adicione informações extras que devem ser consideradas (prazos, referências, observações...)';
    generateButton.textContent = '✨ Gerar Novo Documento';

    // Placeholder padrão para novo documento
    newDocumentContext.placeholder = 'Descreva o contexto do novo documento: destinatário, objetivo, processo relacionado..., não é necessário colocar todos os dados, apenas o que julgar necessário para gerar o documento';

  } else {
    // Modo resposta
    responseModeFields.style.display = 'block';
    newDocumentFields.style.display = 'none';
    document.getElementById('documentNameGroup').style.display = 'block'; // Mostrar campo nome do documento
    additionalContextFields.querySelector('label').textContent = '💡 Contexto Adicional (opcional)';
    additionalContextFields.querySelector('textarea').placeholder = 'Adicione informações extras que devem ser consideradas na resposta (prazos, referências, observações...)';
    generateButton.textContent = '✨ Gerar Resposta com IA';
  }
}

// Função para validar campos baseado no modo
function validateFields() {
  const documentType = document.querySelector('input[name="documentType"]:checked').value;
  const isNewDocument = documentType === 'new';

  // Validação simplificada - modelo sempre disponível

  if (isNewDocument) {
    // Para novo documento, precisa do contexto
    const context = newDocumentContext.value.trim();
    if (!context) {
      setStatus("⚠️ Descreva o contexto do novo documento antes de gerar.", true);
      return false;
    }
  } else {
    // Para resposta, precisa do despacho recebido
    const despacho = dispatchText.value.trim();
    if (!despacho) {
      setStatus("⚠️ Cole o texto do despacho antes de gerar a resposta.", true);
      return false;
    }
  }

  return true;
}

async function showCaptureSourceSelector() {
  try {
    // Buscar todas as janelas/tabs
    const allTabs = await chrome.tabs.query({});
    // Filtrar apenas janelas do SEI
    const seiTabs = allTabs.filter(t => {
      const isSei = t.url && /\/sei\//i.test(t.url);
      return isSei;
    });

    if (seiTabs.length === 0) {
      setStatus("❌ Nenhuma janela do SEI encontrada. Abra um documento no SEI primeiro.", true);
      return;
    }

    // Separar janelas de documentos das outras
    const docTabs = seiTabs.filter(t => t.url.includes('documento_visualizar') || t.url.includes('controlador.php?acao=procedimento'));
    const otherTabs = seiTabs.filter(t => !t.url.includes('documento_visualizar') && !t.url.includes('controlador.php?acao=procedimento'));

    // Limpar e popular o select
    captureSourceTab.innerHTML = '';

    // Adicionar janelas de documentos PRIMEIRO (com destaque)
    if (docTabs.length > 0) {
      const docGroup = document.createElement('optgroup');
      docGroup.label = '📄 Janelas com Documentos (recomendado)';

      docTabs.forEach((tab) => {
        const option = document.createElement('option');
        option.value = tab.id;

        let title = tab.title || 'Janela do SEI';
        if (title.length > 50) {
          title = title.substring(0, 47) + '...';
        }

        option.textContent = `✅ ${title}`;
        captureSourceTab.appendChild(option);
      });
    }

    // Depois adicionar outras janelas
    if (otherTabs.length > 0) {
      const otherGroup = document.createElement('optgroup');
      otherGroup.label = '📂 Outras Janelas do SEI';

      otherTabs.forEach((tab) => {
        const option = document.createElement('option');
        option.value = tab.id;

        let title = tab.title || 'Janela do SEI';
        if (title.length > 50) {
          title = title.substring(0, 47) + '...';
        }

        option.textContent = title;
        captureSourceTab.appendChild(option);
      });
    }

    // Auto-selecionar: priorizar janela com documento
    if (docTabs.length > 0) {
      captureSourceTab.value = docTabs[0].id;
    } else {
      // Fallback: usar sourceTabId
      const storage = await chrome.storage.local.get(['sourceTabId']);
      if (storage.sourceTabId && seiTabs.find(t => t.id === storage.sourceTabId)) {
        captureSourceTab.value = storage.sourceTabId;
      }
    }

    // Mostrar seção de seleção
    captureSourceSection.hidden = false;
    captureTextButton.disabled = true;
  } catch (error) {
    setStatus(`❌ Erro ao carregar janelas: ${error.message}`, true);
  }
}

async function performCapture() {
  try {
    const selectedTabId = captureSourceTab.value;

    if (!selectedTabId) {
      setStatus("⚠️ Selecione uma janela primeiro.", true);
      return;
    }

    confirmCaptureButton.disabled = true;
    confirmCaptureButton.textContent = "⏳ Capturando...";

    const tabId = parseInt(selectedTabId, 10);

    // Executar script em TODOS os frames (incluindo iframes) para pegar o conteúdo renderizado
    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: {
          tabId: tabId,
          allFrames: true
        },
        func: function () {
          // Verificar se este frame tem conteúdo de documento
          const isDocumentFrame = window.location.href.includes('documento_visualizar') ||
            window.location.href.includes('controlador.php?acao=documento');

          if (!isDocumentFrame) {
            return { success: false, isMainFrame: false };
          }

          // Tentar capturar texto de elementos comuns do SEI
          const possiveisElementos = [
            document.querySelector('#divConteudo'),
            document.querySelector('#divInfraAreaTelaD'),
            document.querySelector('#divEditor'),
            document.querySelector('.editor-visualizacao'),
            document.querySelector('body')
          ];

          let melhorTexto = '';
          let melhorElemento = '';

          for (let elemento of possiveisElementos) {
            if (elemento) {
              let texto = elemento.innerText || elemento.textContent || '';
              texto = texto.trim();

              if (texto.length > melhorTexto.length) {
                melhorTexto = texto;
                melhorElemento = elemento.tagName + (elemento.id ? '#' + elemento.id : '');
              }
            }
          }

          if (melhorTexto && melhorTexto.length > 50) {
            return {
              success: true,
              text: melhorTexto,
              from: melhorElemento,
              url: window.location.href
            };
          }

          return { success: false, reason: 'Sem conteúdo suficiente neste frame' };
        }
      });

    } catch (scriptError) {
      throw new Error("Erro ao injetar script: " + scriptError.message);
    }

    // Procurar o melhor resultado entre todos os frames
    let melhorResultado = null;
    let maiorTexto = 0;

    for (let i = 0; i < results.length; i++) {
      const res = results[i]?.result;
      if (res && res.success && res.text && res.text.length > maiorTexto) {
        melhorResultado = res;
        maiorTexto = res.text.length;
      }
    }

    if (melhorResultado) {
      dispatchText.value = melhorResultado.text;
      setStatus("✅ Texto capturado com sucesso!");
      captureSourceSection.hidden = true;
      captureTextButton.disabled = false;
      return;
    }

    throw new Error("Nenhum frame com conteúdo de texto válido foi encontrado. Abra um documento no SEI.")
  } catch (error) {
    setStatus(`❌ ${error.message}`, true);
  } finally {
    confirmCaptureButton.disabled = false;
    confirmCaptureButton.textContent = "✅ Capturar";
  }
}

async function performCaptureOLD() {
  try {
    const selectedTabId = captureSourceTab.value;

    if (!selectedTabId) {
      setStatus("⚠️ Selecione uma janela primeiro.", true);
      return;
    }

    confirmCaptureButton.disabled = true;
    confirmCaptureButton.textContent = "⏳ Capturando...";

    const tabId = parseInt(selectedTabId, 10);

    // Executar script para capturar texto do documento
    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: function () {
          // Procurar o iframe de visualização (pode ser ifrVisualizacao ou ifrArvoreHtml)
          let iframe = document.getElementById('ifrVisualizacao') ||
            document.getElementById('ifrArvoreHtml') ||
            document.querySelector('iframe[src*="documento_visualizar"]') ||
            document.querySelector('iframe');
          if (!iframe) {
            return { success: false, error: "Nenhum iframe de visualização encontrado na página." };
          }

          // Tentar acessar o documento do iframe
          let iframeDoc = null;

          try {
            iframeDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
          } catch (e) {
            return { success: false, error: "Não foi possível acessar o conteúdo do iframe. Erro: " + (e && e.message) };
          }

          if (!iframeDoc) {
            return { success: false, error: "Não foi possível acessar o documento dentro do iframe." };
          }

          // Listar elementos disponíveis no iframe
          const elementos = {
            divConteudo: iframeDoc.querySelector('#divConteudo'),
            infraAreaTelaD: iframeDoc.querySelector('#divInfraAreaTelaD'),
            divEditor: iframeDoc.querySelector('#divEditor'),
            editorVisualizacao: iframeDoc.querySelector('.editor-visualizacao'),
            body: iframeDoc.body
          };

          // Tentar capturar texto de cada elemento
          let melhorTexto = '';
          let melhorElemento = '';

          for (let [nome, elemento] of Object.entries(elementos)) {
            if (elemento) {
              let texto = elemento.innerText || elemento.textContent || '';
              texto = texto.trim();

              if (texto.length > melhorTexto.length) {
                melhorTexto = texto;
                melhorElemento = nome;
              }
            }
          }

          // Se encontrou qualquer texto (reduzido de 100 para 10 caracteres)
          if (melhorTexto && melhorTexto.length > 10) {
            return { success: true, text: melhorTexto };
          }

          // Última tentativa: pegar todo o texto do body
          if (iframeDoc.body) {
            let todoTexto = iframeDoc.body.innerText || iframeDoc.body.textContent || '';
            todoTexto = todoTexto.trim();

            if (todoTexto && todoTexto.length > 10) {
              return { success: true, text: todoTexto };
            }
          }

          return { success: false, error: "Documento encontrado mas sem conteúdo de texto válido. Abra um documento no painel de visualização. Melhor elemento: " + melhorElemento + " com " + melhorTexto.length + " caracteres." };
        }
      });
    } catch (scriptError) {
      throw new Error("Erro ao injetar script na página: " + scriptError.message);
    }

    const result = results[0]?.result;

    if (result && result.success && result.text) {
      dispatchText.value = result.text;
      setStatus("✅ Texto capturado com sucesso!");
      captureSourceSection.hidden = true;
      captureTextButton.disabled = false;
    } else {
      throw new Error(result?.error || "Não foi possível capturar o texto do documento.");
    }

  } catch (error) {
    setStatus(`❌ ${error.message}`, true);
  } finally {
    confirmCaptureButton.disabled = false;
    confirmCaptureButton.textContent = "✅ Capturar";
  }
}

function cancelCapture() {
  captureSourceSection.hidden = true;
  captureTextButton.disabled = false;
}

async function loadAvailableTabs() {
  try {
    console.log('Carregando janelas disponíveis...');
    console.log('targetTabSelect encontrado:', !!targetTabSelect);

    if (!targetTabSelect) {
      throw new Error('Elemento targetTabSelect não encontrado!');
    }

    // Buscar todas as janelas do SEI abertas
    const allTabs = await chrome.tabs.query({});
    console.log('Total de tabs encontradas:', allTabs.length);

    const seiTabs = allTabs.filter(t => t.url && /\/sei\//i.test(t.url));
    console.log('Tabs do SEI encontradas:', seiTabs.length);

    // Separar janelas de editor das outras
    const editorTabs = seiTabs.filter(t => t.url.includes('acao=editor_montar'));
    const otherTabs = seiTabs.filter(t => !t.url.includes('acao=editor_montar'));

    console.log('Tabs de editor:', editorTabs.length);
    console.log('Outras tabs do SEI:', otherTabs.length);

    // Limpar opções antigas
    targetTabSelect.innerHTML = '<option value="">Detectar automaticamente</option>';

    // Adicionar janelas de editor PRIMEIRO (com destaque)
    if (editorTabs.length > 0) {
      const editorGroup = document.createElement('optgroup');
      editorGroup.label = '📝 Janelas do Editor (recomendado)';

      editorTabs.forEach(tab => {
        const option = document.createElement('option');
        option.value = tab.id;

        // Criar um título descritivo
        let title = tab.title || 'Janela do SEI';
        if (title.length > 60) {
          title = title.substring(0, 57) + '...';
        }

        option.textContent = `✅ ${title}`;
        editorGroup.appendChild(option);
      });

      targetTabSelect.appendChild(editorGroup);
    }

    // Depois adicionar outras janelas SEI
    if (otherTabs.length > 0) {
      const otherGroup = document.createElement('optgroup');
      otherGroup.label = '📂 Outras Janelas do SEI';

      otherTabs.forEach(tab => {
        const option = document.createElement('option');
        option.value = tab.id;

        let title = tab.title || 'Janela do SEI';
        if (title.length > 60) {
          title = title.substring(0, 57) + '...';
        }

        option.textContent = title;
        otherGroup.appendChild(option);
      });

      targetTabSelect.appendChild(otherGroup);
    }

    // Auto-selecionar: priorizar janela de editor
    if (editorTabs.length > 0) {
      targetTabSelect.value = editorTabs[0].id;
    } else {
      // Fallback: usar sourceTabId se disponível
      const storage = await chrome.storage.local.get(['sourceTabId']);
      if (storage.sourceTabId && seiTabs.find(t => t.id === storage.sourceTabId)) {
        targetTabSelect.value = storage.sourceTabId;
      }
    }

    console.log('Janelas carregadas com sucesso!');
  } catch (error) {
    console.error('Erro ao carregar janelas:', error);
    targetTabSelect.innerHTML = '<option value="">Erro ao carregar janelas</option>';
  }
}

async function applyResponseToPage(responseText) {
  let tab = null;

  // Verificar se o usuário selecionou uma janela específica
  const selectedTabId = targetTabSelect.value;

  if (selectedTabId) {
    // Usar a janela selecionada pelo usuário
    const tabId = parseInt(selectedTabId, 10);

    try {
      tab = await chrome.tabs.get(tabId);
    } catch (error) {
      throw new Error("A janela selecionada não existe mais. Atualize a lista de janelas.");
    }
  } else {
    // Modo automático: buscar janela com "editor_montar" na URL (popup do editor)
    const allTabs = await chrome.tabs.query({});
    const editorTabs = allTabs.filter(t => t.url && t.url.includes('acao=editor_montar'));

    if (editorTabs.length > 0) {
      // Usar a primeira janela de editor encontrada
      tab = editorTabs[0];
    } else {
      // Fallback: tentar sourceTabId
      const storage = await chrome.storage.local.get(['sourceTabId']);

      if (storage.sourceTabId) {
        try {
          tab = await chrome.tabs.get(storage.sourceTabId);
        } catch (error) {
          tab = null;
        }
      }

      // Se ainda não encontrou, buscar qualquer aba do SEI
      if (!tab) {
        const seiTabs = allTabs.filter(t => t.url && /\/sei\//i.test(t.url));
        if (seiTabs.length === 0) {
          throw new Error("Não foi possível encontrar uma janela do SEI aberta. Abra o editor de despacho primeiro.");
        }
        tab = seiTabs.find(t => t.active) || seiTabs[0];
      }
    }
  }

  if (!tab || !tab.id) {
    throw new Error("Não foi possível identificar a janela do SEI.");
  }

  let injectionResults;

  try {
    injectionResults = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
        allFrames: true
      },
      func: (text) => {
        // Este código roda em CADA frame/iframe da página
        // === FILTRO: Ignorar iframes internos do CKEditor ===
        if (window.location.href.includes('about:srcdoc') || window.location.href === 'about:blank') {
          return {
            success: false,
            skipped: true,
            reason: 'iframe interno do CKEditor'
          };
        }

        // === PASSO 1: Procurar textareas primeiro ===
        const allTextareas = document.querySelectorAll('textarea');

        if (allTextareas.length === 0) {
          return {
            success: false,
            skipped: true,
            reason: 'sem textareas'
          };
        }

        // Procurar especificamente por txaEditor_506 (processo existente)
        let targetTextarea = null;
        const textarea506 = document.querySelector('textarea[name="txaEditor_506"]');

        if (textarea506) {
          // Processo existente com editor de despacho
          targetTextarea = textarea506;
        } else {
          // Tentar encontrar por nome contendo _506
          for (let ta of allTextareas) {
            if (ta.name && ta.name.includes('_506')) {
              targetTextarea = ta;
              break;
            }
          }

          // Se não encontrou _506, pode ser documento novo
          if (!targetTextarea) {
            // Verificar se é documento novo (múltiplos editores, sem _506)
            // Em documentos novos, o texto vai no terceiro CKEditor (índice 2)
            if (allTextareas.length >= 3) {
              // Documento novo: usar o terceiro editor (corpo do texto)
              targetTextarea = allTextareas[2];
            } else if (allTextareas.length >= 2) {
              // Fallback: usar o segundo editor
              targetTextarea = allTextareas[1];
            }
          }
        }

        if (!targetTextarea) {
          return {
            success: false,
            hadTextarea: false,
            totalTextareas: allTextareas.length,
            error: "Nenhuma textarea encontrada para inserir o texto"
          };
        }

        // === PASSO 2: Tentar obter instância do CKEditor ===
        let editor = null;
        let estrategiaUsada = "";
        let CKEDITOR_ref = null;

        const possiveisCKEDITORs = [
          { name: 'window.CKEDITOR', ref: () => window.CKEDITOR },
          { name: 'global CKEDITOR', ref: () => (typeof CKEDITOR !== 'undefined' ? CKEDITOR : null) },
          { name: 'window.parent.CKEDITOR', ref: () => window.parent?.CKEDITOR },
          { name: 'window.top.CKEDITOR', ref: () => window.top?.CKEDITOR },
          { name: 'self.CKEDITOR', ref: () => self?.CKEDITOR }
        ];

        for (let contexto of possiveisCKEDITORs) {
          try {
            const ref = contexto.ref();
            if (ref && ref.instances) {
              CKEDITOR_ref = ref;
              break;
            }
          } catch (e) { }
        }

        if (CKEDITOR_ref) {
          const instanceNames = Object.keys(CKEDITOR_ref.instances);

          const textareaName = targetTextarea.name || targetTextarea.id;

          if (textareaName && CKEDITOR_ref.instances[textareaName]) {
            editor = CKEDITOR_ref.instances[textareaName];
            estrategiaUsada = `CKEditor via nome da textarea: ${textareaName}`;
          } else {
            const editor506Name = instanceNames.find(name => name.includes('_506'));
            if (editor506Name) {
              editor = CKEDITOR_ref.instances[editor506Name];
              estrategiaUsada = `CKEditor _506: ${editor506Name}`;
            } else {
              // Verificar se é documento novo (3+ editores)
              if (instanceNames.length >= 3 && allTextareas.length >= 3) {
                // Documento novo: usar o terceiro CKEditor (índice 2)
                editor = CKEDITOR_ref.instances[instanceNames[2]];
                estrategiaUsada = `Terceiro CKEditor (doc novo): ${instanceNames[2]}`;
              } else if (instanceNames.length >= 2) {
                // Fallback: usar o segundo CKEditor
                editor = CKEDITOR_ref.instances[instanceNames[1]];
                estrategiaUsada = `Segundo CKEditor: ${instanceNames[1]}`;
              }
            }
          }
        }

        const escapeHtml = (value) =>
          value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

        const removeDiacritics = (value) =>
          value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const getParaClass = (paragraph, index, total) => {
          const normalized = removeDiacritics(paragraph).toLowerCase();
          const trimmed = paragraph.trim();

          if (/^processo\s+n[ºo°]/i.test(trimmed)) {
            return { class: 'Texto_Alinhado_Esquerda', bold: true };
          }
          if (/^assunto:/i.test(trimmed)) {
            return { class: 'Texto_Alinhado_Esquerda', bold: true };
          }
          if (/^(despacho|ofício|memorando|nota técnica)\s+n[ºo°]/i.test(trimmed)) {
            return { class: 'Texto_Centralizado_Maiusculas', bold: false };
          }
          if (/^[àa]o?\s+/i.test(trimmed)) {
            return { class: 'Texto_Justificado_Recuo_Primeira_Linha', bold: false };
          }
          if (/^s[ãa]o\s+lu[íi]s/i.test(normalized)) {
            return { class: 'Texto_Alinhado_Direita', bold: false };
          }
          const closingPatterns = [
            "atenciosamente",
            "cordialmente",
            "respeitosamente",
            "sem mais"
          ];
          if (closingPatterns.some((pattern) => normalized.startsWith(pattern))) {
            return { class: 'Texto_Justificado_Recuo_Primeira_Linha', bold: false };
          }
          if (trimmed === trimmed.toUpperCase() &&
            trimmed.length > 5 &&
            trimmed.length < 100 &&
            /^[A-ZÀ-Ü\s]+$/.test(trimmed) &&
            !/^(DESPACHO|OFÍCIO|MEMORANDO|NOTA)/.test(trimmed)) {
            return { class: 'Texto_Centralizado', bold: true };
          }
          const cargoPatterns = [
            /assessor/i,
            /secret[aá]rio/i,
            /coordenador/i,
            /diretor/i,
            /chefe/i,
            /gerente/i,
            /analista/i,
            /t[eé]cnico/i
          ];
          if ((index === total - 1 && trimmed.length <= 100 && !/[.!?]$/.test(trimmed)) ||
            cargoPatterns.some(pattern => pattern.test(trimmed))) {
            return { class: 'Texto_Centralizado', bold: false };
          }
          return { class: 'Texto_Justificado_Recuo_Primeira_Linha', bold: false };
        };

        const trimmed = text.trim();

        if (!trimmed) {
          if (editor) {
            editor.setData("");
            if (typeof editor.fire === "function") editor.fire("change");
          }
          return { success: true, editorName: editor ? editor.name : targetTextarea.name };
        }

        const paragraphs = trimmed
          .split(/\n{2,}/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean);

        const formattedParagraphs = paragraphs.length > 0 ? paragraphs : [trimmed];

        const html = formattedParagraphs
          .map((paragraph, index) => {
            const paraFormat = getParaClass(paragraph, index, formattedParagraphs.length);
            // Não escapar HTML aqui - deixar o CKEditor processar o HTML
            const content = paragraph.replace(/\n/g, "<br>");
            const finalContent = paraFormat.bold ? `<strong>${content}</strong>` : content;
            return `<p class="${paraFormat.class}">${finalContent}</p>`;
          })
          .join("");

        try {
          if (editor && !editor.readOnly) {
            // Limpar o editor primeiro
            editor.setData("");

            // Inserir o HTML formatado
            editor.setData(html);

            // Forçar atualização e sincronização
            setTimeout(() => {
              try {
                if (typeof editor.updateElement === "function") {
                  editor.updateElement();
                }
                if (typeof editor.focus === "function") {
                  editor.focus();
                }
                if (typeof editor.fire === "function") {
                  editor.fire("change");
                  editor.fire("dataReady");
                }
              } catch (postError) { }
            }, 100);

            return {
              success: true,
              hadTextarea: true,
              method: 'ckeditor',
              editorName: editor.name,
              estrategia: estrategiaUsada,
              htmlLength: html.length
            };

          } else {
            targetTextarea.value = html;

            try {
              const inputEvent = new Event('input', { bubbles: true });
              const changeEvent = new Event('change', { bubbles: true });
              targetTextarea.dispatchEvent(inputEvent);
              targetTextarea.dispatchEvent(changeEvent);
            } catch (eventError) { }

            return {
              success: true,
              hadTextarea: true,
              method: 'textarea',
              textareaName: targetTextarea.name,
              htmlLength: html.length,
              editorReadOnly: editor ? editor.readOnly : 'N/A'
            };
          }

        } catch (insertError) {
          return {
            success: false,
            hadTextarea: true,
            error: insertError.message,
            stack: insertError.stack
          };
        }
      },
      args: [responseText]
    });

  } catch (error) {
    const message =
      typeof error?.message === "string" && error.message.includes("Cannot access contents")
        ? "A extensão não conseguiu acessar esta aba. Recarregue o editor do SEI e tente novamente."
        : error?.message || "Não foi possível aplicar o texto automaticamente nesta página.";

    throw new Error(message);
  }

  // Procurar o frame que teve sucesso
  let frameComSucesso = null;
  let textareaName = null;

  for (let i = 0; i < (injectionResults?.length || 0); i++) {
    const result = injectionResults[i]?.result;
    if (result && result.success) {
      frameComSucesso = result;
      textareaName = result.textareaName || result.editorName;
      break;
    }
  }

  if (!frameComSucesso) {
    // Verificar se algum frame tinha textarea
    const framesComTextarea = injectionResults?.filter(r => r?.result?.hadTextarea) || [];

    if (framesComTextarea.length > 0) {
      throw new Error("Textarea encontrada mas houve erro ao inserir o texto. Veja os logs do console do popup e da página do SEI.");
    } else {
      throw new Error("⚠️ Nenhuma textarea encontrada em nenhum frame!\n\n" +
        "SOLUÇÃO:\n" +
        "1. Clique no botão '🔄 Atualizar' ao lado de 'Janela de Destino'\n" +
        "2. Selecione a janela com ✅ que tem 'Despacho' no título\n" +
        "3. Certifique-se de que o editor está aberto e carregado\n" +
        "4. Tente novamente");
    }
  }

  // === ETAPA 4: Sincronizar com CKEDITOR usando world: MAIN ===
  if (textareaName) {
    try {
      const syncResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: (editorName) => {
          try {
            if (typeof CKEDITOR === 'undefined') {
              return { success: false, error: 'CKEDITOR não disponível' };
            }

            const editor = CKEDITOR.instances[editorName];

            if (!editor) {
              return { success: false, error: 'Editor não encontrado: ' + editorName };
            }

            if (editor.readOnly) {
              return { success: false, error: 'Editor em modo readOnly' };
            }

            const textarea = document.querySelector(`textarea[name="${editorName}"]`);
            if (!textarea) {
              return { success: false, error: 'Textarea não encontrada' };
            }

            const newValue = textarea.value;

            // Garantir que o HTML seja processado corretamente pelo CKEditor
            editor.setData(newValue);

            // Forçar atualização do CKEditor
            if (typeof editor.updateElement === 'function') {
              editor.updateElement();
            }

            setTimeout(() => {
              try {
                editor.focus();
              } catch (e) { }
            }, 100);

            return {
              success: true,
              editorName: editor.name,
              dataLength: newValue.length
            };

          } catch (e) {
            return { success: false, error: e.message, stack: e.stack };
          }
        },
        args: [textareaName]
      });
      // nada a fazer aqui se falhou...
    } catch (syncError) { }
  }

  return frameComSucesso;
}

/**
 * Limpa o texto do despacho recebido:
 * - Remove cabeçalho (órgão, processo, etc.)
 * - Remove dados após o nome do signatário (matrícula, email, etc.)
 * - Remove excesso de quebras de linha
 */
function limparDespachoRecebido(texto) {
  if (!texto || texto.trim() === '') {
    return texto;
  }

  let textoLimpo = texto;

  // 1. Remover cabeçalho típico de documentos SEI
  const padroesCabecalho = [
    /^GOVERNO\s+DO\s+ESTADO\s+[^\n]+\n?/gim,
    /^SECRETARIA\s+[^\n]+\n?/gim,
    /^Processo\s+n[ºo°]?\s*:?\s*[^\n]+\n?/gim,
    /^Assunto\s*:?\s*[^\n]+\n?/gim,
    /^DESPACHO\s+N[ºo°]?\s*[^\n]+\n?/gim,
    /^OFÍCIO\s+N[ºo°]?\s*[^\n]+\n?/gim,
    /^MEMORANDO\s+N[ºo°]?\s*[^\n]+\n?/gim,
    /^NOTA\s+TÉCNICA\s+N[ºo°]?\s*[^\n]+\n?/gim,
    /^De\s*:\s*[^\n]+\n?/gim,
    /^Para\s*:\s*[^\n]+\n?/gim,
    /^Data\s*:\s*[^\n]+\n?/gim,
  ];

  padroesCabecalho.forEach(padrao => {
    textoLimpo = textoLimpo.replace(padrao, '');
  });

  // 2. Remover dados após o nome do signatário
  const linhas = textoLimpo.split('\n');
  const linhasLimpas = [];
  let encontrouAssinatura = false;
  let linhasAposAssinatura = 0;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const linhaTrim = linha.trim();

    const ehAssinatura =
      /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+$/.test(linhaTrim) &&
      linhaTrim.length > 5 &&
      linhaTrim.length < 100 &&
      !/(DESPACHO|OFÍCIO|MEMORANDO|GOVERNO|SECRETARIA|PROCESSO)/.test(linhaTrim);

    const ehCargo =
      /(assessor|secret[aá]rio|coordenador|diretor|chefe|gerente|analista|t[eé]cnico)/i.test(linhaTrim);

    if (ehAssinatura || ehCargo) {
      encontrouAssinatura = true;
      linhasLimpas.push(linha);
      linhasAposAssinatura = 0;
      continue;
    }

    if (encontrouAssinatura) {
      linhasAposAssinatura++;

      const deveRemover =
        /matr[íi]cula/i.test(linhaTrim) ||
        /siape/i.test(linhaTrim) ||
        /@/.test(linhaTrim) ||
        /\(\d{2}\)\s*\d{4,5}-?\d{4}/.test(linhaTrim) ||
        /ramal/i.test(linhaTrim) ||
        /documento\s+assinado\s+eletronicamente/i.test(linhaTrim) ||
        /autenticidade\s+em/i.test(linhaTrim) ||
        /http[s]?:\/\//i.test(linhaTrim) ||
        /^[\d\s\-\.\/]+$/.test(linhaTrim) ||
        linhasAposAssinatura > 2;

      if (!deveRemover) {
        linhasLimpas.push(linha);
      }
    } else {
      linhasLimpas.push(linha);
    }
  }

  textoLimpo = linhasLimpas.join('\n');

  textoLimpo = textoLimpo.replace(/\n{3,}/g, '\n\n');

  textoLimpo = textoLimpo
    .split('\n')
    .map(linha => linha.trimEnd())
    .join('\n');

  textoLimpo = textoLimpo.trim();

  return textoLimpo;
}

// Função para substituir variáveis no template
function substituteTemplateVariables(template, variables) {
  let result = template;
  
  // Substituir cada variável pelo valor correspondente
  Object.keys(variables).forEach(key => {
    const placeholder = `{${key.toUpperCase()}}`;
    const value = variables[key] || '';
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return result;
}

async function callOpenAi({ apiKey, model, temperature, signatarioNome, signatarioCargo, orgaoNome, orgaoSetores }, despacho, extra, nomeDocumento, isNewDocument = false, docType = 'despacho', contexto = '') {

  // Construir o contexto organizacional
  let contextoOrganizacional = "Você é um assessor administrativo do Governo do Estado do Maranhão";

  if (orgaoNome) {
    contextoOrganizacional += `, lotado na ${orgaoNome}`;
  }

  // Processar a lista de setores
  if (orgaoSetores) {
    const setoresList = orgaoSetores
      .split('\n')
      .map(linha => linha.trim())
      .filter(linha => linha.length > 0);

    if (setoresList.length > 0) {
      contextoOrganizacional += ".\n\nESTRUTURA ORGANIZACIONAL:\n";
      setoresList.forEach((setor, index) => {
        contextoOrganizacional += `${index + 1}. ${setor}\n`;
      });
    }
  }

  contextoOrganizacional += "\nConheça a hierarquia e estrutura do órgão para fazer referências adequadas quando necessário.";

  // Obter modelo selecionado
  const selectedModel = getSelectedModel();
  const templateToUse = selectedModel.template;

  let instrucoesEstrutura;
 
  if (templateToUse && templateToUse.trim()) {
    // Substituir variáveis no template
    const templateSubstituido = substituteTemplateVariables(templateToUse, {
      signatario: signatarioNome || '[NOME DO SIGNATÁRIO]',
      cargo: signatarioCargo || '[CARGO DO SIGNATÁRIO]'
    });
    
    // Debug: mostrar informações do signatário
    console.log('🔍 DEBUG SIGNATÁRIO:', {
      signatarioNome,
      signatarioCargo,
      templateOriginal: templateToUse,
      templateSubstituido
    });

    // Usar formato personalizado se fornecido
    instrucoesEstrutura = `

ESTRUTURA OBRIGATÓRIA DO DOCUMENTO (use EXATAMENTE este formato):

${templateSubstituido}

INFORMAÇÕES IMPORTANTES SOBRE O SIGNATÁRIO:
- NOME DO SIGNATÁRIO: ${signatarioNome || '[NÃO INFORMADO - CONFIGURE NAS OPÇÕES]'}
- CARGO DO SIGNATÁRIO: ${signatarioCargo || '[NÃO INFORMADO - CONFIGURE NAS OPÇÕES]'}

REGRAS DE FORMATAÇÃO:
- Siga EXATAMENTE a estrutura definida acima
- O texto deve ser formal, claro e objetivo
- Identifique o destinatário correto do contexto fornecido
- Use "Ao" para masculino e "À" para feminino
- OBRIGATÓRIO: Use o nome e cargo do signatário informados acima no final do documento
- Se o signatário não estiver configurado, deixe os campos em branco ou use [NOME DO SIGNATÁRIO] e [CARGO DO SIGNATÁRIO]
`;
  } else {
    // Usar formato padrão
    instrucoesEstrutura = `

ESTRUTURA OBRIGATÓRIA DO DOCUMENTO (ordem exata):

1. Processo nº: [número do processo] (em negrito e alinhado à esquerda)
2. Assunto: [assunto do processo] (em negrito)
3. [LINHA VAZIA]
4. [TÍTULO DO DOCUMENTO EM MAIÚSCULAS - ex: DESPACHO Nº XXX] (alinhado ao centro)
5. [LINHA VAZIA]
6. Ao/À [destinatário - ex: "Ao Gabinete", "À Secretaria Adjunta"]
7. [PARÁGRAFOS DO CORPO DO TEXTO - conteúdo principal do documento]
8. [DUAS LINHAS VAZIAS]
9. São Luís/MA, data da assinatura eletrônica. (alinhado à direita)
10. [LINHA VAZIA]
11. Atenciosamente, (alinhado à esquerda)
12. [LINHA VAZIA]${signatarioNome ? `
13. ${signatarioNome.toUpperCase()}` : ''}${signatarioCargo ? `
14. ${signatarioCargo}` : ''}

REGRAS DE FORMATAÇÃO:
- Processo e Assunto devem estar em NEGRITO
- O título do documento deve estar em MAIÚSCULAS
- Use "Ao" para masculino e "À" para feminino
- O texto deve ser formal, claro e objetivo
- Identifique o destinatário correto do contexto fornecido
`;
  }

  // Revisado: garantir que signatarioNome e signatarioCargo estejam carregados das configurações
  // No caso de novo documento NÃO incluir o despacho recebido
  const messages = [
    {
      role: "system",
      content: contextoOrganizacional + instrucoesEstrutura
    },
    {
      role: "user",
      content: isNewDocument
        ? `Elabore um novo ${docType.toUpperCase()} administrativo profissional de acordo com o contexto fornecido e seguindo exatamente as orientações e estrutura a seguir:

${instrucoesEstrutura}

TIPO DE DOCUMENTO: ${docType.toUpperCase()}
${nomeDocumento ? `NOME DO DOCUMENTO A SER GERADO: ${nomeDocumento}` : ''}

SIGNATÁRIO: ${signatarioNome || "[NOME DO SIGNATÁRIO - CONFIGURE NAS OPÇÕES DA EXTENSÃO]"}
CARGO: ${signatarioCargo || "[CARGO DO SIGNATÁRIO - CONFIGURE NAS OPÇÕES DA EXTENSÃO]"}

INSTRUÇÕES CRÍTICAS SOBRE O SIGNATÁRIO:
- OBRIGATÓRIO: Inclua EXATAMENTE o nome "${signatarioNome || '[NOME DO SIGNATÁRIO]'}" no final do documento
- OBRIGATÓRIO: Inclua EXATAMENTE o cargo "${signatarioCargo || '[CARGO DO SIGNATÁRIO]'}" abaixo do nome
- Se o signatário não estiver configurado, deixe claro que precisa ser configurado nas opções

CONTEXTO E REQUISITOS:
${contexto}

${extra ? `INFORMAÇÕES ADICIONAIS:
${extra}` : ''}
`
        : `Elabore um despacho administrativo profissional em resposta ao documento recebido, seguindo exatamente as orientações e estrutura abaixo:

${instrucoesEstrutura}

SIGNATÁRIO: ${signatarioNome || "[NOME DO SIGNATÁRIO - CONFIGURE NAS OPÇÕES DA EXTENSÃO]"}
CARGO: ${signatarioCargo || "[CARGO DO SIGNATÁRIO - CONFIGURE NAS OPÇÕES DA EXTENSÃO]"}

INSTRUÇÕES CRÍTICAS SOBRE O SIGNATÁRIO:
- OBRIGATÓRIO: Inclua EXATAMENTE o nome "${signatarioNome || '[NOME DO SIGNATÁRIO]'}" no final do documento
- OBRIGATÓRIO: Inclua EXATAMENTE o cargo "${signatarioCargo || '[CARGO DO SIGNATÁRIO]'}" abaixo do nome
- Se o signatário não estiver configurado, deixe claro que precisa ser configurado nas opções

${despacho && despacho.trim()
  ? `DESPACHO/DOCUMENTO RECEBIDO: ${despacho}` : ''}

${extra ? `INFORMAÇÕES ADICIONAIS/CONTEXTO:
${extra}` : ''}
`
    }
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature,
      messages
    })
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    const message = details?.error?.message || response.statusText;
    throw new Error(message);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Não foi possível obter uma resposta da IA.");
  }

  return content;
}

async function handleGenerate() {
  // Tentar captura automática primeiro
  const captureSuccess = await autoCaptureIfNeeded();
  if (!captureSuccess) {
    return;
  }

  // Validar campos baseado no modo
  if (!validateFields()) {
    return;
  }

  const documentType = document.querySelector('input[name="documentType"]:checked').value;
  const isNewDocument = documentType === 'new';
  const nomeDocumento = documentName.value.trim();
  const extra = promptExtra.value.trim();

  let despacho = '';
  let contexto = '';

  if (isNewDocument) {
    contexto = newDocumentContext.value.trim();
  } else {
    despacho = dispatchText.value.trim();
  }

  const settings = await loadSettings();

  if (!settings.apiKey) {
    setStatus("⚙️ Configure sua chave de API nas opções da extensão.", true);
    chrome.runtime.openOptionsPage();
    return;
  }

  try {
    toggleLoading(true);
    setStatus("🤖 Chamando a IA generativa...");
    resultSection.hidden = true;

    let responseText;

    if (isNewDocument) {
      // Para novo documento
      responseText = await callOpenAi(settings, '', extra, nomeDocumento, isNewDocument, '', contexto);
    } else {
      // Para resposta (modo atual)
      const despachoLimpo = limparDespachoRecebido(despacho);
      responseText = await callOpenAi(settings, despachoLimpo, extra, nomeDocumento, isNewDocument, '', '');
    }

    // Atualizar títulos baseado no modo
    if (isNewDocument) {
      resultTitle.textContent = "✅ Novo Documento Gerado pela IA";
      resultHint.textContent = "💡 Você pode editar o documento antes de usar";
    } else {
      resultTitle.textContent = "✅ Resposta Sugerida pela IA";
      resultHint.textContent = "💡 Você pode editar o texto antes de usar";
    }

    responseTextEl.value = responseText;

    resultSection.hidden = false;

    // Carregar lista de janelas disponíveis (em paralelo)
    loadAvailableTabs().catch(err => { });

    setStatus("✅ Resposta gerada com sucesso! Revise, edite se necessário e aplique no despacho.");

    useResponseButton.onclick = async () => {
      // Prevenir múltiplos cliques
      if (useResponseButton.disabled) {
        return;
      }

      useResponseButton.disabled = true;
      useResponseButton.textContent = "⏳ Aplicando...";
      setStatus("📝 Inserindo a resposta no SEI...");

      try {
        // Pegar o texto atual do textarea (pode ter sido editado)
        const finalText = responseTextEl.value.trim();

        if (!finalText) {
          throw new Error("O texto está vazio!");
        }

        await applyResponseToPage(finalText);

        // Limpar campos baseado no modo
        // if (isNewDocument) {
        //   newDocumentContext.value = "";
        // } else {
        //   dispatchText.value = "";
        // }
        // documentName.value = "";
        // promptExtra.value = "";
        // resultSection.hidden = true;
        setStatus("✅ Resposta inserida no Documento com sucesso!");

        useResponseButton.textContent = "✅ Aplicado com sucesso!";
        setTimeout(() => {
          useResponseButton.textContent = "📋 Usar esta resposta no Documento";
        }, 2000);

      } catch (error) {
        setStatus(`❌ Erro ao aplicar resposta no Documento: ${error.message}`, true);

        useResponseButton.textContent = "❌ Erro - Tente novamente";
        setTimeout(() => {
          useResponseButton.textContent = "📋 Usar esta resposta no Documento";
        }, 3000);

      } finally {
        useResponseButton.disabled = false;
      }
    };
  } catch (error) {
    setStatus(`❌ Erro ao gerar resposta no Documento: ${error.message}`, true);
  } finally {
    toggleLoading(false);
  }
}

generateButton.addEventListener("click", () => {
  handleGenerate();
});

if (writeManuallyButton) {
  writeManuallyButton.addEventListener("click", async () => {
    // Atualizar títulos para modo manual
    resultTitle.textContent = "✍️ Escrever Texto Manualmente";
    resultHint.textContent = "📝 Digite ou cole seu texto abaixo e depois clique para inserir no SEI";

    // Mostrar a seção de resultados com texto vazio para edição manual
    responseTextEl.value = "";
    resultSection.hidden = false;

    // Carregar lista de janelas disponíveis
    loadAvailableTabs().catch(err => { });

    // Scroll suave até a seção de resultados
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Focar no textarea para o usuário começar a digitar
    responseTextEl.focus();

    setStatus("✍️ Digite seu texto e clique em 'Usar esta resposta no Documento' quando estiver pronto.");

    useResponseButton.onclick = async () => {
      useResponseButton.disabled = true;
      useResponseButton.textContent = "⏳ Aplicando...";
      setStatus("📝 Inserindo a resposta no SEI...");

      try {
        const textToApply = responseTextEl.value.trim();

        if (!textToApply) {
          throw new Error("Digite algum texto antes de aplicar.");
        }

        await applyResponseToPage(textToApply);

        setStatus("✅ Texto inserido com sucesso no editor!");
        useResponseButton.textContent = "✅ Aplicado!";

        setTimeout(() => {
          useResponseButton.textContent = "📋 Usar esta resposta no Documento";
          useResponseButton.disabled = false;
        }, 2000);
      } catch (error) {
        if (error.message.includes("CKEditor não encontrado")) {
          setStatus(`❌ ${error.message}\n\n💡 DICA: Use o dropdown "🎯 Janela de Destino" para selecionar a janela do POPUP do editor!`, true);
        } else {
          setStatus(`❌ Erro ao aplicar resposta no Documento: ${error.message}`, true);
        }

        useResponseButton.textContent = "📋 Usar esta resposta no Documento";
        useResponseButton.disabled = false;
      }
    };
  });
}


if (openOptionsButton) {
  openOptionsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

// Removido: botão de capturar janelas foi removido

if (captureTextButton) {
  captureTextButton.addEventListener("click", showCaptureSourceSelector);
}

if (confirmCaptureButton) {
  confirmCaptureButton.addEventListener("click", performCapture);
}

if (cancelCaptureButton) {
  cancelCaptureButton.addEventListener("click", cancelCapture);
}

if (reloadTargetTabsButton) {
  console.log('Botão de recarregar janelas encontrado');
  reloadTargetTabsButton.addEventListener("click", async () => {
    console.log('Botão de recarregar clicado');
    reloadTargetTabsButton.disabled = true;
    reloadTargetTabsButton.textContent = "⏳ Carregando...";
    try {
      await loadAvailableTabs();
      setStatus("✅ Lista de janelas atualizada!");
    } catch (error) {
      console.error('Erro ao carregar janelas:', error);
      setStatus("❌ Erro ao carregar janelas: " + error.message, true);
    } finally {
      reloadTargetTabsButton.disabled = false;
      reloadTargetTabsButton.textContent = "🔄 Atualizar";
    }
  });
} else {
  console.error('Botão de recarregar janelas não encontrado!');
}

// Event listeners para controlar a interface dinâmica
document.querySelectorAll('input[name="documentType"]').forEach(radio => {
  radio.addEventListener('change', updateInterfaceMode);
});

// Removido: documentTypeSelect não existe mais

// Event listener para modelo de documento
documentModelSelect.addEventListener('change', () => {
  console.log('Modelo selecionado:', documentModelSelect.value);
  updateModelPreview();
});

// Event listener para toggle do preview
if (previewToggle) {
  previewToggle.addEventListener('click', togglePreview);
}

// Event listener para header do preview (clique para expandir)
if (modelPreview) {
  const previewHeader = modelPreview.querySelector('.preview-header');
  if (previewHeader) {
    previewHeader.addEventListener('click', togglePreview);
  }
}

// Event listeners para atalhos de teclado
[dispatchText, documentName, promptExtra, newDocumentContext].forEach((element) => {
  if (element) {
    element.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        handleGenerate();
      }
    });
  }
});

// Funções para controlar o modal de créditos
function openCreditsModal() {
  creditsModal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCreditsModal() {
  creditsModal.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

// Event listeners para o modal de créditos
if (openCreditsButton) {
  openCreditsButton.addEventListener('click', openCreditsModal);
}

if (closeCreditsButton) {
  closeCreditsButton.addEventListener('click', closeCreditsModal);
}

// Fechar modal ao clicar no overlay
if (creditsModal) {
  creditsModal.addEventListener('click', (event) => {
    if (event.target === creditsModal) {
      closeCreditsModal();
    }
  });
}

// Fechar modal com tecla ESC
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !creditsModal.hasAttribute('hidden')) {
    closeCreditsModal();
  }
});

// Função para preencher exemplo de contexto
function fillContextExample() {
  const contextTextarea = document.getElementById('newDocumentContext');
  if (contextTextarea) {
    contextTextarea.value = `Destinatário: Secretaria de Administração
Objetivo: Solicitar esclarecimentos sobre documentação
Contexto: O processo 12345/2024 foi protocolado com documentos incompletos. Necessário solicitar complementação da documentação fiscal e técnica
Prazo: 30 dias`;

    // Dispara evento input para que qualquer listener atualize a tela
    const event = new Event('input', { bubbles: true });
    contextTextarea.dispatchEvent(event);
    contextTextarea.focus();
  }
}

// Event listener para o botão de preenchimento de exemplo
const fillContextExampleButton = document.getElementById('fillContextExampleButton');
if (fillContextExampleButton) {
  fillContextExampleButton.addEventListener('click', fillContextExample);
}

// Inicializar interface
updateInterfaceMode();
populateModelSelect();
loadModelsFromStorage();
