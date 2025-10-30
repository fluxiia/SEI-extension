/**
 * SEI Extension - Funcionalidades Avançadas
 * Baseado no sei-pro-editor.js
 * Versão: 1.0.0
 */

// Configurações globais
const SEI_EXTENSION_CONFIG = {
    version: '1.0.0',
    autoSaveInterval: 5, // minutos
    imageQuality: 60,
    darkMode: false,
    slimMode: false
};

// Variáveis globais
let seiEditor = null;
let autoSaveTimer = null;
let isAutoSaveEnabled = false;

/**
 * ========================================
 * FUNCIONALIDADES DE FORMATAÇÃO DE TEXTO
 * ========================================
 */

/**
 * Aplica alinhamento de texto
 * @param {string} mode - 'left', 'center', 'right', 'justify'
 */
function setTextAlignment(mode) {
    if (!seiEditor) return;
    
    const commands = {
        'left': 'justifyleft',
        'center': 'justifycenter', 
        'right': 'justifyright',
        'justify': 'justifyblock'
    };
    
    if (commands[mode]) {
        seiEditor.execCommand(commands[mode]);
    }
}

/**
 * Altera tamanho da fonte
 * @param {string} mode - 'increase' ou 'decrease'
 */
function changeFontSize(mode) {
    if (!seiEditor) return;
    try {
        // Usa estilos relativos para evitar dependência de plugins de fontSize
        const relative = mode === 'increase' ? 'larger' : 'smaller';
        const style = new CKEDITOR.style({ element: 'span', styles: { 'font-size': relative } });
        seiEditor.applyStyle(style);
    } catch (e) {
        // Fallback: tenta comando do plugin se existir
        try {
            const val = mode === 'increase' ? '14' : '12';
            seiEditor.execCommand('fontSize', { value: val });
        } catch (e2) {
            // silencioso
        }
    }
}

/**
 * Converte primeira letra para maiúscula
 */
function convertFirstLetter() {
    if (!seiEditor) return;
    
    const selection = seiEditor.getSelection();
    const text = selection.getSelectedText();
    
    if (text) {
        const newText = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        seiEditor.insertText(newText);
    }
}

/**
 * ========================================
 * FUNCIONALIDADES DE SIGILO
 * ========================================
 */

/**
 * Adiciona marca de sigilo ao texto selecionado
 * @param {string} mode - 'mark', 'tarja', 'box'
 * @param {string} text - Texto opcional para busca
 */
function addSigiloMark(mode, text = '') {
    if (!seiEditor) return;
    
    const sigiloStyles = {
        'mark': 'background-color: #ffeb3b; padding: 2px 4px; border-radius: 3px;',
        'tarja': 'background-color: #f44336; color: white; padding: 2px 8px; font-weight: bold;',
        'box': 'border: 2px solid #ff9800; padding: 4px; background-color: #fff3e0;'
    };
    
    const targetText = text || seiEditor.getSelection().getSelectedText();
    if (targetText) {
        const styledText = `<span style="${sigiloStyles[mode]}">${targetText}</span>`;
        seiEditor.insertHtml(styledText);
    }
}

/**
 * ========================================
 * FUNCIONALIDADES DE TABELA
 * ========================================
 */

/**
 * Cria tabela rápida com configurações predefinidas
 * @param {number} rows - Número de linhas
 * @param {number} cols - Número de colunas
 */
function createQuickTable(rows = 3, cols = 3) {
    if (!seiEditor) return;
    ensureTableStylesInjected();
    let tableHtml = '<table border="1" style="border-collapse: collapse; width: 100%;">';
    
    for (let i = 0; i < rows; i++) {
        tableHtml += '<tr>';
        for (let j = 0; j < cols; j++) {
            tableHtml += '<td style="padding: 8px; border: 1px solid #ccc;">&nbsp;</td>';
        }
        tableHtml += '</tr>';
    }
    
    tableHtml += '</table>';
    
    seiEditor.insertHtml(tableHtml);
}

/**
 * Aplica estilo à tabela selecionada
 * @param {string} style - Nome do estilo
 */
