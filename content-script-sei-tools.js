/**
 * Content Script para SEI Extension - Botão Flutuante no CKEditor
 * Adiciona um botão flutuante na barra do CKEditor com funcionalidades avançadas
 */

// Configurações
const SEI_TOOLS_CONFIG = {
    buttonId: 'sei-extension-tools-button',
    panelId: 'sei-extension-tools-panel',
    version: '1.0.0'
};
const SEI_PRO_ARVORE_SCRIPT_ID = 'sei-pro-arvore-upload-script';

// Variáveis globais
let toolsButton = null;
let toolsPanel = null;
let isPanelVisible = false;
let seiExtensionLoaded = false;

// Funções de contagem (definidas diretamente)
let countWordsFunc = null;
let countCharactersFunc = null;
let countImagesFunc = null;

let editor = null;
let estrategiaUsada = "";
let CKEDITOR_ref = null;

let targetTextarea = null;
/**
 * Função para verificar se todas as funções estão carregadas
 */
function areAllFunctionsLoaded() {
    return countWordsFunc !== null && 
           countCharactersFunc !== null && 
           countImagesFunc !== null &&
           typeof getActiveCKEditor === 'function';
}

/**
 * Função de diagnóstico para mostrar informações sobre o ambiente
 */
function diagnosticarAmbiente() {
    // Verificar elementos DOM
    const ckeElements = document.querySelectorAll('.cke, [id*="cke_"]');
   
    const scripts = document.querySelectorAll('script[src*="ckeditor"]');
    const iframes = document.querySelectorAll('iframe');

}

/**
 * Inicializa o botão flutuante no CKEditor
 */
function initFloatingButton() {
    try {
        const topDoc = window.top.document;
        const topExists = !!topDoc;
        if (topExists && topDoc.getElementById(SEI_TOOLS_CONFIG.buttonId)) {
            return;
        }
    } catch (e) {
        if (document.getElementById(SEI_TOOLS_CONFIG.buttonId)) {
            return;
        }
    }

    createFloatingButton();
    loadSEIExtension();

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
          // Documento novo: usar o terceiro CKEditor (índice 2)
          editor = CKEDITOR_ref.instances[instanceNames[2]];
          estrategiaUsada = `Terceiro CKEditor (doc novo): ${instanceNames[2]}`;
        }
      }
    }

    // Editor detectado ou não
}

/**
 * Cria o botão flutuante
 */
