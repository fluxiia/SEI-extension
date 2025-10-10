const dispatchText = document.getElementById("dispatchText");
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
        orgaoSetores: ""
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

function toggleLoading(isLoading) {
  generateButton.disabled = isLoading;
  generateButton.textContent = isLoading ? "⏳ Gerando..." : "✨ Gerar Resposta";
}

async function showCaptureSourceSelector() {
  try {
    console.log("🔍 Buscando janelas do SEI...");
    
    // Buscar todas as janelas/tabs
    const allTabs = await chrome.tabs.query({});
    console.log(`📋 Total de tabs abertas: ${allTabs.length}`);
    
    // Filtrar apenas janelas do SEI
    const seiTabs = allTabs.filter(t => {
      const isSei = t.url && /\/sei\//i.test(t.url);
      console.log(`Tab ${t.id}: ${t.title} - É SEI? ${isSei}`);
      return isSei;
    });
    
    console.log(`✅ Janelas do SEI encontradas: ${seiTabs.length}`);

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
      
      docTabs.forEach((tab, index) => {
        const option = document.createElement('option');
        option.value = tab.id;
        
        let title = tab.title || 'Janela do SEI';
        if (title.length > 50) {
          title = title.substring(0, 47) + '...';
        }
        
        option.textContent = `✅ ${title}`;
        captureSourceTab.appendChild(option);
        console.log(`Adicionada opção DOC ${index}: ${title} (ID: ${tab.id})`);
      });
    }
    
    // Depois adicionar outras janelas
    if (otherTabs.length > 0) {
      const otherGroup = document.createElement('optgroup');
      otherGroup.label = '📂 Outras Janelas do SEI';
      
      otherTabs.forEach((tab, index) => {
        const option = document.createElement('option');
        option.value = tab.id;
        
        let title = tab.title || 'Janela do SEI';
        if (title.length > 50) {
          title = title.substring(0, 47) + '...';
        }
        
        option.textContent = title;
        captureSourceTab.appendChild(option);
        console.log(`Adicionada opção OTHER ${index}: ${title} (ID: ${tab.id})`);
      });
    }

    console.log(`Total de opções no select: ${captureSourceTab.options.length}`);

    // Auto-selecionar: priorizar janela com documento
    if (docTabs.length > 0) {
      captureSourceTab.value = docTabs[0].id;
      console.log(`Auto-selecionado janela de documento: ${docTabs[0].id}`);
    } else {
      // Fallback: usar sourceTabId
      const storage = await chrome.storage.local.get(['sourceTabId']);
      if (storage.sourceTabId && seiTabs.find(t => t.id === storage.sourceTabId)) {
        captureSourceTab.value = storage.sourceTabId;
        console.log(`Pré-selecionado tab ${storage.sourceTabId}`);
      }
    }

    // Mostrar seção de seleção
    captureSourceSection.hidden = false;
    captureTextButton.disabled = true;
    console.log("✅ Seção de captura exibida");
    
  } catch (error) {
    console.error("❌ Erro ao carregar janelas:", error);
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
    console.log("🔍 Selecionando tab:", selectedTabId);
    console.log("🔍 Tab selecionada:", captureSourceTab.options[captureSourceTab.selectedIndex].textContent);
    
    const tabId = parseInt(selectedTabId, 10);
    console.log("🚀 Executando script em TODOS os frames do tab:", tabId);
    
    // Executar script em TODOS os frames (incluindo iframes) para pegar o conteúdo renderizado
    let results;
    try {
      console.log("⏳ Executando script em todos os frames...");
      results = await chrome.scripting.executeScript({
        target: { 
          tabId: tabId,
          allFrames: true  // IMPORTANTE: executa em todos os frames/iframes
        },
        func: function() {
          console.log("🔍 [Frame] URL:", window.location.href);
          console.log("🔍 [Frame] Title:", document.title);
          
          // Verificar se este frame tem conteúdo de documento
          // (ignora frames que são só estrutura/menu)
          const isDocumentFrame = window.location.href.includes('documento_visualizar') ||
                                 window.location.href.includes('controlador.php?acao=documento');
          
          console.log("🔍 [Frame] É frame de documento?", isDocumentFrame);
          
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
              
              console.log(`[Frame] Elemento ${elemento.tagName}${elemento.id ? '#'+elemento.id : ''}: ${texto.length} chars`);
              
              if (texto.length > melhorTexto.length) {
                melhorTexto = texto;
                melhorElemento = elemento.tagName + (elemento.id ? '#' + elemento.id : '');
              }
            }
          }
          
          console.log(`[Frame] Melhor texto: ${melhorTexto.length} chars de ${melhorElemento}`);
          
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
      
      console.log("✅ Scripts executados em todos os frames");
      console.log("Total de resultados:", results.length);
      console.log("Resultados:", results);
      
    } catch (scriptError) {
      console.error("❌ Erro ao executar script:", scriptError);
      throw new Error("Erro ao injetar script: " + scriptError.message);
    }
    
    // Procurar o melhor resultado entre todos os frames
    let melhorResultado = null;
    let maiorTexto = 0;
    
    for (let i = 0; i < results.length; i++) {
      const res = results[i]?.result;
      console.log(`Resultado do frame ${i}:`, res);
      
      if (res && res.success && res.text && res.text.length > maiorTexto) {
        melhorResultado = res;
        maiorTexto = res.text.length;
      }
    }
    
    if (melhorResultado) {
      console.log(`✅ Melhor resultado: ${maiorTexto} caracteres de ${melhorResultado.from}`);
      dispatchText.value = melhorResultado.text;
      setStatus("✅ Texto capturado com sucesso!");
      captureSourceSection.hidden = true;
      captureTextButton.disabled = false;
      return;
    }
    
    throw new Error("Nenhum frame com conteúdo de texto válido foi encontrado. Abra um documento no SEI.")
  } catch (error) {
    console.error("Erro ao capturar texto:", error);
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
    console.log("🔍 Selecionando tab:", selectedTabId);
    console.log("🔍 Tab selecionada:", captureSourceTab.options[captureSourceTab.selectedIndex].textContent);
    
    const tabId = parseInt(selectedTabId, 10);
    console.log("🚀 Prestes a executar chrome.scripting.executeScript no tab:", tabId);
    
    // Executar script para capturar texto do documento
    let results;
    try {
      console.log("⏳ Executando script...");
      results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: function() {
        console.log("🔍 [DENTRO DO func] Iniciando captura de texto...");
        console.log("URL atual:", window.location.href);
        console.log("Document title:", document.title);

        // Procurar o iframe de visualização (pode ser ifrVisualizacao ou ifrArvoreHtml)
        let iframe = document.getElementById('ifrVisualizacao') || 
                     document.getElementById('ifrArvoreHtml') ||
                     document.querySelector('iframe[src*="documento_visualizar"]') ||
                     document.querySelector('iframe');
        
        console.log("Iframe encontrado?", !!iframe);
        console.log("ID do iframe:", iframe ? iframe.id : 'nenhum');
        
        if (iframe) {
          console.log("iframe.src:", iframe.src);
          console.log("iframe.clientHeight:", iframe.clientHeight);
          console.log("iframe.clientWidth:", iframe.clientWidth);
        }
        
        if (!iframe) {
          return { success: false, error: "Nenhum iframe de visualização encontrado na página." };
        }
        
        console.log("iframe.contentWindow existe?", !!iframe.contentWindow);
        console.log("iframe.contentDocument existe?", !!iframe.contentDocument);
        
        // Tentar acessar o documento do iframe
        let iframeDoc = null;
        
        try {
          // Tentar contentDocument primeiro
          iframeDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
          console.log("Documento do iframe acessado?", !!iframeDoc);
        } catch (e) {
          console.log("❌ Erro ao acessar documento do iframe:", e && e.message);
          return { success: false, error: "Não foi possível acessar o conteúdo do iframe. Erro: " + (e && e.message) };
        }
        
        if (!iframeDoc) {
          return { success: false, error: "Não foi possível acessar o documento dentro do iframe." };
        }
        
        console.log("URL do iframe:", (iframeDoc.location && iframeDoc.location.href) || "não disponível");
        console.log("Title do iframe:", iframeDoc.title || "sem título");
        console.log("Body do iframe existe?", !!iframeDoc.body);
        console.log("Body innerHTML length:", iframeDoc.body ? iframeDoc.body.innerHTML.length : 0);
        console.log("ReadyState do iframe:", iframeDoc.readyState);
        
        // Mostrar primeiros 500 chars do HTML do body
        if (iframeDoc.body) {
          console.log("Primeiros 500 chars do body.innerHTML:", iframeDoc.body.innerHTML.substring(0, 500));
        }
        
        // Listar elementos disponíveis no iframe
        const elementos = {
          divConteudo: iframeDoc.querySelector('#divConteudo'),
          infraAreaTelaD: iframeDoc.querySelector('#divInfraAreaTelaD'),
          divEditor: iframeDoc.querySelector('#divEditor'),
          editorVisualizacao: iframeDoc.querySelector('.editor-visualizacao'),
          body: iframeDoc.body
        };
        
        console.log("Elementos encontrados no iframe:", {
          divConteudo: !!elementos.divConteudo,
          infraAreaTelaD: !!elementos.infraAreaTelaD,
          divEditor: !!elementos.divEditor,
          editorVisualizacao: !!elementos.editorVisualizacao,
          body: !!elementos.body
        });
        
        // Tentar capturar texto de cada elemento
        let melhorTexto = '';
        let melhorElemento = '';
        
        for (let [nome, elemento] of Object.entries(elementos)) {
          if (elemento) {
            let texto = elemento.innerText || elemento.textContent || '';
            texto = texto.trim();
            
            console.log(`Texto do ${nome}: ${texto.length} caracteres`);
            
            // Mostrar preview do texto para debug
            if (texto.length > 0) {
              console.log(`Preview do ${nome}:`, texto.substring(0, 200));
            }
            
            // Guardar o melhor texto encontrado
            if (texto.length > melhorTexto.length) {
              melhorTexto = texto;
              melhorElemento = nome;
            }
          }
        }
        
        console.log(`Melhor elemento encontrado: ${melhorElemento} com ${melhorTexto.length} caracteres`);
        
        // Se encontrou qualquer texto (reduzido de 100 para 10 caracteres)
        if (melhorTexto && melhorTexto.length > 10) {
          console.log(`✅ Texto capturado de ${melhorElemento}:`, melhorTexto.substring(0, 200) + "...");
          return { success: true, text: melhorTexto };
        }
        
        console.log("❌ Nenhum elemento com texto suficiente encontrado");
        console.log("Tentando estratégia alternativa: pegar todo o HTML do iframe...");
        
        // Última tentativa: pegar todo o texto do body
        if (iframeDoc.body) {
          let todoTexto = iframeDoc.body.innerText || iframeDoc.body.textContent || '';
          todoTexto = todoTexto.trim();
          console.log(`Texto total do body: ${todoTexto.length} caracteres`);
          
          if (todoTexto && todoTexto.length > 10) {
            console.log(`✅ Capturado do body completo`);
            return { success: true, text: todoTexto };
          }
        }
        
        return { success: false, error: "Documento encontrado mas sem conteúdo de texto válido. Abra um documento no painel de visualização. Melhor elemento: " + melhorElemento + " com " + melhorTexto.length + " caracteres." };
      }
    });
      console.log("✅ Script executado com sucesso");
      console.log("Resultados:", results);
    } catch (scriptError) {
      console.error("❌ Erro ao executar script:", scriptError);
      throw new Error("Erro ao injetar script na página: " + scriptError.message);
    }

    const result = results[0]?.result;
    console.log("Resultado extraído:", result);
    
    if (result && result.success && result.text) {
      dispatchText.value = result.text;
      setStatus("✅ Texto capturado com sucesso!");
      captureSourceSection.hidden = true;
      captureTextButton.disabled = false;
    } else {
      throw new Error(result?.error || "Não foi possível capturar o texto do documento.");
    }
    
  } catch (error) {
    console.error("Erro ao capturar texto:", error);
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
  // Buscar todas as janelas do SEI abertas
  const allTabs = await chrome.tabs.query({});
  const seiTabs = allTabs.filter(t => t.url && /\/sei\//i.test(t.url));
  
  // Separar janelas de editor das outras
  const editorTabs = seiTabs.filter(t => t.url.includes('acao=editor_montar'));
  const otherTabs = seiTabs.filter(t => !t.url.includes('acao=editor_montar'));

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
}

async function applyResponseToPage(responseText) {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 [applyResponseToPage] INICIANDO APLICAÇÃO DO TEXTO");
  console.log("=".repeat(80));
  console.log("📏 Tamanho do texto:", responseText.length, "caracteres");
  console.log("📋 Preview do texto:", responseText.substring(0, 100) + "...");
  console.log("⏰ Timestamp:", new Date().toISOString());
  
  let tab = null;

  console.log("\n🔍 ETAPA 1: Procurando janela do SEI...");

  // Verificar se o usuário selecionou uma janela específica
  const selectedTabId = targetTabSelect.value;
  console.log("   🎯 Target tab select value:", selectedTabId);
  
  if (selectedTabId) {
    // Usar a janela selecionada pelo usuário
    const tabId = parseInt(selectedTabId, 10);
    console.log("   🎯 Usando janela selecionada pelo usuário: ID =", tabId);
    
    try {
      tab = await chrome.tabs.get(tabId);
      console.log("   ✅ Tab selecionado encontrado:");
      console.log("      - ID:", tab.id);
      console.log("      - URL:", tab.url);
      console.log("      - Title:", tab.title);
    } catch (error) {
      console.error("   ❌ Erro ao obter tab selecionado:", error);
      throw new Error("A janela selecionada não existe mais. Atualize a lista de janelas.");
    }
  } else {
    // Modo automático: buscar janela com "editor_montar" na URL (popup do editor)
    const allTabs = await chrome.tabs.query({});
    const editorTabs = allTabs.filter(t => t.url && t.url.includes('acao=editor_montar'));
    
    console.log("🔍 Procurando janelas do editor SEI...");
    console.log("📋 Janelas com editor_montar encontradas:", editorTabs.length);
    editorTabs.forEach(t => console.log("  -", t.id, t.title));

    if (editorTabs.length > 0) {
      // Usar a primeira janela de editor encontrada
      tab = editorTabs[0];
      console.log("✅ Usando janela do editor:", tab.id);
    } else {
      // Fallback: tentar sourceTabId
      const storage = await chrome.storage.local.get(['sourceTabId']);
      console.log("sourceTabId armazenado:", storage.sourceTabId);

      if (storage.sourceTabId) {
        try {
          tab = await chrome.tabs.get(storage.sourceTabId);
          console.log("✅ Tab sourceTabId encontrado:", tab.id, tab.url);
        } catch (error) {
          console.log("⚠️ Tab sourceTabId não existe mais:", error.message);
          tab = null;
        }
      }

      // Se ainda não encontrou, buscar qualquer aba do SEI
      if (!tab) {
        const seiTabs = allTabs.filter(t => t.url && /\/sei\//i.test(t.url));

        console.log("📋 Total de tabs do SEI encontradas:", seiTabs.length);
        seiTabs.forEach(t => console.log("  -", t.id, t.url));

        if (seiTabs.length === 0) {
          throw new Error("Não foi possível encontrar uma janela do SEI aberta. Abra o editor de despacho primeiro.");
        }

        // Preferir a aba ativa ou a primeira encontrada
        tab = seiTabs.find(t => t.active) || seiTabs[0];
        console.log("🎯 Usando tab:", tab.id, tab.url);
      }
    }
  }

  if (!tab || !tab.id) {
    throw new Error("Não foi possível identificar a janela do SEI.");
  }

  console.log("\n🚀 ETAPA 2: Injetando script no tab...");
  console.log("   📍 Tab ID:", tab.id);
  console.log("   🌐 URL do tab:", tab.url);
  console.log("   📄 Título do tab:", tab.title);

  let injectionResults;

  try {
    console.log("   ⏳ Executando chrome.scripting.executeScript...");
    console.log("   📦 Parâmetros:");
    console.log("      - allFrames: true");
    console.log("      - Tamanho do texto:", responseText.length);
    
    injectionResults = await chrome.scripting.executeScript({
      target: { 
        tabId: tab.id,
        allFrames: true  // IMPORTANTE: Executa em TODOS os frames, igual à captura
      },
      func: (text) => {
        // Este código roda em CADA frame/iframe da página
        console.log("🔍 [Frame] Iniciando busca por editor...");
        console.log("   URL:", window.location.href);
        console.log("   Document.title:", document.title);
        
        // === FILTRO: Ignorar iframes internos do CKEditor ===
        // Os iframes about:srcdoc são os editores visuais, não queremos processar eles
        if (window.location.href.includes('about:srcdoc') || window.location.href === 'about:blank') {
          console.log("   ⏭️ Pulando iframe interno (about:srcdoc ou about:blank)");
          return { 
            success: false, 
            skipped: true,
            reason: 'iframe interno do CKEditor'
          };
        }
        
        // === PASSO 1: Procurar textareas primeiro ===
        console.log("\n📋 PASSO 1: Procurando textareas...");
        const allTextareas = document.querySelectorAll('textarea');
        console.log(`   Total de textareas encontradas: ${allTextareas.length}`);
        
        allTextareas.forEach((ta, i) => {
          console.log(`   [${i}] name="${ta.name}" id="${ta.id}"`);
        });
        
        // Se não tem textareas, não é o frame correto
        if (allTextareas.length === 0) {
          console.log("   ⏭️ Pulando frame sem textareas");
          return {
            success: false,
            skipped: true,
            reason: 'sem textareas'
          };
        }
        
        // Procurar especificamente por txaEditor_506
        let targetTextarea = null;
        const textarea506 = document.querySelector('textarea[name="txaEditor_506"]');
        
        if (textarea506) {
          console.log("   ✅ Encontrada textarea txaEditor_506!");
          targetTextarea = textarea506;
        } else {
          console.log("   ⚠️ textarea txaEditor_506 não encontrada, procurando alternativas...");
          
          // Procurar qualquer textarea que contenha "_506"
          for (let ta of allTextareas) {
            if (ta.name && ta.name.includes('_506')) {
              console.log(`   ✅ Encontrada alternativa: ${ta.name}`);
              targetTextarea = ta;
              break;
            }
          }
          
          // Se não encontrou _506, pegar a segunda textarea (índice 1)
          if (!targetTextarea && allTextareas.length >= 2) {
            console.log(`   🔍 Usando segunda textarea: ${allTextareas[1].name || allTextareas[1].id}`);
            targetTextarea = allTextareas[1];
          }
        }
        
        if (!targetTextarea) {
          console.log("   ❌ Nenhuma textarea adequada encontrada!");
          console.log("   📊 Total de textareas na página:", allTextareas.length);
          return { 
            success: false, 
            hadTextarea: false,
            totalTextareas: allTextareas.length,
            error: "Nenhuma textarea encontrada para inserir o texto"
          };
        }
        
        console.log(`\n✅ Textarea selecionada: name="${targetTextarea.name}" id="${targetTextarea.id}"`);
        
        // === PASSO 2: Tentar obter instância do CKEditor ===
        console.log("\n📋 PASSO 2: Procurando instância do CKEditor...");
        let editor = null;
        let estrategiaUsada = "";
        let CKEDITOR_ref = null;
        
        // Procurar CKEDITOR em múltiplos contextos
        const possiveisCKEDITORs = [
          { name: 'window.CKEDITOR', ref: () => window.CKEDITOR },
          { name: 'global CKEDITOR', ref: () => (typeof CKEDITOR !== 'undefined' ? CKEDITOR : null) },
          { name: 'window.parent.CKEDITOR', ref: () => window.parent?.CKEDITOR },
          { name: 'window.top.CKEDITOR', ref: () => window.top?.CKEDITOR },
          { name: 'self.CKEDITOR', ref: () => self?.CKEDITOR }
        ];
        
        console.log("   🔍 Procurando CKEDITOR em diferentes contextos...");
        for (let contexto of possiveisCKEDITORs) {
          try {
            const ref = contexto.ref();
            if (ref && ref.instances) {
              CKEDITOR_ref = ref;
              console.log(`   ✅ ${contexto.name} encontrado!`);
              console.log(`       - Total de instâncias: ${Object.keys(ref.instances).length}`);
              break;
            } else {
              console.log(`   ⚠️ ${contexto.name}: ${ref ? 'sem instances' : 'não disponível'}`);
            }
          } catch (e) {
            console.log(`   ❌ ${contexto.name}: erro ao acessar (${e.message})`);
          }
        }
        
        if (!CKEDITOR_ref) {
          console.log("\n   ⚠️⚠️ CKEDITOR não encontrado em nenhum contexto!");
          console.log("   Vou inserir diretamente na textarea");
        }
        
        if (CKEDITOR_ref) {
          const instanceNames = Object.keys(CKEDITOR_ref.instances);
          console.log(`   Total de instâncias CKEDITOR: ${instanceNames.length}`);
          console.log(`   Instâncias:`, instanceNames);
          
          // Tentar obter o editor pela textarea
          const textareaName = targetTextarea.name || targetTextarea.id;
          
          if (textareaName && CKEDITOR_ref.instances[textareaName]) {
            editor = CKEDITOR_ref.instances[textareaName];
            estrategiaUsada = `CKEditor via nome da textarea: ${textareaName}`;
            console.log(`   ✅ ${estrategiaUsada}`);
            console.log(`       - readOnly: ${editor.readOnly}`);
          } else {
            // Procurar por _506
            const editor506Name = instanceNames.find(name => name.includes('_506'));
            if (editor506Name) {
              editor = CKEDITOR_ref.instances[editor506Name];
              estrategiaUsada = `CKEditor _506: ${editor506Name}`;
              console.log(`   ✅ ${estrategiaUsada}`);
              console.log(`       - readOnly: ${editor.readOnly}`);
            } else if (instanceNames.length >= 2) {
              // Segundo editor da lista
              editor = CKEDITOR_ref.instances[instanceNames[1]];
              estrategiaUsada = `Segundo CKEditor: ${instanceNames[1]}`;
              console.log(`   ✅ ${estrategiaUsada}`);
              console.log(`       - readOnly: ${editor.readOnly}`);
            }
          }
        }
        
        console.log(`\n📊 Status após busca:`);
        console.log(`   - Textarea encontrada: ✅ ${targetTextarea.name}`);
        console.log(`   - CKEditor encontrado: ${editor ? '✅ ' + editor.name : '❌ Não'}`);
        console.log(`   - CKEditor readOnly: ${editor ? editor.readOnly : 'N/A'}`);
        
        // Funções auxiliares
        const escapeHtml = (value) =>
          value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

        const removeDiacritics = (value) =>
          value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const shouldUseLeftClass = (paragraph, index, total) => {
          const normalized = removeDiacritics(paragraph).toLowerCase();
          const closingPatterns = [
            "atenciosamente",
            "cordialmente",
            "respeitosamente",
            "sem mais",
            "assinado",
            "assinatura"
          ];

          if (closingPatterns.some((pattern) => normalized.startsWith(pattern))) {
            return true;
          }

          if (normalized.includes("assinado eletronicamente")) {
            return true;
          }

          if (/^s[ãa]o\s+lu[íi]s/i.test(paragraph)) {
            return true;
          }

          if (index === total - 1 && paragraph.length <= 90 && !/[.!?]$/.test(paragraph.trim())) {
            return true;
          }

          return false;
        };

        // Preparar o texto
        const trimmed = text.trim();

        if (!trimmed) {
          console.log("\n   ⚠️ Texto vazio");
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
            const className = shouldUseLeftClass(paragraph, index, formattedParagraphs.length)
              ? "Tabela_Texto_Alinhado_Esquerda"
              : "Texto_Justificado_Recuo_Primeira_Linha";

            return `<p class="${className}">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`;
          })
          .join("");

        // === PASSO 3: Inserir o texto ===
        console.log("\n📝 PASSO 3: Inserindo texto...");
        console.log(`   Tamanho do HTML: ${html.length} caracteres`);
        console.log(`   Preview:`, html.substring(0, 150) + "...");

        try {
          if (editor && !editor.readOnly) {
            // Usar CKEditor se disponível e editável
            console.log(`   🎯 Inserindo via CKEditor: ${editor.name}`);
            
            editor.setData(html);
            console.log("   ✅ setData() executado");
            
            // Focar e disparar eventos após inserção
            setTimeout(() => {
              try {
                if (typeof editor.focus === "function") {
                  editor.focus();
                  console.log("   ✅ Editor focado");
                }
                
                if (typeof editor.fire === "function") {
                  editor.fire("change");
                  console.log("   ✅ Evento 'change' disparado");
                }
              } catch (postError) {
                console.debug("   ⚠️ Erro pós-inserção:", postError);
              }
            }, 100);
            
            console.log("   ✅ Texto inserido via CKEditor!");
            return { 
              success: true,
              hadTextarea: true,
              method: 'ckeditor',
              editorName: editor.name,
              estrategia: estrategiaUsada,
              htmlLength: html.length
            };
            
          } else {
            // Fallback: inserir direto na textarea
            console.log(`   🎯 Inserindo direto na textarea (CKEditor não disponível ou readOnly)`);
            console.log(`       Motivo: ${editor ? 'CKEditor está readOnly' : 'CKEditor não encontrado'}`);
            
            targetTextarea.value = html;
            console.log("   ✅ Textarea.value atualizado");
            console.log(`       Novo value.length: ${targetTextarea.value.length}`);
            
            // Tentar disparar eventos na textarea
            try {
              const inputEvent = new Event('input', { bubbles: true });
              const changeEvent = new Event('change', { bubbles: true });
              targetTextarea.dispatchEvent(inputEvent);
              targetTextarea.dispatchEvent(changeEvent);
              console.log("   ✅ Eventos disparados na textarea");
            } catch (eventError) {
              console.log("   ⚠️ Erro ao disparar eventos:", eventError.message);
            }
            
            console.log("   💡 Texto inserido na textarea!");
            console.log("   💡 A sincronização com CKEditor será feita na ETAPA 4 (world: MAIN)");
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
          console.error("   ❌ Erro ao inserir texto:", insertError);
          console.error("   Stack:", insertError.stack);
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
    
    console.log("   ✅ chrome.scripting.executeScript completou!");
    console.log("   📊 Total de resultados:", injectionResults?.length || 0);
    
  } catch (error) {
    console.error("\n❌ ERRO ao injetar script:", error);
    console.error("   Error.name:", error.name);
    console.error("   Error.message:", error.message);
    console.error("   Error.stack:", error.stack);

    const message =
      typeof error?.message === "string" && error.message.includes("Cannot access contents")
        ? "A extensão não conseguiu acessar esta aba. Recarregue o editor do SEI e tente novamente."
        : error?.message || "Não foi possível aplicar o texto automaticamente nesta página.";

    throw new Error(message);
  }

  console.log("\n📦 ETAPA 3: Analisando resultados da injeção...");
  console.log("   Total de frames processados:", injectionResults?.length || 0);
  
  // Procurar o frame que teve sucesso
  let frameComSucesso = null;
  let textareaName = null;
  
  for (let i = 0; i < (injectionResults?.length || 0); i++) {
    const result = injectionResults[i]?.result;
    console.log(`\n   📦 Frame [${i}]:`, result);
    
    if (result && result.success) {
      frameComSucesso = result;
      textareaName = result.textareaName || result.editorName;
      console.log(`   ✅✅✅ Frame [${i}] inseriu o texto com SUCESSO!`);
      console.log(`        - Método: ${result.method}`);
      console.log(`        - Editor: ${textareaName}`);
      console.log(`        - Tamanho HTML: ${result.htmlLength}`);
      break;
    } else if (result) {
      console.log(`   ⚠️ Frame [${i}] falhou:`, result.error || result.reason || "Sem detalhes");
    }
  }

  if (!frameComSucesso) {
    console.error("\n❌❌❌ NENHUM FRAME CONSEGUIU INSERIR O TEXTO!");
    console.error("   Total de frames tentados:", injectionResults?.length || 0);
    
    // Mostrar detalhes de todos os frames
    console.error("\n   📋 Detalhes de todos os frames:");
    injectionResults?.forEach((r, i) => {
      console.error(`      Frame [${i}]:`, JSON.stringify(r?.result, null, 2));
    });
    
    // Verificar se algum frame tinha textarea
    const framesComTextarea = injectionResults?.filter(r => r?.result?.hadTextarea) || [];
    
    if (framesComTextarea.length > 0) {
      console.error("   Frames com textarea que falharam:", framesComTextarea.length);
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
  console.log("\n🚀 ETAPA 4: Sincronizando com CKEDITOR (world: MAIN)...");
  console.log("   Textarea name:", textareaName);
  
  if (textareaName) {
    try {
      console.log("   ⏳ Executando script no contexto da página (world: MAIN)...");
      
      const syncResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN', // IMPORTANTE: Executa no contexto da página, não da extensão
        func: (editorName) => {
          console.log("🔧 [MAIN WORLD] Sincronizando CKEditor...");
          console.log("   Editor name:", editorName);
          
          try {
            // Verificar se CKEDITOR existe no contexto da página
            if (typeof CKEDITOR === 'undefined') {
              console.log("   ❌ CKEDITOR não disponível no contexto da página");
              return { success: false, error: 'CKEDITOR não disponível' };
            }
            
            console.log("   ✅ CKEDITOR disponível!");
            console.log("   Total de instâncias:", Object.keys(CKEDITOR.instances).length);
            console.log("   Instâncias:", Object.keys(CKEDITOR.instances));
            
            // Obter a instância do editor
            const editor = CKEDITOR.instances[editorName];
            
            if (!editor) {
              console.log("   ❌ Editor não encontrado:", editorName);
              return { success: false, error: 'Editor não encontrado: ' + editorName };
            }
            
            console.log("   ✅ Editor encontrado:", editor.name);
            console.log("   readOnly:", editor.readOnly);
            
            if (editor.readOnly) {
              console.log("   ⚠️ Editor está em modo somente leitura");
              return { success: false, error: 'Editor em modo readOnly' };
            }
            
            // Obter o valor da textarea
            const textarea = document.querySelector(`textarea[name="${editorName}"]`);
            if (!textarea) {
              console.log("   ❌ Textarea não encontrada");
              return { success: false, error: 'Textarea não encontrada' };
            }
            
            const newValue = textarea.value;
            console.log("   📏 Tamanho do valor da textarea:", newValue.length);
            
            // Sincronizar o CKEditor com a textarea
            editor.setData(newValue);
            console.log("   ✅ CKEditor.setData() executado!");
            
            // Focar no editor
            setTimeout(() => {
              try {
                editor.focus();
                console.log("   ✅ Editor focado");
              } catch (e) {
                console.log("   ⚠️ Erro ao focar:", e.message);
              }
            }, 100);
            
            return { 
              success: true, 
              editorName: editor.name,
              dataLength: newValue.length
            };
            
          } catch (e) {
            console.error("   ❌ Erro ao sincronizar:", e);
            return { success: false, error: e.message, stack: e.stack };
          }
        },
        args: [textareaName]
      });
      
      console.log("   ✅ Script MAIN executado!");
      console.log("   Resultado:", syncResults?.[0]?.result);
      
      const syncResult = syncResults?.[0]?.result;
      if (syncResult?.success) {
        console.log("   ✅✅✅ CKEDITOR sincronizado com SUCESSO!");
      } else {
        console.log("   ⚠️ Sincronização falhou:", syncResult?.error || "sem detalhes");
        console.log("   O texto foi inserido na textarea, mas o CKEditor pode não ter sido atualizado visualmente.");
      }
      
    } catch (syncError) {
      console.error("   ❌ Erro na sincronização MAIN:", syncError);
      console.error("   O texto foi inserido na textarea, mas o CKEditor pode não ter sido atualizado visualmente.");
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("✅✅✅ [applyResponseToPage] CONCLUÍDO!");
  console.log("=".repeat(80) + "\n");
  
  return frameComSucesso;
}

async function callOpenAi({ apiKey, model, temperature, signatarioNome, signatarioCargo, orgaoNome, orgaoSetores }, despacho, extra) {
  
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
  
  // Instruções sobre a estrutura do documento
  const instrucoesEstrutura = `

ESTRUTURA OBRIGATÓRIA DO DOCUMENTO:

1. CABEÇALHO (sempre incluir):
   - Destino (ex: "Ao Gabinete", "À Secretaria Adjunta", etc.)
   - Número do processo (se fornecido no despacho ou contexto)
   - Assunto do processo

2. CORPO DO TEXTO:
   - Redação clara, objetiva e respeitosa
   - Linguagem formal administrativa
   - Tratamento adequado às autoridades

3. FECHO OBRIGATÓRIO:
   - Sempre terminar com "Atenciosamente,"
   - Seguido de "São Luís (MA), data da assinatura eletrônica."${signatarioNome ? `
   - Nome do signatário: ${signatarioNome}` : ''}${signatarioCargo ? `
   - Cargo: ${signatarioCargo}` : ''}

IMPORTANTE:
- Mantenha o tom formal e respeitoso típico de documentos oficiais
- Use a formatação adequada do SEI
- Seja objetivo e direto
- Identifique no despacho original quem é o destinatário e mencione adequadamente
`;

  const messages = [
    {
      role: "system",
      content: contextoOrganizacional + instrucoesEstrutura
    },
    {
      role: "user",
      content: `Elabore um despacho administrativo profissional com base no seguinte contexto:

DESPACHO/DOCUMENTO RECEBIDO:
${despacho}

${extra ? `INFORMAÇÕES ADICIONAIS/CONTEXTO:
${extra}` : ''}

Lembre-se de:
1. Incluir o destino no início (identifique do contexto)
2. Mencionar número do processo e assunto (se identificável no texto)
3. Redigir o corpo do texto de forma clara e profissional
4. Finalizar com "Atenciosamente," e "São Luís (MA), data da assinatura eletrônica."${signatarioNome ? `, seguido do nome "${signatarioNome}"` : ''}${signatarioCargo ? ` e cargo "${signatarioCargo}"` : ''}`
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
  const despacho = dispatchText.value.trim();
  const extra = promptExtra.value.trim();

  if (!despacho) {
    setStatus("⚠️ Cole o texto do despacho antes de gerar a resposta.", true);
    return;
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

    const responseText = await callOpenAi(settings, despacho, extra);

    // Restaurar títulos para modo IA
    resultTitle.textContent = "✅ Resposta Sugerida pela IA";
    resultHint.textContent = "💡 Você pode editar o texto antes de usar";
    
    responseTextEl.value = responseText;
    
    resultSection.hidden = false;
    
    // Carregar lista de janelas disponíveis (em paralelo)
    loadAvailableTabs().catch(err => {
      console.error("Erro ao carregar lista de janelas:", err);
    });
    
    setStatus("✅ Resposta gerada com sucesso! Revise, edite se necessário e aplique no despacho.");

    useResponseButton.onclick = async () => {
      console.log("=".repeat(60));
      console.log("🔵 [POPUP] BOTÃO CLICADO!");
      console.log("=".repeat(60));
      console.log("Timestamp:", new Date().toISOString());
      console.log("Texto length:", responseTextEl.value.length);
      console.log("Texto preview:", responseTextEl.value.substring(0, 100) + "...");
      console.log("Botão disabled antes:", useResponseButton.disabled);
      console.log("=".repeat(60));
      
      // Prevenir múltiplos cliques
      if (useResponseButton.disabled) {
        console.log("⚠️ Botão já está processando, ignorando clique");
        return;
      }
      
      useResponseButton.disabled = true;
      useResponseButton.textContent = "⏳ Aplicando...";
      setStatus("📝 Inserindo a resposta no SEI...");
      console.log("✅ Status atualizado, iniciando processamento...");

      try {
        // Pegar o texto atual do textarea (pode ter sido editado)
        const finalText = responseTextEl.value.trim();
        
        console.log("🔍 [POPUP] Texto a ser aplicado:", finalText.substring(0, 200));
        
        if (!finalText) {
          throw new Error("O texto está vazio!");
        }
        
        console.log("🔵 [POPUP] Chamando applyResponseToPage...");
        console.log("🔵 [POPUP] Aguardando execução...");
        
        const result = await applyResponseToPage(finalText);
        
        console.log("✅ [POPUP] applyResponseToPage retornou:", result);
        console.log("✅ [POPUP] Resposta aplicada com sucesso!");
        
        dispatchText.value = "";
        promptExtra.value = "";
        resultSection.hidden = true;
        setStatus("✅ Resposta inserida no despacho com sucesso!");
        
        // Feedback visual adicional
        useResponseButton.textContent = "✅ Aplicado com sucesso!";
        setTimeout(() => {
          useResponseButton.textContent = "📋 Usar esta resposta no despacho";
        }, 2000);
        
      } catch (error) {
        console.error("❌ [POPUP] Erro ao aplicar:", error);
        console.error("❌ [POPUP] Stack:", error.stack);
        console.error("❌ [POPUP] Error.name:", error.name);
        console.error("❌ [POPUP] Error.message:", error.message);
        
        setStatus(`❌ Erro ao aplicar resposta: ${error.message}`, true);
        
        useResponseButton.textContent = "❌ Erro - Tente novamente";
        setTimeout(() => {
          useResponseButton.textContent = "📋 Usar esta resposta no despacho";
        }, 3000);
        
      } finally {
        console.log("🔵 [POPUP] Finalizando, reabilitando botão...");
        useResponseButton.disabled = false;
        console.log("=".repeat(60));
      }
    };
  } catch (error) {
    console.error(error);
    setStatus(`❌ Erro ao gerar resposta: ${error.message}`, true);
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
    loadAvailableTabs().catch(err => {
      console.error("Erro ao carregar lista de janelas:", err);
    });
    
    // Scroll suave até a seção de resultados
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Focar no textarea para o usuário começar a digitar
    responseTextEl.focus();
    
    setStatus("✍️ Digite seu texto e clique em 'Usar esta resposta no despacho' quando estiver pronto.");
    
    useResponseButton.onclick = async () => {
      console.log("=".repeat(60));
      console.log("🟢 [MANUAL MODE] BOTÃO CLICADO!");
      console.log("=".repeat(60));
      console.log("Timestamp:", new Date().toISOString());
      console.log("Texto length:", responseTextEl.value.length);
      console.log("Texto preview:", responseTextEl.value.substring(0, 100) + "...");
      console.log("Botão disabled antes:", useResponseButton.disabled);
      console.log("=".repeat(60));
      
      useResponseButton.disabled = true;
      useResponseButton.textContent = "⏳ Aplicando...";
      setStatus("📝 Inserindo a resposta no SEI...");
      console.log("✅ Status atualizado, iniciando processamento...");

      try {
        const textToApply = responseTextEl.value.trim();
        
        if (!textToApply) {
          throw new Error("Digite algum texto antes de aplicar.");
        }
        
        console.log("🟢 [MANUAL] Chamando applyResponseToPage...");
        await applyResponseToPage(textToApply);
        
        console.log("✅ [MANUAL] Texto inserido com sucesso!");
        setStatus("✅ Texto inserido com sucesso no editor!");
        useResponseButton.textContent = "✅ Aplicado!";
        
        setTimeout(() => {
          useResponseButton.textContent = "📋 Usar esta resposta no despacho";
          useResponseButton.disabled = false;
        }, 2000);
      } catch (error) {
        console.error("❌ [MANUAL] Erro ao aplicar:", error);
        
        // Mensagem especial se for erro de janela errada
        if (error.message.includes("CKEditor não encontrado")) {
          setStatus(`❌ ${error.message}\n\n💡 DICA: Use o dropdown "🎯 Janela de Destino" para selecionar a janela do POPUP do editor!`, true);
        } else {
          setStatus(`❌ Erro ao aplicar resposta: ${error.message}`, true);
        }
        
        useResponseButton.textContent = "📋 Usar esta resposta no despacho";
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
  reloadTargetTabsButton.addEventListener("click", async () => {
    reloadTargetTabsButton.disabled = true;
    reloadTargetTabsButton.textContent = "⏳ Carregando...";
    try {
      await loadAvailableTabs();
      setStatus("✅ Lista de janelas atualizada!");
    } catch (error) {
      setStatus("❌ Erro ao carregar janelas: " + error.message, true);
    } finally {
      reloadTargetTabsButton.disabled = false;
      reloadTargetTabsButton.textContent = "🔄 Atualizar";
    }
  });
}

[dispatchText, promptExtra].forEach((element) => {
  element.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      handleGenerate();
    }
  });
});