function applyTableStyle(style) {
    if (!seiEditor) return;
    ensureTableStylesInjected();
    const styles = {
        'zebra': 'zebra-table',
        'bordered': 'bordered-table',
        'striped': 'striped-table',
        'hover': 'hover-table'
    };
    const className = styles[style];
    if (!className) return;

    try {
        const selection = seiEditor.getSelection();
        if (!selection) return;
        const startEl = selection.getStartElement();
        if (!startEl) return;
        // Encontrar a tabela ancestral mais próxima
        const tableEl = startEl.getAscendant('table', true);
        if (!tableEl) return;

        tableEl.addClass(className);
    } catch (e) { }
}

/**
 * ========================================
 * FUNCIONALIDADES DE IMAGEM
 * ========================================
 */

/**
 * Otimiza qualidade de imagens
 * @param {number} quality - Qualidade (0-100)
 */
function optimizeImageQuality(quality = 60) {
    if (!seiEditor) return;
    
    const content = seiEditor.getData();
    const optimizedContent = content.replace(/<img([^>]*)>/gi, (match, attrs) => {
        if (!attrs.includes('data-quality')) {
            return `<img${attrs} data-quality="${quality}">`;
        }
        return match;
    });
    seiEditor.setData(optimizedContent);
}

/**
 * Redimensiona imagens para tamanho padrão
 * @param {number} maxWidth - Largura máxima
 * @param {number} maxHeight - Altura máxima
 */
function resizeImages(maxWidth = 600, maxHeight = 400) {
    if (!seiEditor) return;
    
    const content = seiEditor.getData();
    const resizedContent = content.replace(/<img([^>]*)>/gi, (match, attrs) => {
        const styleMatch = attrs.match(/style="([^"]*)"/);
        let style = styleMatch ? styleMatch[1] : '';
        
        if (!style.includes('max-width')) {
            style += ` max-width: ${maxWidth}px; max-height: ${maxHeight}px;`;
        }
        
        if (styleMatch) {
            return match.replace(/style="[^"]*"/, `style="${style}"`);
        } else {
            return match.replace('>', ` style="${style}">`);
        }
    });
    seiEditor.setData(resizedContent);
}

/**
 * ========================================
 * FUNCIONALIDADES DE SALVAMENTO AUTOMÁTICO
 * ========================================
 */

/**
 * Ativa/desativa salvamento automático
 * @param {boolean} enabled - Se deve ativar
 * @param {number} interval - Intervalo em minutos
 */
function toggleAutoSave(enabled, interval = 5) {
    isAutoSaveEnabled = enabled;
    
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
    }
    
    if (enabled && seiEditor) {
        autoSaveTimer = setInterval(() => {
            saveDocument();
        }, interval * 60 * 1000);
    }
}

/**
 * Salva o documento atual
 */
function saveDocument() {
    if (!seiEditor) return;
    
    const content = seiEditor.getData();
    localStorage.setItem('sei_autosave_' + Date.now(), content);
    
    // Remove salvamentos antigos (mantém apenas os últimos 5)
    const keys = Object.keys(localStorage).filter(key => key.startsWith('sei_autosave_'));
    if (keys.length > 5) {
        keys.sort().slice(0, -5).forEach(key => localStorage.removeItem(key));
    }
    
    console.log('Documento salvo automaticamente');
}

/**
 * ========================================
 * FUNCIONALIDADES DE REFERÊNCIAS
 * ========================================
 */

/**
 * Insere referência interna
 * @param {string} text - Texto da referência
 * @param {string} target - ID do elemento alvo
 */
function insertInternalReference(text, target) {
    if (!seiEditor) return;
    
    const refId = 'ref_' + Date.now();
    const refHtml = `<a href="#${target}" id="${refId}" class="internal-ref" style="color: #1976d2; text-decoration: underline;">${text}</a>`;
    
    seiEditor.insertHtml(refHtml);
}

/**
 * Insere nota de rodapé
 * @param {string} text - Texto da nota
 */
function insertFootnote(text) {
    if (!seiEditor) return;
    
    const noteId = 'note_' + Date.now();
    const footnoteHtml = `<sup><a href="#${noteId}" class="footnote-ref" style="color: #1976d2;">[${noteId}]</a></sup>`;
    const noteHtml = `<div id="${noteId}" class="footnote" style="margin-top: 10px; padding-left: 20px; border-left: 2px solid #e0e0e0;">${text}</div>`;
    
    seiEditor.insertHtml(footnoteHtml + noteHtml);
}