function createFloatingButton() {
    const hostDoc = (function () {
        try {
            if (window.top && window.top.document && window.top.document.body) {
                return window.top.document;
            }
        } catch (err) {
        }
        return document;
    })();
    toolsButton = hostDoc.createElement('div');
    toolsButton.id = SEI_TOOLS_CONFIG.buttonId;
    toolsButton.innerHTML = `
        <div class="sei-tools-button">
            <span style="font-size: 16px;">🛠️</span>
        </div>
    `;

    toolsButton.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 150px;
        z-index: 2147483647;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 999px;
        padding: 10px 20px;
        font-size: 14px;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        box-shadow: 0 10px 30px rgba(13,110,253,0.35);
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        user-select: none;
        font-weight: 600;
    `;

    toolsButton.addEventListener('mouseenter', () => {
        toolsButton.style.transform = 'translateY(-2px)';
        toolsButton.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
    });

    toolsButton.addEventListener('mouseleave', () => {
        toolsButton.style.transform = 'translateY(0)';
        toolsButton.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
    });

    toolsButton.addEventListener('click', toggleToolsPanel);

    if (hostDoc.body) {
        hostDoc.body.appendChild(toolsButton);
    } else {
        hostDoc.addEventListener('DOMContentLoaded', () => hostDoc.body.appendChild(toolsButton), { once: true });
    }
}

/**
 * Cria o painel de ferramentas
 */
function createToolsPanel() {
    toolsPanel = document.createElement('div');
    toolsPanel.id = SEI_TOOLS_CONFIG.panelId;
    toolsPanel.innerHTML = `
        <div class="sei-tools-panel">
            <div class="tools-header">
                <h3>🛠️ SEI Tools Avançadas</h3>
                <div class="tools-header-actions">
                    <button type="button" class="credits-btn" id="open-tools-credits">Créditos</button>
                    <button class="close-btn" id="close-tools-panel">×</button>
                </div>
            </div>
            
            <div class="tools-content">
                <!-- Formatação -->
                <div class="tool-section">
                    <h4>🎨 Formatação</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn" data-format="align-left" title="Alinhar à esquerda">Esquerda</button>
                        <button class="tool-btn" data-format="align-center" title="Centralizar">Centro</button>
                        <button class="tool-btn" data-format="align-right" title="Alinhar à direita">Direita</button>
                        <button class="tool-btn" data-format="align-justify" title="Justificar">Justificar</button>
                        <button class="tool-btn" data-format="font-increase" title="Aumentar fonte">
                            A+
                        </button>
                        <button class="tool-btn" data-format="font-decrease" title="Diminuir fonte">
                            A-
                        </button>
                    </div>
                </div>

                <!-- Tabelas -->
                <div class="tool-section">
                    <h4>📊 Tabelas</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn" data-action="create-table" title="Criar tabela rápida">
                            <i class="fas fa-table"></i> Nova
                        </button>
                        <button class="tool-btn" data-table-style="zebra" title="Estilo zebra">
                            <i class="fas fa-paint-brush"></i> Zebra
                        </button>
                        <button class="tool-btn" data-table-style="bordered" title="Bordas">
                            <i class="fas fa-border-all"></i> Bordas
                        </button>
                    </div>
                </div>

                <!-- Imagens -->
                <div class="tool-section">
                    <h4>🖼️ Imagens</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn" data-action="optimize-images" title="Otimizar imagens">
                            <i class="fas fa-compress"></i> Otimizar
                        </button>
                        <button class="tool-btn" data-action="resize-images" title="Redimensionar">
                            <i class="fas fa-expand-arrows-alt"></i> Redimensionar
                        </button>
                    </div>
                </div>

                <!-- Referências -->
                <div class="tool-section">
                    <h4>🔗 Referências</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn" data-action="insert-reference" title="Inserir referência">
                            <i class="fas fa-link"></i> Referência
                        </button>
                        <button class="tool-btn" data-action="insert-footnote" title="Nota de rodapé">
                            <i class="fas fa-sticky-note"></i> Nota
                        </button>
                        <button class="tool-btn" data-action="insert-citation" title="Citação de documento">
                            <i class="fas fa-quote-left"></i> Citação
                        </button>
                        <button class="tool-btn" data-action="insert-shortlink" title="Adicionar Link Curto (TinyURL)">
                            Link Curto
                        </button>
                    </div>
                </div>

                <!-- QR Code -->
                <div class="tool-section">
                    <h4>📱 QR Code</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn" data-action="generate-qr" title="Gerar QR Code">
                            <i class="fas fa-qrcode"></i> QR Code
                        </button>
                    </div>
                </div>

                <!-- Modos -->
                <div class="tool-section">
                    <h4>🎨 Modos</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn" data-action="toggle-dark-mode" title="Modo escuro">
                            <i class="fas fa-moon"></i> Escuro
                        </button>
                        <button class="tool-btn" data-action="toggle-slim-mode" title="Modo slim">
                            <i class="fas fa-compress"></i> Slim
                        </button>
                    </div>
                </div>

                <!-- Salvamento -->
                <div class="tool-section">
                    <h4>💾 Salvamento</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn" data-action="toggle-auto-save" title="Auto save">
                            <i class="fas fa-save"></i> Auto Save
                        </button>
                        <button class="tool-btn" data-action="save-document" title="Salvar agora">
                            <i class="fas fa-download"></i> Salvar
                        </button>
                    </div>
                </div>

                <!-- Estatísticas -->
                <div class="tool-section">
                    <h4>📊 Estatísticas</h4>
                    <div class="stats-display">
                        <div class="stat-item">
                            <span class="stat-number" id="wordCount">0</span>
                            <span class="stat-label">Palavras</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number" id="charCount">0</span>
                            <span class="stat-label">Caracteres</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number" id="imageCount">0</span>
                            <span class="stat-label">Imagens</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Estilos do painel
    toolsPanel.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 999998;
        width: 350px;
        max-height: 80vh;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        overflow: hidden;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;

    // Adicionar estilos CSS
    addPanelStyles();

    // Tornar painel arrastável pela barra de título
    let draggingPanel = false;
    let startXPan = 0, startYPan = 0, startTopPan = 0, startLeftPan = 0;

    // Restaurar posição salva do painel
    try {
        const savedPanel = JSON.parse(localStorage.getItem('sei_tools_panel_pos') || 'null');
        if (savedPanel && typeof savedPanel.top === 'number' && typeof savedPanel.left === 'number') {
            toolsPanel.style.top = savedPanel.top + 'px';
            toolsPanel.style.left = savedPanel.left + 'px';
            toolsPanel.style.right = 'auto';
        }
    } catch (e) {}

    const headerEl = toolsPanel.querySelector('.tools-header');
    if (headerEl) {
        headerEl.style.cursor = 'move';
        headerEl.addEventListener('mousedown', (ev) => {
            if (ev.button !== 0) return;
            // Não iniciar arraste se clicar no botão de fechar
            const isClose = ev.target && (ev.target.id === 'close-tools-panel' || ev.target.closest && ev.target.closest('#close-tools-panel'));
            if (isClose) return;
            draggingPanel = true;
            startXPan = ev.clientX;
            startYPan = ev.clientY;
            const rect = toolsPanel.getBoundingClientRect();
            startTopPan = rect.top;
            startLeftPan = rect.left;
            toolsPanel.style.top = startTopPan + 'px';
            toolsPanel.style.left = startLeftPan + 'px';
            toolsPanel.style.right = 'auto';
            document.addEventListener('mousemove', onMovePanel);
            document.addEventListener('mouseup', onUpPanel);
        });
    }

    function onMovePanel(ev) {
        if (!draggingPanel) return;
        ev.preventDefault();
        const dx = ev.clientX - startXPan;
        const dy = ev.clientY - startYPan;
        let newTop = startTopPan + dy;
        let newLeft = startLeftPan + dx;
        const maxTop = window.innerHeight - toolsPanel.offsetHeight - 8;
        const maxLeft = window.innerWidth - toolsPanel.offsetWidth - 8;
        newTop = Math.max(8, Math.min(maxTop, newTop));
        newLeft = Math.max(8, Math.min(maxLeft, newLeft));
        toolsPanel.style.top = newTop + 'px';
        toolsPanel.style.left = newLeft + 'px';
    }

    function onUpPanel() {
        if (!draggingPanel) return;
        draggingPanel = false;
        document.removeEventListener('mousemove', onMovePanel);
        document.removeEventListener('mouseup', onUpPanel);
        try {
            const rect = toolsPanel.getBoundingClientRect();
            localStorage.setItem('sei_tools_panel_pos', JSON.stringify({ top: Math.round(rect.top), left: Math.round(rect.left) }));
        } catch (e) {}
    }

    // Adicionar ao body
    document.body.appendChild(toolsPanel);
    
    // Adicionar event listeners para todos os botões
    addEventListeners();
}

/**
 * Adiciona estilos CSS para o painel
 */
function addPanelStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .sei-tools-panel {
            background: white;
            border-radius: 12px;
            overflow: hidden;
        }

        .tools-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
        }

        .tools-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }

        .tools-header-actions {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .credits-btn {
            border: none;
            background: rgba(255,255,255,0.18);
            color: #fff;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.2s ease, transform 0.2s ease;
        }

        .credits-btn:hover {
            background: rgba(255,255,255,0.28);
            transform: translateY(-1px);
        }

        .close-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }

        .close-btn:hover {
            background: rgba(255,255,255,0.3);
        }

        .tools-content {
            padding: 20px;
            max-height: 60vh;
            overflow-y: auto;
        }

        .tool-section {
            margin-bottom: 20px;
        }

        .tool-section h4 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #333;
            font-weight: 600;
        }

        .tool-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .tool-btn {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
            min-width: auto;
            color: #495057;
        }

        .tool-btn:hover {
            background: #667eea;
            color: white;
            border-color: #667eea;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .tool-btn.sigilo-btn:hover {
            background: #dc3545;
            border-color: #dc3545;
        }

        .stats-display {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .stat-item {
            text-align: center;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 10px;
            min-width: 60px;
            flex: 1;
        }

        .stat-number {
            display: block;
            font-size: 18px;
            font-weight: bold;
            color: #667eea;
        }

        .stat-label {
            display: block;
            font-size: 10px;
            color: #6c757d;
            margin-top: 2px;
        }

        /* Scrollbar personalizada */
        .tools-content::-webkit-scrollbar {
            width: 6px;
        }

        .tools-content::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
        }

        .tools-content::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
        }

        .tools-content::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Adiciona event listeners para todos os botões do painel
 */
function addEventListeners() {
    // Botão de fechar
    const closeBtn = document.getElementById('close-tools-panel');
    if (closeBtn) {
        closeBtn.addEventListener('click', (ev) => {
            try { ev.stopPropagation(); } catch (e) {}
            closeToolsPanel();
        });
        // Evitar iniciar arraste ao clicar no X
        closeBtn.addEventListener('mousedown', (ev) => {
            try { ev.stopPropagation(); } catch (e) {}
        });
    }

    const creditsBtn = document.getElementById('open-tools-credits');
    if (creditsBtn) {
        creditsBtn.addEventListener('click', (ev) => {
            try { ev.stopPropagation(); } catch (e) {}
            try {
                if (typeof window.openCreditsHub === "function") {
                    window.openCreditsHub();
                    return;
                }
            } catch(e){}
            try {
                const targetUrl = chrome?.runtime?.getURL ? chrome.runtime.getURL("credits.html") : null;
                const win = window.open(targetUrl || "https://github.com/stefanini-sei/SEI-extension#cr%C3%A9ditos", "_blank");
                if (win) { try { win.opener = null; } catch(_err) {} }
            } catch(err) {}
        });
        creditsBtn.addEventListener('mousedown', (ev) => {
            try { ev.stopPropagation(); } catch (e) {}
        });
    }
    
    // Botões de formatação
    document.querySelectorAll('[data-format]').forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.getAttribute('data-format');
            applyFormatting(format);
        });
    });
    
    // Removido: botões de sigilo
    
    // Botões de tabela
    document.querySelectorAll('[data-table-style]').forEach(btn => {
        btn.addEventListener('click', () => {
            const style = btn.getAttribute('data-table-style');
            applyTableStyle(style);
        });
    });
    
    // Botões de ação
    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            handleAction(action);
        });
    });
}

/**
 * Manipula ações dos botões
 */
function handleAction(action) {
    switch (action) {
        case 'create-table':
            createQuickTable();
            break;
        case 'optimize-images':
            optimizeImages();
            break;
        case 'resize-images':
            resizeImages();
            break;
        case 'insert-reference':
            insertReference();
            break;
        case 'insert-footnote':
            insertFootnote();
            break;
        case 'insert-citation':
            insertCitation();
            break;
        case 'insert-shortlink':
            insertShortLink();
            break;
        case 'generate-qr':
            generateQRCode();
            break;
        case 'toggle-dark-mode':
            toggleDarkMode();
            break;
        case 'toggle-slim-mode':
            toggleSlimMode();
            break;
        case 'toggle-auto-save':
            toggleAutoSave();
            break;
        case 'save-document':
            saveDocument();
            break;
    }
}

/**
 * Alterna a visibilidade do painel
 */
function toggleToolsPanel() {
    if (!toolsPanel) {
        createToolsPanel();
    }

    if (isPanelVisible) {
        closeToolsPanel();
    } else {
        openToolsPanel();
    }
}

/**
 * Abre o painel
 */
function openToolsPanel() {
    if (toolsPanel) {
        toolsPanel.style.transform = 'translateX(0)';
        isPanelVisible = true;
        
        // Só atualizar estatísticas se as funções estiverem carregadas
        if (areAllFunctionsLoaded()) {
            updateStats();
        }
    }
}

/**
 * Fecha o painel
 */
function closeToolsPanel() {
    try {
        if (toolsPanel) {
            // Remover do DOM para encerrar completamente
            if (toolsPanel.parentNode) {
                toolsPanel.parentNode.removeChild(toolsPanel);
            } else if (typeof toolsPanel.remove === 'function') {
                toolsPanel.remove();
            }
            toolsPanel = null;
        }
    } catch (e) {}
    isPanelVisible = false;
}

/**
 * Carrega as funcionalidades da SEI Extension
 */
async function loadSEIExtension() {
    if (seiExtensionLoaded) return;
    
    try {
        // Carregar o script das funcionalidades
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('sei-extension-features.js');
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
        });
        
        seiExtensionLoaded = true;
        console.log('SEI Extension carregada com sucesso!');
    } catch (error) {
        console.error('Erro ao carregar SEI Extension:', error);
    }
}

/**
 * Verifica se o CKEditor está disponível e retorna a instância ativa
 */