/**
 * ========================================
 * FUNCIONALIDADES DE CITAÇÃO
 * ========================================
 */

/**
 * Insere citação de documento
 * @param {string} protocolo - Número do protocolo
 * @param {string} titulo - Título do documento
 */
function insertDocumentCitation(protocolo, titulo) {
    if (!seiEditor) return;
    
    const citationHtml = `
        <div class="document-citation" style="border-left: 4px solid #1976d2; padding: 10px; margin: 10px 0; background-color: #f5f5f5;">
            <strong>Protocolo:</strong> ${protocolo}<br>
            <strong>Título:</strong> ${titulo}
        </div>
    `;
    
    seiEditor.insertHtml(citationHtml);
}

/**
 * ========================================
 * FUNCIONALIDADES DE QR CODE
 * ========================================
 */

/**
 * Gera QR Code para URL
 * @param {string} url - URL para gerar QR Code
 * @param {number} size - Tamanho do QR Code
 */
function generateQRCode(url, size = 150) {
    if (!seiEditor) return;
    
    // Usa API pública para gerar QR Code
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
    
    const qrHtml = `
        <div class="qr-code" style="text-align: center; margin: 10px 0;">
            <img src="${qrUrl}" alt="QR Code" style="max-width: ${size}px; height: auto;">
            <br><small>QR Code: ${url}</small>
        </div>
    `;
    
    seiEditor.insertHtml(qrHtml);
}
/**
 * TinyURL: cria link curto
 */
async function generateShortLink(url, alias, token) {
    if (!url) throw new Error('URL inválida');
    // Se token não informado, tentar armazenado
    if ((!token || !token.trim()) && alias && alias.trim()) {
        try { token = localStorage.getItem('tinyurl_token') || token; } catch (e) {}
    }
    // Com token: API oficial (suporta alias)
    if (token && token.trim()) {
        const resp = await fetch('https://api.tinyurl.com/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token.trim()
            },
            body: JSON.stringify({ url: url, domain: 'tinyurl.com', alias: alias || undefined })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            const msg = (data && data.errors && data.errors[0] && data.errors[0].message) || data.message || resp.statusText;
            throw new Error(msg || 'Falha ao criar link curto');
        }
        const tiny = data && data.data && (data.data.tiny_url || data.data.tinyUrl || data.data.tinyurl);
        if (!tiny) throw new Error('Resposta inválida do TinyURL');
        return tiny;
    }
    // Sem token: endpoint público (sem alias)
    const resp = await fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url), { method: 'GET' });
    const text = await resp.text();
    if (!resp.ok || !/^https?:\/\//i.test(text)) {
        throw new Error('Falha ao criar link curto (modo público)');
    }
    return text.trim();
}