function getActiveCKEditor() {
    try {
        // Detectar versão do SEI
        const isSEI_5 = document.querySelector('.infra-editor__editor-completo') !== null;
        
        // Usar a lógica melhorada para detectar o editor
        const frmEditor = isSEI_5 ? document.querySelector('.infra-editor__editor-completo') : document.querySelector('#frmEditor');
        const txaEditor = (frmEditor) ? 'div[id^=cke_txaEditor_]' : 'div#cke_txaConteudo';
        
        // Verificar se há elementos CKEditor no DOM
        const ckeElements = document.querySelectorAll('.cke, [id*="cke_"]');
        
        if (ckeElements.length === 0) {
            return null;
        }
        
        // Verificar se CKEDITOR está disponível
        let CKEDITOR_ref = null;
        let estrategiaUsada = "";

        const possiveisCKEDITORs = [
            { name: 'window.CKEDITOR', ref: () => window.CKEDITOR },
            { name: 'global CKEDITOR', ref: () => (typeof CKEDITOR !== 'undefined' ? CKEDITOR : null) },
            { name: 'window.parent.CKEDITOR', ref: () => window.parent?.CKEDITOR },
            { name: 'window.top.CKEDITOR', ref: () => window.top?.CKEDITOR },
            { name: 'self.CKEDITOR', ref: () => self?.CKEDITOR }
        ];        

        // Tentar cada estratégia
        for (let contexto of possiveisCKEDITORs) {
            try {
                const ref = contexto.ref();
                
                if (ref && ref.instances) {
                    CKEDITOR_ref = ref;
                    estrategiaUsada = contexto.name;
                    break;
                }
            } catch (e) {
                // Ignorar erros silenciosamente
            }
        }
        
        // Se não encontrou CKEditor, retornar null
        if (!CKEDITOR_ref) {
            return null;
        }
        
        // Verificar se as instâncias estão carregadas
        const instanceNames = Object.keys(CKEDITOR_ref.instances);
        
        if (instanceNames.length === 0) {
            return null;
        }
        
        // Lógica para selecionar o editor correto baseada no sei-pro-editor.js
        let selectedEditor = null;
        let idEditor = null;
        
        if (instanceNames.length > 0) {
            // Estratégia 1: Usar função baseada no setCKEDITOR_SEIPRO (evento)
            const eventResult = detectEditorByEvent();
            if (eventResult) {
                selectedEditor = eventResult.editor;
                idEditor = eventResult.idEditor;
                estrategiaUsada = eventResult.strategy;
            }
            
            // Estratégia 2: Usar função auxiliar baseada no sei-pro-editor.js
            if (!selectedEditor) {
                const ckeResult = detectEditorByCkeElement();
                if (ckeResult) {
                    selectedEditor = ckeResult.editor;
                    idEditor = ckeResult.idEditor;
                    estrategiaUsada = ckeResult.strategy;
                }
            }
            
            // Estratégia 3: Verificar se há textarea ativa
            if (!selectedEditor) {
                const activeTextarea = document.querySelector('textarea[id*="txa"]:focus');
                if (activeTextarea) {
                    const textareaName = activeTextarea.name || activeTextarea.id;
                    const editorName = instanceNames.find(name => name.includes(textareaName));
                    if (editorName) {
                        idEditor = editorName;
                        selectedEditor = CKEDITOR_ref.instances[editorName];
                        estrategiaUsada = `CKEditor via nome da textarea: ${textareaName}`;
                    }
                }
            }
            
            // Estratégia 4: Verificar se há iframe com contenteditable
            if (!selectedEditor) {
                const iframes = document.querySelectorAll('iframe[title*="txa"]');
                for (let iframe of iframes) {
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        const body = iframeDoc.querySelector('body');
                        if (body && body.getAttribute('contenteditable') === 'true') {
                            const title = iframe.getAttribute('title');
                            const editorId = title.replace('txa', '').replace('_', '');
                            if (CKEDITOR_ref.instances[editorId]) {
                                idEditor = editorId;
                                selectedEditor = CKEDITOR_ref.instances[editorId];
                                estrategiaUsada = `CKEditor via iframe contenteditable: ${editorId}`;
                                break;
                            }
                        }
                    } catch (e) {
                        // Ignorar erros de cross-origin
                    }
                }
            }
            
            // Estratégia 5: Fallback para editor _506
            if (!selectedEditor) {
                const editor506Name = instanceNames.find(name => name.includes('_506'));
                if (editor506Name) {
                    idEditor = editor506Name;
                    selectedEditor = CKEDITOR_ref.instances[editor506Name];
                    estrategiaUsada = `CKEditor _506: ${editor506Name}`;
                }
            }
            
            // Estratégia 6: Documento novo (3+ editores)
            if (!selectedEditor && instanceNames.length >= 3) {
                idEditor = instanceNames[2];
                selectedEditor = CKEDITOR_ref.instances[instanceNames[2]];
                estrategiaUsada = `Terceiro CKEditor (doc novo): ${instanceNames[2]}`;
            }
            
            // Estratégia 7: Fallback para segundo editor
            if (!selectedEditor && instanceNames.length >= 2) {
                idEditor = instanceNames[1];
                selectedEditor = CKEDITOR_ref.instances[instanceNames[1]];
                estrategiaUsada = `Segundo CKEditor: ${instanceNames[1]}`;
            }
            
            // Estratégia 8: Usar o primeiro disponível
            if (!selectedEditor) {
                idEditor = instanceNames[0];
                selectedEditor = CKEDITOR_ref.instances[instanceNames[0]];
                estrategiaUsada = `Primeiro CKEditor: ${instanceNames[0]}`;
            }
        }
        
        if (selectedEditor && idEditor) {
            // Armazenar informações globais como no sei-pro-editor.js
            editor = selectedEditor;
            window.idEditor = idEditor;
            
            // Verificar se o editor está realmente funcional
            try {
                const editorData = selectedEditor.getData();
            } catch (e) {
                return null;
            }
            
            return selectedEditor;
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao verificar CKEditor:', error);
        return null;
    }
}

/**
 * Função auxiliar para detectar editor baseada na lógica do sei-pro-editor.js
 * Simula a função setParamEditor do sei-pro-editor.js
 */