async function insertShortLinkIntoEditor(url, alias, token, saveToken) {
    if (!seiEditor) throw new Error('Editor não disponível');
    if (saveToken && token && token.trim()) {
        try { localStorage.setItem('tinyurl_token', token.trim()); } catch (e) {}
    }
    const shortUrl = await generateShortLink(url, alias, token);
    const safeUrl = shortUrl.replace(/"/g, '&quot;');
    const anchor = `<a href="${safeUrl}" target="_blank">${safeUrl}</a>`;
    seiEditor.insertHtml(anchor);
}

/**
 * ========================================
 * FUNCIONALIDADES DE DARK MODE
 * ========================================
 */

/**
 * Ativa/desativa modo escuro
 * @param {boolean} enabled - Se deve ativar
 */
function toggleDarkMode(enabled) {
    SEI_EXTENSION_CONFIG.darkMode = enabled;
    
    if (enabled) {
        document.body.classList.add('sei-dark-mode');
        document.body.style.backgroundColor = '#1e1e1e';
        document.body.style.color = '#ffffff';
    } else {
        document.body.classList.remove('sei-dark-mode');
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
    }
    
    localStorage.setItem('sei_dark_mode', enabled);
}

/**
 * ========================================
 * FUNCIONALIDADES DE MODO SLIM
 * ========================================
 */

/**
 * Ativa/desativa modo slim (interface simplificada)
 * @param {boolean} enabled - Se deve ativar
 */
function toggleSlimMode(enabled) {
    SEI_EXTENSION_CONFIG.slimMode = enabled;
    
    if (enabled) {
        document.body.classList.add('sei-slim-mode');
        // Oculta elementos desnecessários
        const elementsToHide = document.querySelectorAll('.infra-toolbar, .infra-menu, .infra-sidebar');
        elementsToHide.forEach(el => el.style.display = 'none');
    } else {
        document.body.classList.remove('sei-slim-mode');
        const elementsToShow = document.querySelectorAll('.infra-toolbar, .infra-menu, .infra-sidebar');
        elementsToShow.forEach(el => el.style.display = '');
    }
    
    localStorage.setItem('sei_slim_mode', enabled);
}

/**
 * ========================================
 * FUNCIONALIDADES DE IMPORT/EXPORT
 * ========================================
 */

/**
 * Exporta documento para HTML
 * @returns {string} HTML do documento
 */
function exportToHTML() {
    if (!seiEditor) return '';
    return seiEditor.getData();
}

/**
 * Importa documento de arquivo
 * @param {File} file - Arquivo para importar
 */
function importDocument(file) {
    if (!seiEditor) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        seiEditor.setData(e.target.result);
    };
    reader.readAsText(file);
}

/**
 * ========================================
 * FUNCIONALIDADES DE UTILITÁRIOS
 * ========================================
 */

/**
 * Conta palavras do documento
 * @returns {number} Número de palavras
 */
function countWords() {
    if (!seiEditor) return 0;
    
    const content = seiEditor.getData();
    const textContent = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
    const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
    
    return words.length;
}

/**
 * Conta caracteres do documento
 * @returns {number} Número de caracteres
 */
function countCharacters() {
    if (!seiEditor) return 0;
    
    const content = seiEditor.getData();
    const textContent = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
    
    return textContent.length;
}

/**
 * Busca e substitui texto
 * @param {string} find - Texto a buscar
 * @param {string} replace - Texto substituto
 * @param {boolean} caseSensitive - Se deve considerar maiúsculas/minúsculas
 */
function findAndReplace(find, replace, caseSensitive = false) {
    if (!seiEditor) return;
    
    const content = seiEditor.getData();
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const newContent = content.replace(regex, replace);
    
    seiEditor.setData(newContent);
}

/**
 * ========================================
 * INICIALIZAÇÃO
 * ========================================
 */

/**
 * Inicializa a extensão SEI
 * @param {Object} editor - Instância do editor CKEditor
 */
function initSEIExtension(editor) {
    seiEditor = editor;
    
    // Carrega configurações salvas
    const savedDarkMode = localStorage.getItem('sei_dark_mode') === 'true';
    const savedSlimMode = localStorage.getItem('sei_slim_mode') === 'true';
    const savedAutoSave = localStorage.getItem('sei_autosave') === 'true';
    
    if (savedDarkMode) toggleDarkMode(true);
    if (savedSlimMode) toggleSlimMode(true);
    if (savedAutoSave) toggleAutoSave(true);
    
    console.log('SEI Extension inicializada com sucesso!');
}

/**
 * Injeta estilos CSS para classes de tabela, se ainda não injetados
 */