function detectEditorByCkeElement() {
    try {
        // Detectar versão do SEI
        const isSEI_5 = document.querySelector('.infra-editor__editor-completo') !== null;
        
        if (!isSEI_5) {
            // Lógica para SEI 4 - baseada no sei-pro-editor.js
            const ckeElements = document.querySelectorAll('.cke:not(.cke_disabled)');
            
            for (let ckeElement of ckeElements) {
                const ckeId = ckeElement.getAttribute('id');
                if (ckeId) {
                    const idEditor = ckeId.replace('cke_', '');
                    
                    // Verificar se a instância existe
                    if (typeof CKEDITOR !== 'undefined' && CKEDITOR.instances[idEditor]) {
                        return {
                            editor: CKEDITOR.instances[idEditor],
                            idEditor: idEditor,
                            strategy: `CKEditor via elemento .cke: ${idEditor}`
                        };
                    }
                }
            }
        } else {
            // Lógica para SEI 5
            const frmEditor = document.querySelector('.infra-editor__editor-completo');
            if (frmEditor) {
                const txaEditor = 'div[id^=cke_txaEditor_]';
                const editorElements = document.querySelectorAll(txaEditor);
                
                for (let editorElement of editorElements) {
                    const ckeId = editorElement.getAttribute('id');
                    if (ckeId) {
                        const idEditor = ckeId.replace('cke_', '');
                        
                        // Verificar se a instância existe
                        if (typeof CKEDITOR !== 'undefined' && CKEDITOR.instances[idEditor]) {
                            return {
                                editor: CKEDITOR.instances[idEditor],
                                idEditor: idEditor,
                                strategy: `CKEditor SEI 5: ${idEditor}`
                            };
                        }
                    }
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao detectar editor via elemento .cke:', error);
        return null;
    }
}

/**
 * Função baseada no setCKEDITOR_SEIPRO do sei-pro-editor.js
 * Simula o evento de foco do CKEditor
 */
function detectEditorByEvent() {
    try {
        // Detectar versão do SEI
        const isSEI_5 = document.querySelector('.infra-editor__editor-completo') !== null;
        const frmEditor = isSEI_5 ? document.querySelector('.infra-editor__editor-completo') : document.querySelector('#frmEditor');
        const txaEditor = (frmEditor) ? 'div[id^=cke_txaEditor_]' : 'div#cke_txaConteudo';
        
        // Verificar se CKEDITOR está disponível
        if (typeof CKEDITOR === 'undefined') {
            return null;
        }
        
        // Buscar por instâncias ativas
        const instanceNames = Object.keys(CKEDITOR.instances);
        
        for (let idEditor of instanceNames) {
            try {
                const oEditor = CKEDITOR.instances[idEditor];
                
                // Simular a lógica do setCKEDITOR_SEIPRO
                const iframeEditor = frmEditor ? 
                    document.querySelector(`iframe[title*="${idEditor}"]`) : 
                    document.querySelector(txaEditor);
                
                if (iframeEditor) {
                    const iframeDoc = iframeEditor.contentDocument || iframeEditor.contentWindow.document;
                    const body = iframeDoc.querySelector('body');
                    
                    // Verificar se o iframe está contenteditable
                    const isContentEditable = body && body.getAttribute('contenteditable') === 'true';
                    const isFrmEditor = frmEditor && frmEditor.length > 0;
                    
                    // Aplicar a lógica do sei-pro-editor.js
                    if (isContentEditable || !isFrmEditor) {
                        // Verificar se o editor está realmente funcional
                        try {
                            const editorData = oEditor.getData();
                            
                            return {
                                editor: oEditor,
                                idEditor: idEditor,
                                strategy: `CKEditor via evento (${idEditor})`,
                                iframeEditor: iframeEditor
                            };
                        } catch (e) {
                            continue;
                        }
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao detectar editor via evento:', error);
        return null;
    }
}

/**
 * Função para aguardar o CKEditor carregar completamente
 * Baseada na lógica do initCKEDITOR_SEIPRO do sei-pro-editor.js
 */
function waitForCKEditorComplete(maxAttempts = 20, delay = 500) {
    return new Promise((resolve) => {
        let attempts = 0;
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            // Verificar se CKEDITOR está disponível
            if (typeof CKEDITOR === 'undefined') {
                if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    resolve(null);
                }
                return;
            }
            
            // Verificar se há instâncias carregadas
            const instanceNames = Object.keys(CKEDITOR.instances);
            
            if (instanceNames.length > 0) {
                // Tentar detectar editor usando a nova lógica
                const editor = getActiveCKEditor();
                
                if (editor) {
                    clearInterval(checkInterval);
                    resolve(editor);
                }
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                resolve(null);
            }
        }, delay);
    });
}

/**
 * Tenta aguardar o CKEditor carregar com retry automático
 */
function waitForCKEditor(maxAttempts = 10, delay = 1000) {
    return new Promise((resolve) => {
        let attempts = 0;
        
        const checkInterval = setInterval(() => {
            attempts++;
            const editor = getActiveCKEditor();
            
            if (editor) {
                clearInterval(checkInterval);
                resolve(editor);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                resolve(null);
            }
        }, delay);
    });
}

/**
 * Função melhorada para obter CKEditor com retry automático
 */
async function getActiveCKEditorWithRetry() {
    const editor = getActiveCKEditor();
    
    if (editor) {
        return editor;
    }
    
    // Se não encontrou, tentar aguardar usando a nova função
    return await waitForCKEditorComplete(20, 500);
}

/**
 * Funções de formatação
 */
async function applyFormatting(type) {
    if (!seiExtensionLoaded) {
        showMessage("⚠️ Carregando ferramentas avançadas...", 'warning');
        return;
    }
    
    try {
        const ready = await ensurePageEditorReady();
        if (!ready) {
            showMessage("⚠️ CKEditor detectado mas ainda carregando... Aguarde alguns segundos e tente novamente.", 'warning');
            return;
        }
        switch (type) {
            case 'align-left':
                await sendPageCommand('setParagraphClass', { className: 'Texto_Justificado_Recuo_Primeira_Linha' });
                showMessage("✅ Estilo 'Texto_Justificado_Recuo_Primeira_Linha' aplicado!", 'success');
                break;
            case 'align-center':
                await sendPageCommand('setParagraphClass', { className: 'Texto_Centralizado' });
                showMessage("✅ Estilo 'Texto_Centralizado' aplicado!", 'success');
                break;
            case 'align-right':
                await sendPageCommand('setParagraphClass', { className: 'Texto_Alinhado_Direita' });
                showMessage("✅ Estilo 'Texto_Alinhado_Direita' aplicado!", 'success');
                break;
            case 'align-justify':
                await sendPageCommand('setParagraphClass', { className: 'Texto_Justificado' });
                showMessage("✅ Estilo 'Texto_Justificado' aplicado!", 'success');
                break;
            case 'font-increase':
                await sendPageCommand('changeFontSize', { mode: 'increase' });
                break;
            case 'font-decrease':
                await sendPageCommand('changeFontSize', { mode: 'decrease' });
                break;
            default:
                showMessage("❌ Comando não reconhecido!", 'error');
        }
    } catch (error) {
        console.error('Erro ao aplicar formatação:', error);
        showMessage("❌ Erro ao aplicar formatação!", 'error');
    }
}

/**
 * Função para alterar tamanho da fonte
 */
async function changeFontSize(action) {
    try {
        const ready = await ensurePageEditorReady();
        if (!ready) {
            showMessage("⚠️ CKEditor detectado mas ainda carregando... Aguarde e tente novamente.", 'warning');
            return;
        }
        const mode = action === 'increase' ? 'increase' : 'decrease';
        const res = await sendPageCommand('changeFontSize', { mode });
        if (res.ok) {
            showMessage(`✅ Fonte ${action === 'increase' ? 'aumentada' : 'diminuída'}!`, 'success');
        } else {
            showMessage(`❌ Erro ao alterar fonte: ${res.error || ''}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao alterar fonte:', error);
        showMessage("❌ Erro ao alterar fonte!", 'error');
    }
}

/**
 * Funções de sigilo
 */
async function applySigilo(type) {
    if (!seiExtensionLoaded) {
        showMessage("⚠️ Carregando ferramentas avançadas...", 'warning');
        return;
    }
    
    try {
        const ready = await ensurePageEditorReady();
        if (!ready) {
            showMessage("⚠️ CKEditor detectado mas ainda carregando... Aguarde e tente novamente.", 'warning');
            return;
        }
        const text = prompt("Digite o texto para marcar com sigilo (deixe vazio para texto selecionado):");
        if (text !== null) {
            const res = await sendPageCommand('addSigiloMark', { mode: type, text });
            if (res.ok) {
                showMessage(`✅ Marca de sigilo "${type}" aplicada!`, 'success');
            } else {
                showMessage(`❌ Erro ao aplicar sigilo: ${res.error || ''}`, 'error');
            }
        }
    } catch (error) {
        console.error('Erro ao aplicar sigilo:', error);
        showMessage("❌ Erro ao aplicar sigilo!", 'error');
    }
}

/**
 * Funções de tabela
 */
function createQuickTable() {
    if (!seiExtensionLoaded) {
        showMessage("⚠️ Carregando ferramentas avançadas...", 'warning');
        return;
    }
    
    try {
        const rows = prompt("Número de linhas:", "3");
        const cols = prompt("Número de colunas:", "3");
        if (rows && cols) {
            const res = sendPageCommand('createQuickTable', { rows: parseInt(rows), cols: parseInt(cols) });
            Promise.resolve(res).then(r => {
                if (r && r.ok) {
                    showMessage("✅ Tabela criada com sucesso!", 'success');
                } else {
                    showMessage(`❌ Erro ao criar tabela: ${(r && r.error) || ''}`, 'error');
                }
            });
        }
    } catch (error) {
        console.error('Erro ao criar tabela:', error);
        showMessage("❌ Erro ao criar tabela!", 'error');
    }
}

function applyTableStyle(style) {
    if (!seiExtensionLoaded) {
        showMessage("⚠️ Carregando ferramentas avançadas...", 'warning');
        return;
    }
    
    try {
        const res = sendPageCommand('applyTableStyle', { style });
        Promise.resolve(res).then(r => {
            if (r && r.ok) {
                showMessage(`✅ Estilo "${style}" aplicado à tabela!`, 'success');
            } else {
                showMessage(`❌ Erro ao aplicar estilo: ${(r && r.error) || ''}`, 'error');
            }
        });
    } catch (error) {
        console.error('Erro ao aplicar estilo de tabela:', error);
        showMessage("❌ Erro ao aplicar estilo!", 'error');
    }
}

/**
 * Funções de imagem
 */
function optimizeImages() {
    if (!seiExtensionLoaded) {
        showMessage("⚠️ Carregando ferramentas avançadas...", 'warning');
        return;
    }
    
    try {
        const quality = prompt("Qualidade das imagens (0-100):", "60");
        if (quality) {
            const res = sendPageCommand('optimizeImageQuality', { quality: parseInt(quality) });
            Promise.resolve(res).then(r => {
                if (r && r.ok) {
                    showMessage("✅ Imagens otimizadas!", 'success');
                } else {
                    showMessage(`❌ Erro ao otimizar imagens: ${(r && r.error) || ''}`, 'error');
                }
            });
        }
    } catch (error) {
        console.error('Erro ao otimizar imagens:', error);
        showMessage("❌ Erro ao otimizar imagens!", 'error');
    }
}

function resizeImages() {
    if (!seiExtensionLoaded) {
        showMessage("⚠️ Carregando ferramentas avançadas...", 'warning');
        return;
    }
    
    try {
        const maxWidth = prompt("Largura máxima (px):", "600");
        const maxHeight = prompt("Altura máxima (px):", "400");
        if (maxWidth && maxHeight) {
            const res = sendPageCommand('resizeImages', { maxWidth: parseInt(maxWidth), maxHeight: parseInt(maxHeight) });
            Promise.resolve(res).then(r => {
                if (r && r.ok) {
                    showMessage("✅ Imagens redimensionadas!", 'success');
                } else {
                    showMessage(`❌ Erro ao redimensionar imagens: ${(r && r.error) || ''}`, 'error');
                }
            });
        }
    } catch (error) {
        console.error('Erro ao redimensionar imagens:', error);
        showMessage("❌ Erro ao redimensionar imagens!", 'error');
    }
}

/**
 * Funções de referência
 */
function insertReference() {
    if (!seiExtensionLoaded) {
        showMessage("⚠️ Carregando ferramentas avançadas...", 'warning');
        return;
    }
    
    try {
        const text = prompt("Texto da referência:");
        const target = prompt("ID do elemento alvo:");
        if (text && target) {
            const res = sendPageCommand('insertInternalReference', { text, target });
            Promise.resolve(res).then(r => {
                if (r && r.ok) {
                    showMessage("✅ Referência inserida!", 'success');
                } else {
                    showMessage(`❌ Erro ao inserir referência: ${(r && r.error) || ''}`, 'error');
                }
            });
        }
    } catch (error) {
        console.error('Erro ao inserir referência:', error);
        showMessage("❌ Erro ao inserir referência!", 'error');
    }
}

function insertFootnote() {
    if (!seiExtensionLoaded) {
        showMessage("⚠️ Carregando ferramentas avançadas...", 'warning');
        return;
    }
    
    try {
        const text = prompt("Texto da nota de rodapé:");
        if (text) {
            const res = sendPageCommand('insertFootnote', { text });
            Promise.resolve(res).then(r => {
                if (r && r.ok) {
                    showMessage("✅ Nota de rodapé inserida!", 'success');
                } else {
                    showMessage(`❌ Erro ao inserir nota de rodapé: ${(r && r.error) || ''}`, 'error');
                }
            });
        }
    } catch (error) {
        console.error('Erro ao inserir nota de rodapé:', error);
        showMessage("❌ Erro ao inserir nota de rodapé!", 'error');
    }
}

function insertCitation() {
    if (!seiExtensionLoaded) {
        showMessage("⚠️ Carregando ferramentas avançadas...", 'warning');
        return;
    }
    
    try {
        const protocol = prompt("Número do protocolo:");
        const title = prompt("Título do documento:");
        if (protocol && title) {
            const res = sendPageCommand('insertDocumentCitation', { protocol, title });
            Promise.resolve(res).then(r => {
                if (r && r.ok) {
                    showMessage("✅ Citação inserida!", 'success');
                } else {
                    showMessage(`❌ Erro ao inserir citação: ${(r && r.error) || ''}`, 'error');
                }
            });
        }
    } catch (error) {
        console.error('Erro ao inserir citação:', error);
        showMessage("❌ Erro ao inserir citação!", 'error');
    }
}

/**
 * Função de QR Code
 */
function generateQRCode() {
    if (!seiExtensionLoaded) {
        showMessage("⚠️ Carregando ferramentas avançadas...", 'warning');
        return;
    }
    
    try {
        const url = prompt("URL para gerar QR Code:");
        const size = prompt("Tamanho (px):", "150");
        if (url) {
            const qrSize = parseInt(size) || 150;
            const res = sendPageCommand('generateQRCode', { url, size: qrSize });
            Promise.resolve(res).then(r => {
                if (r && r.ok) {
                    showMessage("✅ QR Code gerado!", 'success');
                } else {
                    showMessage(`❌ Erro ao gerar QR Code: ${(r && r.error) || ''}`, 'error');
                }
            });
        }
    } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        showMessage("❌ Erro ao gerar QR Code!", 'error');
    }
}

/**
 * Short link (TinyURL)
 */
async function insertShortLink() {
    if (!seiExtensionLoaded) {
        showMessage("⚠️ Carregando ferramentas avançadas...", 'warning');
        return;
    }
    try {
        const url = prompt("Cole o link longo (URL):");
        if (!url) return;
        const alias = prompt("Nome personalizado (opcional) – apenas letras, números ou travessões:");
        let token = null;
        let saveToken = false;
        if (alias && alias.trim()) {
            token = prompt("Token da API TinyURL (opcional para alias). Deseja salvar para uso futuro?");
            if (token && token.trim()) {
                const wantSave = confirm("Salvar token do TinyURL para usos futuros?");
                saveToken = !!wantSave;
            }
        }
        const res = await sendPageCommand('createShortLink', { url, alias, token, saveToken });
        if (res && res.ok) {
            showMessage("✅ Link curto inserido!", 'success');
        } else {
            showMessage(`❌ Erro ao criar link curto: ${(res && res.error) || ''}`, 'error');
        }
    } catch (e) {
        console.error('Erro ao inserir link curto:', e);
        showMessage("❌ Erro ao inserir link curto!", 'error');
    }
}

/**
 * Funções de modo
 */
function toggleDarkMode() {
    if (!seiExtensionLoaded) {
        showMessage("⚠️ Carregando ferramentas avançadas...", 'warning');
        return;
    }
    
    try {
        const enabled = confirm("Ativar modo escuro?");
        const res = sendPageCommand('toggleDarkMode', { enabled });
        Promise.resolve(res).then(r => {
            if (r && r.ok) {
                showMessage(`✅ Modo escuro ${enabled ? 'ativado' : 'desativado'}!`, 'success');
            } else {
                showMessage(`❌ Erro ao alternar modo escuro: ${(r && r.error) || ''}`, 'error');
            }
        });
    } catch (error) {
        console.error('Erro ao alternar modo escuro:', error);
        showMessage("❌ Erro ao alternar modo escuro!", 'error');
    }
}

function toggleSlimMode() {
    if (!seiExtensionLoaded) {
        showMessage("⚠️ Carregando ferramentas avançadas...", 'warning');
        return;
    }
    
    try {
        const enabled = confirm("Ativar modo slim?");
        const res = sendPageCommand('toggleSlimMode', { enabled });
        Promise.resolve(res).then(r => {
            if (r && r.ok) {
                showMessage(`✅ Modo slim ${enabled ? 'ativado' : 'desativado'}!`, 'success');
            } else {
                showMessage(`❌ Erro ao alternar modo slim: ${(r && r.error) || ''}`, 'error');
            }
        });
    } catch (error) {
        console.error('Erro ao alternar modo slim:', error);
        showMessage("❌ Erro ao alternar modo slim!", 'error');
    }
}

/**
 * Funções de salvamento
 */
function toggleAutoSave() {
    if (!seiExtensionLoaded) {
        showMessage("⚠️ Carregando ferramentas avançadas...", 'warning');
        return;
    }
    
    try {
        const enabled = confirm("Ativar salvamento automático?");
        const interval = enabled ? prompt("Intervalo em minutos:", "5") : 5;
        const res = sendPageCommand('toggleAutoSave', { enabled, interval: parseInt(interval) });
        Promise.resolve(res).then(r => {
            if (r && r.ok) {
                showMessage(`✅ Auto save ${enabled ? 'ativado' : 'desativado'}!`, 'success');
            } else {
                showMessage(`❌ Erro ao configurar auto save: ${(r && r.error) || ''}`, 'error');
            }
        });
    } catch (error) {
        console.error('Erro ao configurar auto save:', error);
        showMessage("❌ Erro ao configurar auto save!", 'error');
    }
}

function saveDocument() {
    if (!seiExtensionLoaded) {
        showMessage("⚠️ Carregando ferramentas avançadas...", 'warning');
        return;
    }
    
    try {
        const res = sendPageCommand('saveDocument', {});
        Promise.resolve(res).then(r => {
            if (r && r.ok) {
                showMessage("✅ Documento salvo!", 'success');
            } else {
                showMessage(`❌ Erro ao salvar documento: ${(r && r.error) || ''}`, 'error');
            }
        });
    } catch (error) {
        console.error('Erro ao salvar documento:', error);
        showMessage("❌ Erro ao salvar documento!", 'error');
    }
}

/**
 * Aplica comandos no editor ativo
 */
function applyToActiveEditor(command) {
    const editor = getActiveCKEditor();
    
    if (editor) {
        editor.execCommand(command);
        showMessage(`✅ Comando "${command}" aplicado!`, 'success');
    } else {
        // Verificar se há elementos CKEditor no DOM
        const ckeElements = document.querySelectorAll('.cke, [id*="cke_"]');
        if (ckeElements.length > 0) {
            showMessage("⚠️ CKEditor detectado mas ainda carregando... Aguarde alguns segundos e tente novamente.", 'warning');
        } else {
            showMessage("❌ CKEditor não encontrado! Certifique-se de estar em uma página com editor de texto.", 'error');
        }
    }
}

/**
 * Conta palavras no editor ativo
 */
countWordsFunc = function() {
    try {
        if (window.SEIExtension && window.SEIExtension.countWords) {
            return window.SEIExtension.countWords();
        }
        return 0;
    } catch (error) {
        console.error('Erro ao contar palavras:', error);
        return 0;
    }
};

/**
 * Conta caracteres no editor ativo
 */
countCharactersFunc = function() {
    try {
        if (window.SEIExtension && window.SEIExtension.countCharacters) {
            return window.SEIExtension.countCharacters();
        }
        return 0;
    } catch (error) {
        console.error('Erro ao contar caracteres:', error);
        return 0;
    }
};

/**
 * Conta imagens no editor ativo
 */
countImagesFunc = function() {
    try {
        const editor = getActiveCKEditor();
        
        if (editor && editor.getData) {
            const content = editor.getData();
            const imgMatches = content.match(/<img[^>]*>/gi);
            return imgMatches ? imgMatches.length : 0;
        }
        return 0;
    } catch (error) {
        console.error('Erro ao contar imagens:', error);
        return 0;
    }
};

/**
 * Atualiza estatísticas
 */
function updateStats() {
    if (!seiExtensionLoaded) return;
    
    try {
        // Verificar se as funções de contagem estão disponíveis
        if (countWordsFunc === null || countCharactersFunc === null || countImagesFunc === null) {
            return;
        }
        
        // Verificar se os elementos do painel existem
        const wordCountEl = document.getElementById('wordCount');
        const charCountEl = document.getElementById('charCount');
        const imageCountEl = document.getElementById('imageCount');
        
        if (!wordCountEl || !charCountEl || !imageCountEl) {
            return;
        }
        
        const wordCount = countWordsFunc();
        const charCount = countCharactersFunc();
        const imageCount = countImagesFunc();
        
        wordCountEl.textContent = wordCount || 0;
        charCountEl.textContent = charCount || 0;
        imageCountEl.textContent = imageCount || 0;
    } catch (error) {
        console.error('Erro ao atualizar estatísticas:', error);
    }
}

/**
 * Mostra mensagem de feedback
 */
function showMessage(message, type = 'info') {
    // Remover mensagem anterior se existir
    const existingMessage = document.getElementById('sei-tools-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageEl = document.createElement('div');
    messageEl.id = 'sei-tools-message';
    messageEl.textContent = message;
    
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000000;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideDown 0.3s ease;
    `;

    // Adicionar animação CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(messageEl);

    // Remover após 3 segundos
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.remove();
        }
    }, 3000);
}

/**
 * Fecha o painel ao clicar fora
 */
document.addEventListener('click', (event) => {
    if (isPanelVisible && toolsPanel && !toolsPanel.contains(event.target) && !toolsButton.contains(event.target)) {
        closeToolsPanel();
    }
});

/**
 * Fecha o painel com ESC
 */
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isPanelVisible) {
        closeToolsPanel();
    }
});

// Inicializar quando a página carregar

// Múltiplas tentativas de inicialização
function tryInit() {
    
    // Executar diagnóstico
    diagnosticarAmbiente();
    
    injectSeiProArvoreScript();

    initFloatingButton();
}

// Tentar imediatamente
tryInit();

// Tentar após DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
} else {
    setTimeout(tryInit, 100);
}

// Tentar após 2 segundos (para páginas que carregam dinamicamente)
setTimeout(tryInit, 2000);

// Tentar após 5 segundos (fallback)
setTimeout(tryInit, 5000);

function injectSeiProArvoreScript() {
    try {
        if (document.getElementById(SEI_PRO_ARVORE_SCRIPT_ID)) {
            return;
        }
        const root = document.documentElement;
        if (root) {
            if (!root.hasAttribute('data-sei-pro-dropzone-src')) {
                try {
                    const dropSrc = chrome.runtime.getURL('lib/dropzone.min.js');
                    root.setAttribute('data-sei-pro-dropzone-src', dropSrc);
                } catch (dropErr) {}
            }
            if (root.getAttribute('data-sei-pro-arvore-injected') === '1') {
                return;
            }
            root.setAttribute('data-sei-pro-arvore-injected', '1');
        }

        chrome.runtime.sendMessage({ action: 'injectSeiProArvore' }, (response) => {
            if (chrome.runtime.lastError) {
                try { root && root.removeAttribute('data-sei-pro-arvore-injected'); } catch (e) {}
                console.warn('Falha ao solicitar injeção do SEI Pro Árvore:', chrome.runtime.lastError.message);
                return;
            }
            if (!response || response.success !== true) {
                try { root && root.removeAttribute('data-sei-pro-arvore-injected'); } catch (e) {}
                console.warn('Retorno inesperado ao injetar SEI Pro Árvore:', response && response.error);
            }
        });
    } catch (err) {
    }
}