function ensureTableStylesInjected() {
    try {
        const styleId = 'sei-extension-table-styles';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .zebra-table tr:nth-child(odd) { background: #ffffff; }
            .zebra-table tr:nth-child(even) { background: #f7f7f7; }
            .bordered-table { border-collapse: collapse; width: 100%; }
            .bordered-table td, .bordered-table th { border: 1px solid #cccccc; padding: 6px; }
            .hover-table tr:hover { background: #eef3ff; }
        `;
        document.head.appendChild(style);
    } catch (e) { }
}

/**
 * Tenta detectar a instância ativa do CKEditor na PÁGINA (MAIN world)
 * e inicializa a SEI Extension com ela.
 * @returns {{id:string, strategy:string}|null}
 */
function detectActiveEditor() {
    try {
        if (typeof CKEDITOR === 'undefined' || !CKEDITOR.instances) {
            return null;
        }

        const instanceNames = Object.keys(CKEDITOR.instances);
        if (instanceNames.length === 0) {
            return null;
        }

        let selectedId = null;
        let strategy = '';

        // 1) Se houver textarea em foco, tentar casar com o nome da instância
        const activeTextarea = document.querySelector('textarea[id*="txa"]:focus, textarea[name*="txa"]:focus');
        if (activeTextarea) {
            const textareaName = activeTextarea.name || activeTextarea.id;
            const matchName = instanceNames.find((n) => n.includes(textareaName));
            if (matchName) {
                selectedId = matchName;
                strategy = `textarea focada: ${textareaName}`;
            }
        }

        // 2) Preferir instância com _506 (processo existente)
        if (!selectedId) {
            const with506 = instanceNames.find((n) => n.includes('_506'));
            if (with506) {
                selectedId = with506;
                strategy = '_506';
            }
        }

        // 3) Documento novo: usar a terceira instância, se existir
        if (!selectedId && instanceNames.length >= 3) {
            selectedId = instanceNames[2];
            strategy = 'terceiro editor (doc novo)';
        }

        // 4) Fallback: segunda instância
        if (!selectedId && instanceNames.length >= 2) {
            selectedId = instanceNames[1];
            strategy = 'segundo editor';
        }

        // 5) Último fallback: primeira instância
        if (!selectedId) {
            selectedId = instanceNames[0];
            strategy = 'primeiro editor';
        }

        const editor = CKEDITOR.instances[selectedId];
        if (editor) {
            // Verifica se está operacional
            try {
                editor.getData();
            } catch (e) {
                return null;
            }

            // Inicializa e mantém referência
            initSEIExtension(editor);
            return { id: selectedId, strategy };
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Garante que exista um editor pronto; faz algumas tentativas rápidas.
 * @param {number} maxAttempts
 * @param {number} delayMs
 * @returns {Promise<{ready:boolean, id?:string, strategy?:string}>}
 */
function ensureEditorReady(maxAttempts = 10, delayMs = 300) {
    return new Promise((resolve) => {
        let attempts = 0;

        const tryDetect = () => {
            attempts++;

            if (seiEditor) {
                resolve({ ready: true, id: seiEditor.name || seiEditor.id, strategy: 'já inicializado' });
                return;
            }

            const res = detectActiveEditor();
            if (res && seiEditor) {
                resolve({ ready: true, id: res.id, strategy: res.strategy });
                return;
            }

            if (attempts >= maxAttempts) {
                resolve({ ready: false });
                return;
            }

            setTimeout(tryDetect, delayMs);
        };

        tryDetect();
    });
}

/**
 * Remove classes de alinhamento SEI conhecidas do(s) parágrafo(s) selecionado(s)
 */
function clearAlignmentClasses() {
    if (!seiEditor) return;
    try {
        const classes = [
            'Texto_Justificado',
            'Texto_Justificado_Recuo_Primeira_Linha',
            'Texto_Centralizado',
            'Texto_Alinhado_Direita'
        ];
        const selection = seiEditor.getSelection();
        const ranges = selection ? selection.getRanges() : [];
        if (!ranges || ranges.length === 0) return;
        ranges.forEach(range => {
            const walker = new CKEDITOR.dom.walker(range);
            walker.evaluator = (node) => node.type === CKEDITOR.NODE_ELEMENT && node.getName() === 'p';
            let node;
            while ((node = walker.next())) {
                classes.forEach(c => node.removeClass(c));
            }
        });
    } catch (e) { }
}

/**
 * Aplica classe de parágrafo (estilos SEI) ao(s) parágrafo(s) selecionado(s)
 */
function setParagraphClass(className) {
    if (!seiEditor) return;
    try {
        clearAlignmentClasses();
        const style = new CKEDITOR.style({ element: 'p', attributes: { 'class': className } });
        seiEditor.applyStyle(style);
    } catch (e) { }
}

// Exporta funções para uso global
window.SEIExtension = {
    init: initSEIExtension,
    // Detecção/estado do editor
    detectActiveEditor,
    ensureEditorReady,
    setTextAlignment,
    setParagraphClass,
    changeFontSize,
    convertFirstLetter,
    addSigiloMark,
    createQuickTable,
    applyTableStyle,
    optimizeImageQuality,
    resizeImages,
    toggleAutoSave,
    saveDocument,
    insertInternalReference,
    insertFootnote,
    insertDocumentCitation,
    generateQRCode,
    toggleDarkMode,
    toggleSlimMode,
    exportToHTML,
    importDocument,
    countWords,
    countCharacters,
    findAndReplace
};

/**
 * Ponte de comunicação com content script via eventos customizados
 */
(function setupEventBridge(){
    try {
        // ensureEditorReady
        document.addEventListener('SEI_EXTENSION:ensureEditorReady', async (ev) => {
            const detail = ev && ev.detail ? ev.detail : {};
            const requestId = detail.requestId;
            const maxAttempts = detail.maxAttempts || 10;
            const delayMs = detail.delayMs || 300;
            const res = await ensureEditorReady(maxAttempts, delayMs);
            const resultEvent = new CustomEvent('SEI_EXTENSION:ensureEditorReady:result', { detail: { requestId, res }, bubbles: true });
            document.dispatchEvent(resultEvent);
        }, false);

        // Comando genérico simples (ex.: setTextAlignment, changeFontSize)
        document.addEventListener('SEI_EXTENSION:command', async (ev) => {
            const detail = ev && ev.detail ? ev.detail : {};
            const { requestId, action, args } = detail;
            let ok = false, error = null;
            try {
                // Garante editor pronto antes
                const ready = await ensureEditorReady(10, 200);
                if (!ready || !ready.ready) throw new Error('Editor não está pronto');

                switch(action) {
                    case 'setTextAlignment':
                        setTextAlignment(args && args.mode);
                        ok = true;
                        break;
                    case 'setParagraphClass':
                        setParagraphClass(args && args.className);
                        ok = true;
                        break;
                    case 'changeFontSize':
                        changeFontSize(args && args.mode);
                        ok = true;
                        break;
                    case 'addSigiloMark':
                        addSigiloMark(args && args.mode, args && args.text);
                        ok = true;
                        break;
                    case 'createQuickTable':
                        createQuickTable(args && args.rows, args && args.cols);
                        ok = true;
                        break;
                    case 'applyTableStyle':
                        applyTableStyle(args && args.style);
                        ok = true;
                        break;
                    case 'optimizeImageQuality':
                        optimizeImageQuality(args && args.quality);
                        ok = true;
                        break;
                    case 'resizeImages':
                        resizeImages(args && args.maxWidth, args && args.maxHeight);
                        ok = true;
                        break;
                    case 'insertInternalReference':
                        insertInternalReference(args && args.text, args && args.target);
                        ok = true;
                        break;
                    case 'insertFootnote':
                        insertFootnote(args && args.text);
                        ok = true;
                        break;
                    case 'insertDocumentCitation':
                        insertDocumentCitation(args && args.protocol, args && args.title);
                        ok = true;
                        break;
                    case 'generateQRCode':
                        generateQRCode(args && args.url, args && args.size);
                        ok = true;
                        break;
                    case 'toggleDarkMode':
                        toggleDarkMode(!!(args && args.enabled));
                        ok = true;
                        break;
                    case 'toggleSlimMode':
                        toggleSlimMode(!!(args && args.enabled));
                        ok = true;
                        break;
                    case 'toggleAutoSave':
                        toggleAutoSave(!!(args && args.enabled), args && args.interval);
                        ok = true;
                        break;
                    case 'saveDocument':
                        saveDocument();
                        ok = true;
                        break;
                    case 'createShortLink':
                        await insertShortLinkIntoEditor(args && args.url, args && args.alias, args && args.token, !!(args && args.saveToken));
                        ok = true;
                        break;
                    default:
                        throw new Error('Ação não suportada: ' + action);
                }
            } catch (e) {
                error = e && e.message ? e.message : String(e);
            }
            const resultEvent = new CustomEvent('SEI_EXTENSION:command:result', { detail: { requestId, ok, error }, bubbles: true });
            document.dispatchEvent(resultEvent);
        }, false);
    } catch (e) {
        // silencioso
    }
})();