// Função para aguardar todas as funções carregarem
function waitForAllFunctions() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (areAllFunctionsLoaded()) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
        
        // Timeout após 10 segundos
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
        }, 10000);
    });
}

// Aguardar funções carregarem e depois iniciar o intervalo de estatísticas
waitForAllFunctions().then(() => {
    // Atualizar estatísticas a cada 5 segundos
    setInterval(updateStats, 5000);
});

/**
 * Garante (via script de página) que o editor esteja pronto
 */
async function ensurePageEditorReady(maxAttempts = 10, delayMs = 300) {
    try {
        // Comunicação via eventos (isolated world)
        const requestId = 'req_' + Date.now() + '_' + Math.random().toString(16).slice(2);
        return await new Promise((resolve) => {
            const handler = (ev) => {
                const detail = ev && ev.detail ? ev.detail : {};
                if (detail.requestId !== requestId) return;
                document.removeEventListener('SEI_EXTENSION:ensureEditorReady:result', handler);
                const res = detail.res;
                resolve(!!(res && res.ready));
            };
            document.addEventListener('SEI_EXTENSION:ensureEditorReady:result', handler, { once: true });
            const event = new CustomEvent('SEI_EXTENSION:ensureEditorReady', { detail: { requestId, maxAttempts, delayMs }, bubbles: true });
            document.dispatchEvent(event);
            // Timeout de segurança
            setTimeout(() => {
                try { document.removeEventListener('SEI_EXTENSION:ensureEditorReady:result', handler); } catch (e) {}
                resolve(false);
            }, (maxAttempts * delayMs) + 1500);
        });
    } catch (e) {
        return false;
    }
}

/**
 * Envia comando simples ao MAIN world (sei-extension-features)
 */
async function sendPageCommand(action, args = {}) {
    return await new Promise((resolve) => {
        const requestId = 'cmd_' + Date.now() + '_' + Math.random().toString(16).slice(2);
        const handler = (ev) => {
            const detail = ev && ev.detail ? ev.detail : {};
            if (detail.requestId !== requestId) return;
            document.removeEventListener('SEI_EXTENSION:command:result', handler);
            resolve({ ok: !!detail.ok, error: detail.error || null });
        };
        document.addEventListener('SEI_EXTENSION:command:result', handler, { once: true });
        const event = new CustomEvent('SEI_EXTENSION:command', { detail: { requestId, action, args }, bubbles: true });
        document.dispatchEvent(event);
        // Timeout de segurança
        setTimeout(() => {
            try { document.removeEventListener('SEI_EXTENSION:command:result', handler); } catch (e) {}
            resolve({ ok: false, error: 'timeout' });
        }, 5000);
    });
}

// Estratégia adicional: aguardar eventos do CKEditor
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        getActiveCKEditor();
    }, 3000);
});

// Aguardar eventos de carregamento
window.addEventListener('load', () => {
    setTimeout(() => {
        getActiveCKEditor();
    }, 2000);
});
