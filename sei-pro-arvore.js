/**
 * ============================================================================
 * SEI PRO - Módulo de Upload para Árvore de Documentos
 * ============================================================================
 * 
 * Este módulo implementa um fluxo robusto e modular para upload de arquivos
 * no sistema SEI, seguindo a sequência de chamadas HTTP do sistema.
 * 
 * ============================================================================
 * FLUXO COMPLETO DE UPLOAD (Sequência de URLs)
 * ============================================================================
 * 
 * ETAPA 1: Escolher Tipo de Documento
 * ────────────────────────────────────────────────────────────────────────
 * URL: controlador.php?acao=documento_escolher_tipo
 *      &acao_origem=arvore_visualizar
 *      &acao_retorno=arvore_visualizar
 *      &id_procedimento={ID_PROC}
 *      &arvore=1
 * 
 * Objetivo: Apresentar opções de tipo de documento (séries) disponíveis
 * Método: GET
 * Resposta: HTML com formulário #frmDocumentoEscolherTipo ou #frmDocumentoCadastro
 * 
 * ────────────────────────────────────────────────────────────────────────
 * ETAPA 2: Obter Formulário de Recebimento (primeira chamada)
 * ────────────────────────────────────────────────────────────────────────
 * URL: controlador.php?acao=documento_receber
 *      &acao_origem=documento_escolher_tipo
 *      &acao_retorno=documento_escolher_tipo
 *      &id_procedimento={ID_PROC}
 *      &id_serie=-1
 *      &arvore=1
 * 
 * Objetivo: Obter formulário inicial para recebimento de documento
 * Método: GET ou POST (dependendo da série selecionada)
 * Resposta: HTML com formulário #frmDocumentoCadastro e #frmAnexos
 * 
 * ────────────────────────────────────────────────────────────────────────
 * ETAPA 3: Preparar Documento (segunda chamada documento_receber)
 * ────────────────────────────────────────────────────────────────────────
 * URL: controlador.php?acao=documento_receber
 *      &acao_origem=documento_receber
 *      &arvore=1
 *      &id_procedimento={ID_PROC}
 *      &id_serie=-1
 * 
 * Objetivo: Enviar dados iniciais do documento e obter formulário preparado
 * Método: POST
 * Dados: hdnIdSerie, hdnFlagDocumentoCadastro=1, etc.
 * Resposta: HTML com formulário pronto e UPLOAD_IDENTIFIER
 * 
 * ────────────────────────────────────────────────────────────────────────
 * ETAPA 4: Upload do Arquivo Anexo
 * ────────────────────────────────────────────────────────────────────────
 * URL: controlador.php?acao=documento_upload_anexo
 * 
 * Objetivo: Fazer upload físico do arquivo
 * Método: POST (multipart/form-data)
 * Dados: filArquivo=<arquivo>, UPLOAD_IDENTIFIER=<id>
 * Resposta: String no formato "id#nome#hash#tamanho#data"
 *           Exemplo: "773417#documento.pdf#abc123#1024000#01/01/2024 10:00"
 * 
 * ────────────────────────────────────────────────────────────────────────
 * ETAPA 5: Salvar Documento (terceira chamada documento_receber)
 * ────────────────────────────────────────────────────────────────────────
 * URL: controlador.php?acao=documento_receber
 *      &acao_origem=documento_receber
 *      &arvore=1
 *      &id_procedimento={ID_PROC}
 *      &id_serie=-1
 * 
 * Objetivo: Salvar documento com arquivo anexo na base de dados
 * Método: POST
 * Dados: hdnAnexos (codificado), hdnFlagDocumentoCadastro=2, todos os dados do formulário
 * Resposta: Redirecionamento para arvore_visualizar (sucesso)
 * 
 * ────────────────────────────────────────────────────────────────────────
 * ETAPA 6: Atualizar Árvore de Documentos
 * ────────────────────────────────────────────────────────────────────────
 * URL: controlador.php?acao=arvore_visualizar
 *      &acao_origem=documento_receber
 *      &acao_retorno=documento_escolher_tipo
 *      &id_procedimento={ID_PROC}
 *      &id_documento={ID_DOC}
 *      &atualizar_arvore=1
 *      &arvore=1
 * 
 * Objetivo: Atualizar árvore de documentos com novo documento
 * Método: GET (redirecionamento automático)
 * Resposta: HTML com árvore atualizada
 * 
 * ────────────────────────────────────────────────────────────────────────
 * ETAPA 7: Visualizar Procedimento (opcional)
 * ────────────────────────────────────────────────────────────────────────
 * URL: controlador.php?acao=procedimento_visualizar
 *      &acao_origem=arvore_visualizar
 *      &id_procedimento={ID_PROC}
 *      &id_documento={ID_DOC}
 * 
 * Objetivo: Visualizar procedimento atualizado
 * Método: GET
 * Resposta: HTML da página de visualização
 * 
 * ────────────────────────────────────────────────────────────────────────
 * ETAPA 8: Confirmação de Duplicado (se necessário)
 * ────────────────────────────────────────────────────────────────────────
 * URL: controlador_ajax.php?acao_ajax=documento_recebido_duplicado
 *      &id_documento={ID_DOC}
 * 
 * Objetivo: Confirmar processamento de documento duplicado
 * Método: GET (Ajax)
 * Resposta: JSON ou texto confirmando processamento
 * 
 * ────────────────────────────────────────────────────────────────────────
 * ETAPA 9: Download/Verificação do Anexo (opcional - não implementado aqui)
 * ────────────────────────────────────────────────────────────────────────
 * URL: controlador.php?acao=documento_download_anexo
 *      &acao_origem=procedimento_visualizar
 *      &id_anexo={ID_ANEXO}
 *      &arvore=1
 * 
 * Objetivo: Download ou verificação do arquivo anexado
 * Método: GET
 * Resposta: Arquivo binário
 * 
 * ============================================================================
 * ARQUITETURA DO CÓDIGO
 * ============================================================================
 * 
 * - UploadFlowManager: Orquestrador principal que gerencia todas as etapas
 * - Funções auxiliares: Parsing HTML, validação, encoding, etc.
 * - Handlers Dropzone: Integração com biblioteca Dropzone.js
 * - Interface UI: Botão flutuante e modal de fallback
 * 
 * ============================================================================
 */
(function(){
  'use strict';
  
  // ========================================
  // CONSTANTES E CONFIGURAÇÕES
  // ========================================
  var UPLOAD_BUTTON_ID = "btnUploadArvoreFloating";
  var DROPZONE_READY_FLAG = "__sei_pro_dropzone_ready__";
  var FALLBACK_MODAL_ID = "sei-pro-arvore-modal";
  var FALLBACK_STYLE_ID = "sei-pro-arvore-modal-style";
  var BOOT_DONE = false;
  var SVG_ICON_MARKUP = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 6v14"/><polyline points="10 12 16 6 22 12"/><rect x="8" y="22" width="16" height="4" fill="#ffffff"/></svg>';
  var FLOATING_CONTAINER_ID = "sei-pro-floating-actions";
  var KNOWN_FLOATING_BUTTONS = [
    { id: "sei-despacho-ia-floating-button", shape: "pill" },
    { id: "sei-extension-tools-button", shape: "round" },
    { id: "sei-pro-tools-floating-button", shape: "pill" },
    { id: "sei-pro-config-floating-button", shape: "pill" }
  ];
  var UPLOAD_ICON_DATA_URI = "data:image/svg+xml," + encodeURIComponent(SVG_ICON_MARKUP);
  var MANUAL_UPLOAD_TRIGGER_FLAG = "__seiProManualTrigger";
  var SAVE_HISTORY_LIMIT = 5;

  // let ckeElements = null;
  let iframes = null;

  // ========================================
  // FUNÇÕES AUXILIARES (devem ser definidas antes do UploadFlowManager)
  // ========================================
  
  var $ = window.jQuery || window.$;
  
  /**
   * Faz parsing de HTML string para Document object
   */
  function parseHTMLDocument(html, baseHref){
    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, 'text/html');
      if (baseHref) {
        var baseEl = doc.querySelector('base') || doc.createElement('base');
        baseEl.setAttribute('href', baseHref);
        if (!baseEl.parentNode && doc.head) {
          doc.head.insertBefore(baseEl, doc.head.firstChild || null);
        }
      }
      return doc;
    } catch(e){
      var tmp = document.implementation.createHTMLDocument('tmp');
      if (baseHref) {
        var baseElTmp = tmp.createElement('base');
        baseElTmp.setAttribute('href', baseHref);
        tmp.head.insertBefore(baseElTmp, tmp.head.firstChild || null);
      }
      tmp.documentElement.innerHTML = html;
      return tmp;
    }
  }
  
  /**
   * Normaliza link para URL absoluta
   */
  function normalizeLink(href, baseHref){
    try {
      if (!href) return href;
      var base = baseHref || (document.baseURI || window.location.href);
      var parsed = new URL(href, base);
      return parsed.toString();
    } catch(e){
      return href;
    }
  }
  
  /**
   * Garante que URL use HTTPS
   */
  function ensureHttps(url, baseHref){
    var normalized = normalizeLink(url, baseHref);
    try {
      if (!normalized) return normalized;
      var loc = window.location;
      var parsed = new URL(normalized);
      if (loc && loc.protocol === 'https:' && parsed.protocol === 'http:') {
        parsed.protocol = 'https:';
        if (parsed.port === '80') parsed.port = '';
        return parsed.toString();
      }
      return normalized;
    } catch(e){
      return normalized;
    }
  }
  
  /**
   * Requisição HTTP com suporte a HTTPS
   */
  function requestHTMLWithHttps(url, opts){
    return new Promise(function(resolve, reject){
      var $ = window.jQuery || window.$;
      if (!$) {
        console.error('[SEIPro] jQuery não disponível!');
        reject(new Error('jQuery não está disponível'));
        return;
      }
      
      var target = ensureHttps(url);
      
      $.ajax(Object.assign({
        url: target,
        type: 'GET',
        dataType: 'text',
        success: function(data, textStatus, jqXHR){
          if (typeof data === 'string' && data.trim().length) {
            resolve(data);
            return;
          }
          // Fallback síncrono se necessário
          try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', target, false);
            xhr.send(null);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.responseText || '');
            } else {
              reject(new Error('status ' + xhr.status));
            }
          } catch(err) {
            reject(err);
          }
        },
        error: function(jqXHR, textStatus, errorThrown){
          console.error('[SEIPro] Erro HTTP:', jqXHR ? jqXHR.status : 'sem status', errorThrown);
          reject(errorThrown || textStatus);
        }
      }, opts || {}));
    });
  }
  
  /**
   * Obtém primeiro href de um seletor
   */
  function getFirstHref(doc, selector){
    try {
      var el = doc.querySelector(selector);
      if (el && el.getAttribute) return el.getAttribute('href');
    } catch(e){}
    return null;
  }
  
  /**
   * Registra snapshot HTML para debug
   */
  function recordHtmlSnapshot(label, html, meta){
    if (typeof html === 'undefined' || html === null) {
      return;
    }
    try {
      var store = window.__seiProHtmlSnapshots = window.__seiProHtmlSnapshots || [];
      var htmlContent = (typeof html === 'string') ? html : String(html);
      var timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
      var safeLabel = (label || 'snapshot').toString().replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
      var filename = safeLabel + '-' + timestamp + '.html';
      var entry = {
        label: label,
        timestamp: timestamp,
        filename: filename,
        meta: meta || null,
        size: htmlContent.length
      };
      if (window.Blob && window.URL && typeof window.URL.createObjectURL === 'function') {
        try {
          var blob = new Blob([htmlContent], { type: 'text/html; charset=ISO-8859-1' });
          entry.url = URL.createObjectURL(blob);
          entry.revoke = function(){
            try { URL.revokeObjectURL(entry.url); } catch(err){}
          };
        } catch(errBlob){
          console.warn('[SEIPro] Não foi possível gerar Blob para snapshot', errBlob);
        }
      }
      if (entry.url) {
        console.info('[SEIPro][snapshot]', label, filename, entry.url);
      } else {
        console.info('[SEIPro][snapshot]', label, filename, 'armazenado (download indisponível)');
      }
      entry.html = htmlContent;
      store.push(entry);
      var maxSnapshots = 12;
      while (store.length > maxSnapshots) {
        var oldEntry = store.shift();
        if (oldEntry && typeof oldEntry.revoke === 'function') oldEntry.revoke();
      }
    } catch(e){
      console.warn('[SEIPro] Falha ao armazenar snapshot', e);
    }
  }
  
  /**
   * Coleta valores de formulário
   */
  function collectFormValues($form){
    var collected = {};
    if (!$form || !$form.length) return collected;
    $form.find('input').each(function(){
      var $input = $(this);
      var name = $input.attr('name') || $input.attr('id');
      if (!name) return;
      var type = ($input.attr('type') || '').toLowerCase();
      if (type === 'radio' || type === 'checkbox') {
        if ($input.is(':checked')) collected[name] = $input.val();
      } else {
        collected[name] = $input.val();
      }
    });
    $form.find('select').each(function(){
      var $select = $(this);
      var name = $select.attr('name') || $select.attr('id');
      if (!name) return;
      collected[name] = $select.val();
    });
    $form.find('textarea').each(function(){
      var $textarea = $(this);
      var name = $textarea.attr('name') || $textarea.attr('id');
      if (!name) return;
      collected[name] = $textarea.val();
    });
    return collected;
  }
  
  /**
   * Gera identificador único NUMÉRICO para upload
   */
  function generateUploadIdentifier(){
    // Timestamp + números aleatórios (total 12 dígitos)
    var timestamp = Date.now().toString(); // Ex: 1699900000000 (13 dígitos)
    var random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0'); // 6 dígitos
    // Pegar últimos 6 do timestamp + 6 aleatórios = 12 dígitos numéricos
    return timestamp.slice(-6) + random;
  }
  
  /**
   * Resolve UPLOAD_IDENTIFIER do formulário ou iframe
   * O identificador DEVE existir no HTML do SEI - nunca gerar aleatoriamente
   */
  function resolveUploadIdentifier($context, rawHtml, baseHref){
    return new Promise(function(resolve, reject){
      try {
        console.log('[SEIPro] Procurando UPLOAD_IDENTIFIER no HTML...');
        
        // 1. Tentar extrair direto do formulário via jQuery
        var uploadIdentifierInput = $context.find('input[name="UPLOAD_IDENTIFIER"]');
        if (uploadIdentifierInput && uploadIdentifierInput.length) {
          var directValue = uploadIdentifierInput.attr('value') || uploadIdentifierInput.val() || '';
          if (directValue && directValue.trim()) {
            console.log('[SEIPro] ✓ UPLOAD_IDENTIFIER encontrado no formulário:', directValue);
            resolve({ value: directValue.trim(), source: 'form' });
            return;
          }
        }
        
        // 2. Tentar via regex no HTML bruto
        var regex = /name=["']UPLOAD_IDENTIFIER["'][^>]*value=["']([^"']+)/i;
        var match = regex.exec(rawHtml);
        if (match && match[1] && match[1].trim()) {
          console.log('[SEIPro] ✓ UPLOAD_IDENTIFIER encontrado via regex:', match[1]);
          resolve({ value: match[1].trim(), source: 'html-regex' });
          return;
        }
        
        // 3. Tentar buscar no iframe #ifrfrmAnexos
        var iframe = $context.find('iframe#ifrfrmAnexos, iframe[name="ifrfrmAnexos"]');
        var iframeSrc = iframe.attr('src') || iframe.attr('data-src') || (iframe.data ? iframe.data('src') : null);
        
        if (!iframeSrc) {
          console.error('[SEIPro] ✗ UPLOAD_IDENTIFIER NÃO ENCONTRADO e sem iframe para buscar!');
          reject(new Error('UPLOAD_IDENTIFIER não encontrado no formulário'));
          return;
        }
        
        var finalUrl = ensureHttps(iframeSrc, baseHref);
        console.log('[SEIPro] Buscando UPLOAD_IDENTIFIER no iframe:', finalUrl);
        
        requestHTMLWithHttps(finalUrl).then(function(iframeHtml){
          recordHtmlSnapshot('documento_receber-iframe', iframeHtml, { step: 'resolveUploadIdentifier', url: finalUrl });
          
          var $iframeDoc = $(iframeHtml);
          var iframeInput = $iframeDoc.find('input[name="UPLOAD_IDENTIFIER"]');
          var iframeValue = (iframeInput && iframeInput.length) 
            ? (iframeInput.attr('value') || iframeInput.val() || '') 
            : '';
          
          if (!iframeValue) {
            var iframeMatch = /name=["']UPLOAD_IDENTIFIER["'][^>]*value=["']([^"']+)/i.exec(iframeHtml);
            iframeValue = iframeMatch && iframeMatch[1] ? iframeMatch[1] : '';
          }
          
          if (iframeValue && iframeValue.trim()) {
            console.log('[SEIPro] ✓ UPLOAD_IDENTIFIER encontrado no iframe:', iframeValue);
            resolve({ value: iframeValue.trim(), source: 'iframe', iframeUrl: finalUrl });
            return;
          }
          
          console.error('[SEIPro] ✗ UPLOAD_IDENTIFIER NÃO ENCONTRADO no iframe!');
          reject(new Error('UPLOAD_IDENTIFIER não encontrado no iframe'));
        }).catch(function(err){
          console.error('[SEIPro] ✗ Erro ao carregar iframe:', err);
          reject(new Error('Falha ao buscar UPLOAD_IDENTIFIER no iframe: ' + err.message));
        });
      } catch(e){
        console.error('[SEIPro] ✗ Exceção ao resolver UPLOAD_IDENTIFIER:', e);
        reject(e);
      }
    });
  }
  
  /**
   * Função queueFallback
   */
  function queueFallback(files){
    if (!files) return;
    files.__sei_diagnostics__ = 'O processo não expôs os endpoints necessários (documento_receber). Utilize a área nativa do SEI para anexar.';
    try { console.warn('[SEIPro] Fallback acionado:', files.__sei_diagnostics__); } catch(e){}
  }
  
  /**
   * Escape para componentes de URL
   */
  function escapeComponentCompat(value) {
    if (value === null || typeof value === 'undefined') return '';
    try {
      var str = value.toString();
      try {
        str = decodeURIComponent(str);
      } catch(e){}
      return encodeURIComponent(str).replace(/%20/g, '+');
    } catch(err) {
      return value;
    }
  }
  
  /**
   * Escape para RegExp
   */
  function escapeRegExp(str){
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Extrai erros do HTML de resposta
   */
  function extractSaveErrors(html){
    var errors = [];
    if (!html) return errors;
    try {
      var doc = parseHTMLDocument(typeof html === 'string' ? html : String(html), window.location.href);
      var selectors = ['.infraBarraMensagem', '.infraMensagemErro', '.infraMensagemAviso', '.infraMensagemAlerta'];
      selectors.forEach(function(sel){
        var nodes = doc.querySelectorAll(sel);
        nodes.forEach(function(node){
          var txt = node.textContent ? node.textContent.trim() : '';
          if (txt) errors.push(txt);
        });
      });
      var scripts = html.match(/alert\(['"]([^'"]+)['"]\)/g);
      if (scripts) {
        scripts.forEach(function(match){
          var msg = match.replace(/^alert\(['"]/, '').replace(/['"]\)$/, '');
          if (msg) errors.push(msg);
        });
      }
      if (errors.length === 0) {
        var missingRequired = doc.querySelectorAll('.infraLabelObrigatorio, label.infraLabelObrigatorio');
        missingRequired.forEach(function(label){
          if (label.textContent) {
            errors.push('Campo possivelmente obrigatório sem preenchimento: ' + label.textContent.replace(/\*/g, '').trim());
          }
        });
      }
    } catch(e) {
      console.warn('[SEIPro] Falha ao extrair mensagens do save', e);
    }
    return errors.filter(function(value, index, self){ return value && self.indexOf(value) === index; });
  }
  
  /**
   * Extrai URL de documento duplicado
   */
  function extractDuplicadoUrl(html, baseHref) {
    if (!html) return null;
    try {
      var doc = parseHTMLDocument(html, baseHref);
      var selectorLink = doc.querySelector('a[href*="acao_ajax=documento_recebido_duplicado"]');
      if (selectorLink && selectorLink.getAttribute) {
        var directHref = selectorLink.getAttribute('href');
        if (directHref) return ensureHttps(directHref, baseHref);
      }
      var scripts = doc.querySelectorAll('script');
      for (var i = 0; i < scripts.length; i++) {
        var text = scripts[i].textContent || scripts[i].innerText || '';
        if (!text) continue;
        var matchScript = text.match(/controlador_ajax\.php\?[^"'\s]*acao_ajax=documento_recebido_duplicado[^"'\s]*/i);
        if (matchScript && matchScript[0]) {
          return ensureHttps(matchScript[0].replace(/&amp;/g, '&'), baseHref);
        }
      }
    } catch(e) {
      console.warn('[SEIPro] Falha ao analisar HTML em busca do documento_recebido_duplicado', e);
    }
    var matchHtml = html.match(/controlador_ajax\.php\?[^"'<>\s]*acao_ajax=documento_recebido_duplicado[^"'<>\s]*/i);
    if (matchHtml && matchHtml[0]) {
      return ensureHttps(matchHtml[0].replace(/&amp;/g, '&'), baseHref);
    }
    return null;
  }
  
  /**
   * Sumariza payload para logs
   */
  function summarizePayload(paramForm){
    var summary = {};
    if (!paramForm) return summary;
    var params;
    if (typeof paramForm === 'string') {
      params = new URLSearchParams(paramForm);
      summary._rawType = 'string';
    } else if (paramForm && typeof paramForm === 'object') {
      summary._rawType = 'object';
      params = new URLSearchParams();
      Object.keys(paramForm).forEach(function(key){
        params.append(key, paramForm[key]);
      });
    } else {
      summary._rawType = typeof paramForm;
      return summary;
    }
    ['hdnIdSerie','selSerie','txtDataElaboracao','txtNumero','rdoFormato','rdoNivelAcesso','hdnIdHipoteseLegal','hdnAnexos'].forEach(function(key){
      if (params.has(key)) {
        summary[key] = params.get(key);
      }
    });
    summary.payloadLength = typeof paramForm === 'string' ? paramForm.length : undefined;
    return summary;
  }
  
  /**
   * Log de passos do fluxo
   */
  function logStep(step, data){
    try {
      if (data && typeof data === 'object') {
        console.info('[SEIPro][flow]', step, JSON.parse(JSON.stringify(data)));
      } else {
        console.info('[SEIPro][flow]', step, data || '');
      }
    } catch(e){
      console.warn('[SEIPro] Erro no logStep:', e);
      console.info('[SEIPro][flow]', step, '(erro ao serializar dados)');
    }
  }

  // ========================================
  // MÓDULO 1: GERENCIAMENTO DO FLUXO DE UPLOAD
  // ========================================
  
  /**
   * Orquestrador principal do fluxo de upload
   * Coordena todas as etapas do processo
   */
  var UploadFlowManager = {
    /**
     * ETAPA 1: Escolher tipo de documento
     * URL: controlador.php?acao=documento_escolher_tipo
     */
    executarEtapa1_EscolherTipo: function(url, arquivos, dropzoneInstance, container) {
      logStep('ETAPA-1:documento_escolher_tipo', { url: url, numArquivos: arquivos ? arquivos.length : 0 });
      
      return requestHTMLWithHttps(url)
        .then(function(html) {
          logStep('ETAPA-1:html_recebido', { tamanho: html ? html.length : 0 });
          recordHtmlSnapshot('etapa1-escolher-tipo', html, { step: 'escolher_tipo', url: url });
          
          var doc = parseHTMLDocument(html, url);
          var $html = $(doc);
          var hasCadastro = $html.find('#frmDocumentoCadastro').length > 0;
          var hasEscolherForm = $html.find('#frmDocumentoEscolherTipo').length > 0;
          
          logStep('ETAPA-1:analise', { hasCadastro: hasCadastro, hasEscolherForm: hasEscolherForm });
          
          if (hasCadastro) {
            return UploadFlowManager.executarEtapa3_PrepararDocumento(html, arquivos, dropzoneInstance, container);
          }
          
          if (hasEscolherForm) {
            return UploadFlowManager.executarEtapa2_ObterFormulario($html, arquivos, dropzoneInstance, container);
          }
          
          var linkReceber = ensureHttps(getFirstHref(doc, 'a[href*="controlador.php?acao=documento_receber"]'), url);
          if (linkReceber) {
            return UploadFlowManager.executarEtapa2_ObterFormulario(linkReceber, arquivos, dropzoneInstance, container);
          }
          
          console.warn('[SEIPro] ETAPA 1: Não foi possível determinar próxima etapa');
          queueFallback(arquivos);
        })
        .catch(function(err) {
          console.error('[SEIPro] ETAPA 1: Erro:', err);
          queueFallback(arquivos);
        });
    },
    
    /**
     * ETAPA 2: Obter formulário de recebimento
     * URL: controlador.php?acao=documento_receber (GET ou POST)
     */
    executarEtapa2_ObterFormulario: function(htmlOuUrl, arquivos, dropzoneInstance, container) {
      logStep('ETAPA-2:documento_receber', { tipo: typeof htmlOuUrl === 'string' && htmlOuUrl.indexOf('http') === 0 ? 'GET' : 'POST' });
      
      // Se recebeu URL, fazer GET
      if (typeof htmlOuUrl === 'string' && htmlOuUrl.indexOf('http') === 0) {
        return requestHTMLWithHttps(htmlOuUrl).then(function(html) {
          recordHtmlSnapshot('etapa2-receber-get', html, { step: 'documento_receber_get', url: htmlOuUrl });
          return UploadFlowManager.executarEtapa3_PrepararDocumento(html, arquivos, dropzoneInstance, container);
        });
      }
      
      // Se recebeu jQuery object, fazer POST
      var $html = htmlOuUrl;
      var urlForm = $html.find('#frmDocumentoEscolherTipo').attr('action');
      var param = {};
      
      $html.find('#frmDocumentoEscolherTipo input[type=hidden]').each(function() {
        var $input = $(this);
        if ($input.attr('name') && $input.attr('id').indexOf('hdn') !== -1) {
          param[$input.attr('name')] = $input.val();
        }
      });
      
      // Aplicar série selecionada se houver
      var forcedSerie = window.__seiProSelectedSerieValue;
      if (forcedSerie) {
        param.hdnIdSerie = forcedSerie;
        param.selSerie = forcedSerie;
      }
      param.hdnIdSerie = param.hdnIdSerie || -1;
      
      return $.ajax({
        method: 'POST',
        data: param,
        url: urlForm,
        contentType: 'application/x-www-form-urlencoded; charset=ISO-8859-1'
      }).then(function(html) {
        recordHtmlSnapshot('etapa2-receber-post', html, { step: 'documento_receber_post', url: urlForm });
        window.__seiProSelectedSerieValue = null;
        return UploadFlowManager.executarEtapa3_PrepararDocumento(html, arquivos, dropzoneInstance, container);
      }).fail(function(err) {
        console.error('[SEIPro] ETAPA 2 falhou:', err);
        window.__seiProSelectedSerieValue = null;
        queueFallback(arquivos);
      });
    },
    
    /**
     * ETAPA 3: Preparar documento para upload
     * Configura Dropzone e prepara dados
     */
    executarEtapa3_PrepararDocumento: function(html, arquivos, dropzoneInstance, container) {
      logStep('ETAPA-3:preparar_documento', {});
      
      var $html = $(html);
      var form = $html.find('#frmDocumentoCadastro');
      var uploadForm = $html.find('#frmAnexos');
      
      // Se não encontrou o formulário de cadastro, tentar obter via link da tabela
      if (!form.length) {
        var hasEscolherForm = $html.find('#frmDocumentoEscolherTipo').length > 0;
        var hasTblSeries = $html.find('#tblSeries').length > 0;
        
        if (hasEscolherForm || hasTblSeries) {
          console.log('[SEIPro] ETAPA 3: Retrying - formulário não encontrado, buscando link...');
          
          var doc = parseHTMLDocument(html, window.location.href);
          var linkReceber = ensureHttps(getFirstHref(doc, 'a[href*="controlador.php?acao=documento_receber"]'));
          
          if (!linkReceber && hasTblSeries) {
            var firstRowLink = $html.find('#tblSeries tbody tr:first a.ancoraOpcao').attr('href');
            if (firstRowLink && firstRowLink !== '#') {
              linkReceber = ensureHttps(firstRowLink);
            }
          }
          
          if (linkReceber) {
            return requestHTMLWithHttps(linkReceber).then(function(novoHtml) {
              recordHtmlSnapshot('etapa3-receber-retry', novoHtml, { step: 'documento_receber_retry', url: linkReceber });
              return UploadFlowManager.executarEtapa3_PrepararDocumento(novoHtml, arquivos, dropzoneInstance, container);
            }).catch(function(err) {
              console.error('[SEIPro] ETAPA 3: Retry falhou:', err);
              queueFallback(arquivos);
            });
          }
        }
        
        console.warn('[SEIPro] ETAPA 3: Formulário não encontrado');
        queueFallback(arquivos);
        return;
      }
      
      var hrefForm = ensureHttps(form.attr('action'));
      recordHtmlSnapshot('etapa3-preparar', html, { step: 'preparar_documento', url: hrefForm });
      
      // Coletar dados do formulário e preparar contexto
      // NOTA: UPLOAD_IDENTIFIER ainda não existe, será obtido na ETAPA 5 após o POST
      var contexto = UploadFlowManager._construirContextoUpload(form, $html, html, arquivos[0], hrefForm, null);
      
      // Ir para ETAPA 4: Fazer POST para preparar upload
      return UploadFlowManager.executarEtapa4_PostPreparacaoUpload(contexto, arquivos, dropzoneInstance, container);
    },
    
    /**
     * ETAPA 4: POST de preparação para upload
     * Envia dados iniciais e prepara para receber arquivo
     */
    executarEtapa4_PostPreparacaoUpload: function(contexto, arquivos, dropzoneInstance, container) {
      logStep('ETAPA-4:post_preparacao', { url: contexto.hrefForm });
      
      var paramPreparacao = Object.assign({}, contexto.baseParams);
      paramPreparacao.hdnFlagDocumentoCadastro = "1";
      
      return $.ajax({
        method: 'POST',
        data: paramPreparacao,
        url: contexto.hrefForm,
        contentType: 'application/x-www-form-urlencoded; charset=ISO-8859-1'
      }).then(function(htmlPreparado) {
        recordHtmlSnapshot('etapa4-post-preparacao', htmlPreparado, { step: 'post_preparacao', url: contexto.hrefForm });
        
        // Configurar Dropzone para ETAPA 5 (upload do arquivo)
        return UploadFlowManager.executarEtapa5_ConfigurarUploadArquivo(htmlPreparado, contexto, arquivos, dropzoneInstance, container);
      }).fail(function(err) {
        console.error('[SEIPro] ETAPA 4 falhou:', err);
        queueFallback(arquivos);
      });
    },
    
    /**
     * ETAPA 5: Configurar e executar upload do arquivo
     * URL: controlador.php?acao=documento_upload_anexo
     */
    executarEtapa5_ConfigurarUploadArquivo: function(htmlPreparado, contexto, arquivos, dropzoneInstance, container) {
      logStep('ETAPA-5:configurar_upload', {});
      
      var $htmlPreparado = $(htmlPreparado);
      var formPreparado = $htmlPreparado.find('#frmDocumentoCadastro');
      var uploadForm = $htmlPreparado.find('#frmAnexos');
      
      if (!formPreparado.length || !uploadForm.length) {
        console.warn('[SEIPro] ETAPA 5: Elementos necessários não encontrados');
        queueFallback(arquivos);
        return;
      }
      
      var finalHrefForm = ensureHttps(formPreparado.attr('action')) || contexto.hrefForm;
      var finalUploadUrl = ensureHttps(uploadForm.attr('action')) || contexto.urlUpload;
      
      // Coletar valores atualizados do formulário
      var collectedValues = collectFormValues(formPreparado);
      var finalParamsObj = Object.assign({}, contexto.baseParams, collectedValues);
      finalParamsObj.hdnFlagDocumentoCadastro = "2";
      
      if (contexto.processedNameFile) {
        finalParamsObj.txtNumero = escapeComponentCompat(contexto.processedNameFile);
      }
      
      if (contexto.selSerie) {
        finalParamsObj.selSerie = contexto.selSerie;
        finalParamsObj.hdnIdSerie = contexto.selSerie;
      }
      
      // Configurar Dropzone SEM UPLOAD_IDENTIFIER
      dropzoneInstance.options.url = finalUploadUrl;
      dropzoneInstance.options.paramName = 'filArquivo';
      dropzoneInstance.options.uploadMultiple = false;
      dropzoneInstance.options.parallelUploads = 1;
      dropzoneInstance.options.params = {};
      dropzoneInstance.__seiProUploadUrl = finalUploadUrl;
      dropzoneInstance.__seiProSaveParams = {
        urlForm: finalHrefForm,
        paramsForm: finalParamsObj,
        userUnidade: contexto.userUnidade || null
      };
      dropzoneInstance.__seiProContainer = container;
      
      logStep('ETAPA-5:dropzone_configurado', {
        uploadUrl: finalUploadUrl,
        saveUrl: finalHrefForm
      });
      
      // Iniciar processamento da fila do Dropzone
      try {
        if (dropzoneInstance.files && dropzoneInstance.files.length) {
          var addedFiles = dropzoneInstance.files.filter(function(file) { 
            return file.status === Dropzone.ADDED; 
          });
          if (addedFiles.length) {
            dropzoneInstance.enqueueFiles(addedFiles);
          }
        }
      } catch(e) {
        console.warn('[SEIPro] Erro ao enfileirar arquivos', e);
      }
      
      try {
        if (dropzoneInstance.getQueuedFiles && dropzoneInstance.getQueuedFiles().length) {
          dropzoneInstance.processQueue();
        } else if (dropzoneInstance.processQueue) {
          dropzoneInstance.processQueue();
        }
      } catch(e) {
        console.warn('[SEIPro] Erro ao processar fila', e);
      }
      
      if (container && container.length) {
        container.addClass('sei-pro-arvore-uploading');
      }
    },
    
    /**
     * ETAPA 6: Salvar documento após upload
     * Chamada após sucesso do upload do arquivo
     */
    executarEtapa6_SalvarDocumento: function(parametrosSalvamento, dropzoneInstance, container) {
      console.log('[SEIPro] ========================================');
      console.log('[SEIPro] ETAPA 6: SALVANDO DOCUMENTO');
      console.log('[SEIPro] ========================================');
      
      logStep('ETAPA-6:salvar_documento', { url: parametrosSalvamento.urlForm });
      
      var hrefForm = ensureHttps(parametrosSalvamento.urlForm);
      var paramForm = parametrosSalvamento.paramsForm;
      
      console.log('[SEIPro] ETAPA 6: URL de salvamento:', hrefForm);
      console.log('[SEIPro] ETAPA 6: Tipo do payload:', typeof paramForm);
      console.log('[SEIPro] ETAPA 6: Tamanho do payload:', typeof paramForm === 'string' ? paramForm.length : 'N/A');
      
      // Mostrar resumo dos principais parâmetros
      try {
        var params = new URLSearchParams(paramForm);
        console.log('[SEIPro] ETAPA 6: Parâmetros principais:');
        console.log('  - hdnFlagDocumentoCadastro:', params.get('hdnFlagDocumentoCadastro'));
        console.log('  - hdnIdSerie:', params.get('hdnIdSerie'));
        console.log('  - selSerie:', params.get('selSerie'));
        console.log('  - txtNumero:', params.get('txtNumero'));
        console.log('  - hdnAnexos:', params.has('hdnAnexos') ? 'PRESENTE (' + params.get('hdnAnexos').length + ' chars)' : 'AUSENTE');
        console.log('  - txtDataElaboracao:', params.get('txtDataElaboracao'));
        console.log('  - rdoFormato:', params.get('rdoFormato'));
        console.log('  - rdoNivelAcesso:', params.get('rdoNivelAcesso'));
      } catch(e) {
        console.warn('[SEIPro] ETAPA 6: Não foi possível parsear parâmetros:', e);
      }
      
      var saveRecord = {
        timestamp: new Date().toISOString(),
        href: hrefForm,
        payloadSummary: summarizePayload(paramForm),
        paramForm: paramForm
      };
      
      var saveHistory = window.__seiProSaveHistory || [];
      saveHistory.push(saveRecord);
      while (saveHistory.length > SAVE_HISTORY_LIMIT) saveHistory.shift();
      window.__seiProLastSave = saveRecord;
      
      var xhr = new XMLHttpRequest();
      return $.ajax({
        method: 'POST',
        data: paramForm,
        url: hrefForm,
        contentType: 'application/x-www-form-urlencoded; charset=ISO-8859-1',
        xhr: function() { return xhr; }
      }).then(function(htmlResult, textStatus, jqXHRResponse) {
        var finalUrl = (jqXHRResponse && jqXHRResponse.responseURL) || xhr.responseURL || hrefForm;
        var sucesso = (finalUrl && finalUrl.indexOf('acao=arvore_visualizar&acao_origem=documento_receber') !== -1);
        
        var errors = extractSaveErrors(htmlResult);
        
        saveRecord.response = {
          status: sucesso,
          finalUrl: finalUrl,
          htmlLength: htmlResult ? htmlResult.length : 0,
          errors: errors
        };
        window.__seiProLastSave = saveRecord;
        
        console.log('[SEIPro] ========================================');
        console.log('[SEIPro] ETAPA 6: RESPOSTA DO SALVAMENTO');
        console.log('[SEIPro] ========================================');
        console.log('[SEIPro] ETAPA 6: URL final:', finalUrl);
        console.log('[SEIPro] ETAPA 6: Sucesso?', sucesso);
        console.log('[SEIPro] ETAPA 6: HTML length:', htmlResult ? htmlResult.length : 0);
        console.log('[SEIPro] ETAPA 6: Erros encontrados:', errors);
        
        // Registrar snapshot do HTML retornado para debug
        recordHtmlSnapshot('etapa6-salvar-resposta', htmlResult, { 
          step: 'salvar_documento_resposta', 
          url: finalUrl,
          sucesso: sucesso,
          errors: errors
        });
        
        logStep('ETAPA-6:resposta', {
          finalUrl: finalUrl,
          sucesso: sucesso,
          htmlLength: htmlResult ? htmlResult.length : 0,
          errors: errors.length > 0 ? errors : null
        });
        
        if (sucesso) {
          // ETAPA 7: Atualizar árvore e visualizar
          return UploadFlowManager.executarEtapa7_AtualizarArvore(htmlResult, finalUrl, dropzoneInstance, container);
        } else {
          var elem = container.find('.dz-preview').eq(0);
          elem.addClass('dz-error').find('.dz-error-message span').text('Não foi possível completar o upload.');
          queueFallback([]);
        }
      }).fail(function(jqXHR, textStatus, errorThrown) {
        console.error('[SEIPro] ETAPA 6 falhou:', jqXHR, textStatus, errorThrown);
        saveRecord.response = {
          status: false,
          error: errorThrown || textStatus,
          statusCode: jqXHR && jqXHR.status
        };
        window.__seiProLastSave = saveRecord;
        queueFallback([]);
      });
    },
    
    /**
     * ETAPA 7: Atualizar árvore e processar duplicados
     * URL: controlador.php?acao=arvore_visualizar
     */
    executarEtapa7_AtualizarArvore: function(htmlResult, urlParent, dropzoneInstance, container) {
      logStep('ETAPA-7:atualizar_arvore', {});
      
      // Verificar se há URL de documento duplicado
      var ajaxUrl = extractDuplicadoUrl(htmlResult, urlParent);
      
      var finalizarProcesso = function() {
        // Reprocessar fila se houver mais arquivos
        window.sendUploadArvore('upload', false, dropzoneInstance, container);
        // Atualizar informações na árvore
        window.getInfoArvoreLastDoc(htmlResult, urlParent, dropzoneInstance, container);
      };
      
      if (ajaxUrl) {
        logStep('ETAPA-7:documento_duplicado', { ajaxUrl: ajaxUrl });
        $.ajax({ url: ajaxUrl, method: 'GET' })
          .done(function(resp) {
            logStep('ETAPA-7:duplicado_resolvido', {});
          })
          .fail(function(jqXHR, textStatus, errorThrown) {
            console.warn('[SEIPro] Falha ao resolver duplicado', jqXHR, textStatus, errorThrown);
          })
          .always(finalizarProcesso);
      } else {
        finalizarProcesso();
      }
    },
    
    /**
     * Construir contexto de upload com todos os dados necessários
     * NOTA: uploadIdentifier não é mais passado aqui - será obtido na ETAPA 5
     */
    _construirContextoUpload: function(form, $html, html, primeiroArquivo, hrefForm) {
      var urlUpload = '';
      var extUpload = [];
      var userUnidade = '';
      
      // Extrair URL de upload do HTML
      $.each(html.split('\n'), function(index, value) {
        if (value.indexOf("objUpload = new infraUpload") !== -1) {
          var parsedUpload = value.split("'")[3];
          urlUpload = ensureHttps(parsedUpload, hrefForm);
        }
        if (value.indexOf("arrExt") !== -1) {
          if (typeof value.split('"')[1] !== 'undefined') {
            extUpload.push('.' + value.split('"')[1]);
          }
        }
        if (value.indexOf("objTabelaAnexos.adicionar") !== -1) {
          var regex = /\s*objTabelaAnexos\.adicionar\(\[arr\['nome_upload'\],arr\['nome'\],arr\['data_hora'\],arr\['tamanho'],infraFormatarTamanhoBytes\(arr\['tamanho'\]\),'(.+?)' ,'(.+?)']\);/gm;
          var paramV = regex.exec(value);
          if (paramV !== null) {
            userUnidade = {user: paramV[1], unidade: paramV[2]};
          }
        }
      });
      
      // Coletar parâmetros do formulário
      var param = {};
      form.find("input[type=hidden]").each(function() {
        var $input = $(this);
        if ($input.attr('name') && $input.attr('id') && $input.attr('id').indexOf('hdn') !== -1) {
          param[$input.attr('name')] = $input.val();
        }
      });
      
      form.find('input[type=text]').each(function() {
        var $input = $(this);
        if ($input.attr('id') && $input.attr('id').indexOf('txt') !== -1) {
          param[$input.attr('id')] = $input.val();
        }
      });
      
      form.find('select').each(function() {
        var $select = $(this);
        if ($select.attr('id') && $select.attr('id').indexOf('sel') !== -1) {
          param[$select.attr('id')] = $select.val();
        }
      });
      
      form.find('input[type=radio]:checked').each(function() {
        var $radio = $(this);
        if ($radio.attr('name') && $radio.attr('name').indexOf('rdo') !== -1) {
          param[$radio.attr('name')] = $radio.val();
        }
      });
      
      // Determinar série e nome do documento
      var serieInfo = UploadFlowManager._determinarSerieDocumento(form, primeiroArquivo);
      var processedNameFile = UploadFlowManager._processarNomeArquivo(primeiroArquivo ? primeiroArquivo.name : '', serieInfo.selSerieSelected);
      
      // Data de elaboração
      var Moment = window.moment;
      var txtDataElaboracao = (primeiroArquivo && primeiroArquivo.lastModifiedDate && Moment)
        ? Moment(primeiroArquivo.lastModifiedDate).format('DD/MM/YYYY')
        : (Moment ? Moment().format('DD/MM/YYYY') : new Date().toLocaleDateString('pt-BR'));
      
      // Configurações de sigilo e formato
      var parentCandidate = window.parent || window;
      var getConfigValue = function(key) { 
        return parentCandidate.getConfigValue ? parentCandidate.getConfigValue(key) : ''; 
      };
      var checkConfigValue = function(key) { 
        return parentCandidate.checkConfigValue ? parentCandidate.checkConfigValue(key) : false; 
      };
      
      var valueSigilo = getConfigValue('newdocsigilo');
      valueSigilo = (valueSigilo && valueSigilo.indexOf('|') !== -1) ? valueSigilo.split('|') : false;
      var valueNivelAcesso = checkConfigValue('newdocnivel') ? "0" : (valueSigilo ? valueSigilo[1] : "0");
      var newdocformat = getConfigValue('newdocformat');
      
      // Montar parâmetros finais
      param.selSerie = serieInfo.selSerie;
      param.hdnIdSerie = serieInfo.selSerie;
      param.rdoNivelAcesso = (form.find('input[name="rdoNivelAcesso"]:checked').length > 0)
        ? form.find('input[name="rdoNivelAcesso"]:checked').val()
        : valueNivelAcesso;
      param.hdnStaNivelAcessoLocal = param.rdoNivelAcesso;
      param.rdoFormato = (checkConfigValue('newdocformat') && newdocformat && newdocformat.indexOf('digitalizado') !== -1) ? "D" : "N";
      param.hdnFlagDocumentoCadastro = "2";
      param.hdnIdHipoteseLegal = (valueSigilo) ? valueSigilo[0] : param.selHipoteseLegal;
      param.selHipoteseLegal = param.hdnIdHipoteseLegal;
      param.selTipoConferencia = (checkConfigValue('newdocformat') && newdocformat && newdocformat.indexOf('digitalizado') !== -1 && newdocformat.indexOf('_') !== -1) ? newdocformat.split('_')[1] : "";
      param.hdnIdTipoConferencia = param.selTipoConferencia;
      param.txaObservacoes = "";
      param.txtDataElaboracao = txtDataElaboracao;
      param.txtNumero = escapeComponentCompat(processedNameFile);
      
      return {
        hrefForm: hrefForm,
        urlUpload: urlUpload,
        userUnidade: userUnidade,
        baseParams: param,
        selSerie: serieInfo.selSerie,
        processedNameFile: processedNameFile,
        extUpload: extUpload
        // uploadIdentifier será obtido na ETAPA 5 do HTML retornado
      };
    },
    
    /**
     * Determinar série do documento baseado no nome do arquivo
     */
    _determinarSerieDocumento: function(form, primeiroArquivo) {
      var parentCandidate = window.parent || window;
      var removeAcentos = function(str) { 
        return parentCandidate.removeAcentos ? parentCandidate.removeAcentos(str) : str; 
      };
      var getConfigValue = function(key) { 
        return parentCandidate.getConfigValue ? parentCandidate.getConfigValue(key) : ''; 
      };
      var checkConfigValue = function(key) { 
        return parentCandidate.checkConfigValue ? parentCandidate.checkConfigValue(key) : false; 
      };
      
      var nameFile = primeiroArquivo ? primeiroArquivo.name : '';
      var nameFile_reg = removeAcentos(nameFile.trim().toLowerCase().replace(/_|:/g, ' '));
      var tipoDoc = [];
      var valueSerie = false;
      
      // Coletar todas as opções disponíveis
      form.find('#selSerie option').each(function() {
        var $option = $(this);
        if ($option.text().trim() !== '') {
          var nameOption = $option.text().trim().toLowerCase().replace(/_|:/g, ' ');
          var nameOptionReg = removeAcentos(nameOption);
          tipoDoc.push({name: nameOption, nameReg: nameOptionReg, value: $option.val()});
        }
      });
      
      console.log('[SEIPro] Detectando tipo do documento:', nameFile);
      
      // ETAPA 1: Mapeamentos inteligentes específicos
      var mapeamentos = [
        { padroes: ['\\bnf\\b', 'nota fiscal', 'nota.fiscal'], termo: 'nota fiscal' },
        { padroes: ['solicitacao.{0,5}pagamento', 'solicitacao de pagamento'], termo: 'solicitacao pagamento' },
        { padroes: ['\\bcnd\\b', 'certidao.{0,5}estadual', 'estado.{0,5}cnd'], termo: 'certidao estadual' },
        { padroes: ['\\bfgts\\b', 'certidao.{0,5}fgts'], termo: 'fgts' },
        { padroes: ['certidao', 'certidão'], termo: 'certidao' },
        { padroes: ['contrato'], termo: 'contrato' },
        { padroes: ['ata\\b'], termo: 'ata' },
        { padroes: ['oficio', 'ofício'], termo: 'oficio' },
        { padroes: ['memorando'], termo: 'memorando' },
        { padroes: ['relatorio', 'relatório'], termo: 'relatorio' },
        { padroes: ['declaracao', 'declaração'], termo: 'declaracao' }
      ];
      
      for (var i = 0; i < mapeamentos.length; i++) {
        var map = mapeamentos[i];
        var encontrou = false;
        
        for (var j = 0; j < map.padroes.length; j++) {
          var regex = new RegExp(map.padroes[j], 'i');
          if (regex.test(nameFile_reg)) {
            encontrou = true;
            break;
          }
        }
        
        if (encontrou) {
          console.log('[SEIPro] Padrão detectado:', map.termo);
          
          // Procurar no select por esse termo
          for (var k = 0; k < tipoDoc.length; k++) {
            var termoRegex = new RegExp(map.termo.replace(/\s+/g, '.{0,5}'), 'i');
            if (termoRegex.test(tipoDoc[k].nameReg)) {
              valueSerie = tipoDoc[k].value;
              console.log('[SEIPro] ✓ Tipo encontrado:', tipoDoc[k].name, '(ID:', valueSerie, ')');
              break;
            }
          }
          
          if (valueSerie) break;
        }
      }
      
      // ETAPA 2: Se não encontrou, tentar match por prefixo (lógica original)
      if (!valueSerie) {
        for (var m = 0; m < tipoDoc.length; m++) {
          var reg = new RegExp('^\\b' + tipoDoc[m].nameReg, 'igm');
          if (reg.test(nameFile_reg)) {
            valueSerie = tipoDoc[m].value;
            console.log('[SEIPro] ✓ Tipo por prefixo:', tipoDoc[m].name, '(ID:', valueSerie, ')');
            break;
          }
        }
      }
      
      // ETAPA 3: Fallback - usar "Anexo" se nada foi encontrado
      var selSerieDefault = checkConfigValue('newdocname')
        ? tipoDoc.filter(function(value) { 
            return value.name == removeAcentos(getConfigValue('newdocname').trim().toLowerCase().replace(/_|:/g, ' ')); 
          })[0]
        : tipoDoc.filter(function(value) { return value.name == 'anexo'; })[0];
      
      selSerieDefault = (typeof selSerieDefault !== 'undefined') 
        ? selSerieDefault 
        : tipoDoc.filter(function(value) { return value.name.indexOf('anexo') !== -1; })[0];
      selSerieDefault = (typeof selSerieDefault === 'undefined') ? tipoDoc[0] : selSerieDefault;
      
      // Se não encontrou nada, forçar uso de Anexo
      if (!valueSerie) {
        console.log('[SEIPro] ⚠ Tipo não detectado, usando fallback: Anexo');
        valueSerie = selSerieDefault ? selSerieDefault.value : '';
      }
      
      var selSerie = (valueSerie) ? valueSerie : (selSerieDefault ? selSerieDefault.value : '');
      var selSerieSelected = tipoDoc.filter(function(value) { return value.value == valueSerie; })[0];
      selSerieSelected = (typeof selSerieSelected !== 'undefined') ? selSerieSelected : selSerieDefault;
      
      return {
        selSerie: selSerie,
        selSerieSelected: selSerieSelected,
        tipoDoc: tipoDoc
      };
    },
    
    /**
     * Processar nome do arquivo removendo série e extensão
     */
    _processarNomeArquivo: function(nomeArquivo, serieSelected) {
      var processedNameFile = nomeArquivo;
      
      if (serieSelected) {
        var regName = new RegExp('^\\b' + serieSelected.name, 'igm');
        if (regName.test(processedNameFile)) {
          processedNameFile = processedNameFile.replace(regName, '').trim();
        }
      }
      
      if (processedNameFile.indexOf('.') !== -1) {
        processedNameFile = processedNameFile.substring(0, processedNameFile.lastIndexOf('.'));
      }
      
      if (processedNameFile.length > 50) {
        processedNameFile = processedNameFile.replace(/^(.{50}[^\s]*).*/, "$1");
      }
      if (processedNameFile.length > 50) {
        processedNameFile = processedNameFile.substring(0, 49);
      }
      
      return processedNameFile;
    }
  };

  // ========================================
  // FUNÇÕES DE ATUALIZAÇÃO DA ÁRVORE
  // ========================================
  
  /**
   * Extrair parâmetros da URL
   */
  function getParamsUrlPro(url) {
    if (!url || typeof url !== 'string') return {};
    
    var params = {};
    var queryString = url.indexOf('?') !== -1 ? url.split('?')[1] : '';
    
    if (queryString) {
      var pairs = queryString.split('&');
      for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        if (pair[0]) {
          params[decodeURIComponent(pair[0])] = pair[1] ? decodeURIComponent(pair[1]) : '';
        }
      }
    }
    
    return params;
  }
  
  /**
   * Atualizar árvore após salvar documento
   * Busca informações do documento na árvore e atualiza a interface
   */
  window.getInfoArvoreLastDoc = function(dataResult, urlParent, arrayDropzone, _containerUpload) {
    console.log('[SEIPro] getInfoArvoreLastDoc: Iniciando atualização da árvore');
    
    if (!dataResult || !urlParent) {
      console.warn('[SEIPro] getInfoArvoreLastDoc: Dados insuficientes', {
        hasDataResult: !!dataResult,
        hasUrlParent: !!urlParent
      });
      return;
    }
    
    var $containerUpload = _containerUpload && _containerUpload.jquery 
      ? _containerUpload 
      : (typeof containerUpload !== 'undefined' ? $(containerUpload) : $());
    var indexUpload = (typeof $containerUpload.data('index') !== 'undefined') ? parseInt($containerUpload.data('index')) : 0;
    var param = getParamsUrlPro(urlParent);
    
    console.log('[SEIPro] getInfoArvoreLastDoc: Parâmetros', param);
    
    // Verificar se há Dropzone válido
    if (!arrayDropzone) {
      arrayDropzone = window.arvoreDropzone || (window.parent && window.parent.arvoreDropzone);
    }
    
    var queuedFiles = [];
    try {
      if (arrayDropzone && typeof arrayDropzone.getQueuedFiles === 'function') {
        queuedFiles = arrayDropzone.getQueuedFiles();
      }
    } catch(e) {
      console.warn('[SEIPro] Erro ao obter fila do Dropzone', e);
    }
    
    var urlArvore = null;
    
    // Buscar URL da árvore no HTML de resposta
    $.each(dataResult.split('\n'), function(index, value) {
      // Procurar por atualizarArvore ou linkMontarArvoreProcessoDocumento
      if (value.indexOf("atualizarArvore('controlador.php?acao=procedimento_visualizar") !== -1 ||
          value.indexOf("var linkMontarArvoreProcessoDocumento") !== -1) {
        urlArvore = value.split("'")[1];
        return false; // break
      }
    });
    
    if (!urlArvore) {
      console.log('[SEIPro] getInfoArvoreLastDoc: URL da árvore não encontrada, tentando reload da página');
      // Se não encontrou URL, apenas recarregar se não houver mais arquivos
      if (queuedFiles.length === 0) {
        setTimeout(function() {
          console.log('[SEIPro] Recarregando página...');
          window.location.reload();
        }, 500);
      }
      return;
    }
    
    console.log('[SEIPro] getInfoArvoreLastDoc: Carregando árvore de:', urlArvore);
    
    // Fazer requisição para obter árvore atualizada
    $.ajax({ url: urlArvore })
      .done(function(htmlArvore) {
        console.log('[SEIPro] getInfoArvoreLastDoc: Árvore recebida');
        
        var arrayArvore = [];
        
        // Buscar informações do documento na árvore
        $.each(htmlArvore.split('\n'), function(index, value) {
          if (param.id_documento && param.id_procedimento &&
              value.indexOf('new infraArvoreNo("DOCUMENTO","' + param.id_documento + '","' + param.id_procedimento + '"') !== -1) {
            arrayArvore = value.split('"');
            return false; // break
          }
        });
        
        if (arrayArvore.length > 0) {
          console.log('[SEIPro] getInfoArvoreLastDoc: Informações do documento encontradas');
          
          // Atualizar elementos da interface
          var elem = $containerUpload.find('.dz-preview').eq(indexUpload);
          
          if (elem.length && arrayArvore[7]) {
            var ifrVisualizacao = 'ifrVisualizacao';
            
            elem.find('a[target="' + ifrVisualizacao + '"]')
              .attr('href', arrayArvore[7])
              .attr('id', 'anchor' + param.id_documento)
              .find('span')
              .text(arrayArvore[11] || 'Documento')
              .attr('id', 'span' + param.id_documento);
            
            elem.find('a#anchorImgID')
              .attr('id', 'anchorImg' + param.id_documento)
              .find('img')
              .attr('src', arrayArvore[15])
              .attr('id', 'icon' + param.id_documento);
            
            console.log('[SEIPro] getInfoArvoreLastDoc: Interface atualizada');
          }
          
          // Fazer scroll para o documento na árvore (se a função existir)
          if (param.id_documento) {
            setTimeout(function() {
              try {
                if (window.parent && window.parent.scrollToElementArvore) {
                  window.parent.scrollToElementArvore(param.id_documento);
                } else if (window.scrollToElementArvore) {
                  window.scrollToElementArvore(param.id_documento);
                }
              } catch(e) {
                console.log('[SEIPro] Scroll não disponível', e);
              }
            }, 500);
          }
          
          // Incrementar índice
          $containerUpload.data('index', indexUpload + 1);
        }
        
        // Se não houver mais arquivos na fila, recarregar página
        if (queuedFiles.length === 0) {
          console.log('[SEIPro] getInfoArvoreLastDoc: Sem mais arquivos, recarregando...');
          
          // Mostrar mensagem de sucesso se disponível
          try {
            if (typeof window.dropzoneAlertBoxInfo === 'function') {
              window.dropzoneAlertBoxInfo();
            }
          } catch(e) {}
          
          setTimeout(function() {
            window.location.reload();
          }, 1000);
          
          // Processar próximo arquivo se houver função disponível
          try {
            if (window.parent && typeof window.parent.nextUploadFilesInProcess === 'function' && window.parent.arvoreDropzone) {
              window.parent.nextUploadFilesInProcess();
            }
          } catch(e) {}
        }
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        console.error('[SEIPro] getInfoArvoreLastDoc: Falha ao carregar árvore', textStatus, errorThrown);
        
        // Tentar recarregar de qualquer forma
        if (queuedFiles.length === 0) {
          setTimeout(function() {
            window.location.reload();
          }, 1000);
        }
      });
  };

  // ========================================
  // MÓDULO 2: FUNÇÕES AUXILIARES E UTILITÁRIAS
  // ========================================

  function registerLegacyUploadFunctions(){
    function alertDiagnostic(info){
      try {
        var msg = 'Não foi possível incluir diretamente na árvore. Motivo:\n\n' + info;
        if (typeof window.alertaBoxPro === 'function') {
          window.alertaBoxPro('Aviso', 'exclamation-triangle', msg.replace(/\n/g,'<br>'));
        } else {
          window.alert(msg);
        }
      } catch(e){ console.warn(info); }
    }

    function queueFallback(files){
      if (!files) return;
      files.__sei_diagnostics__ = 'O processo não expôs os endpoints necessários (documento_receber). Utilize a área nativa do SEI para anexar.';
      try { console.warn('[SEIPro] Fallback acionado:', files.__sei_diagnostics__); } catch(e){}
    }
    window.__seiProQueueFallback = window.__seiProQueueFallback || queueFallback;

    function processEscolherTipo(url, queuedFiles, mode, result, arrayDropzone, $container){
      logStep('processEscolherTipo', { url: url });
      requestHTMLWithHttps(url).then(function(html){
        var doc = parseHTMLDocument(html, url);
        var $html = $(doc);
        var hasCadastro = $html.find('#frmDocumentoCadastro').length > 0;
        if (hasCadastro) {
          window.submitUploadArvore(html, queuedFiles, mode, result, arrayDropzone, $container);
          return;
        }
        var hasEscolherForm = $html.find('#frmDocumentoEscolherTipo').length > 0;
        if (hasEscolherForm) {
          window.ajaxPostUploadArvore($html, queuedFiles, mode, result, arrayDropzone, $container);
          return;
        }
        var followReceber = ensureHttps(getFirstHref(doc, 'a[href*="controlador.php?acao=documento_receber"]'), url);
        if (!followReceber) {
          var match = html.match(/https?:\/\/[^"'\s]*controlador\.php\?[^"'\s]*acao=documento_receber[^"']*/i) || html.match(/controlador\.php\?[^"'\s]*acao=documento_receber[^"']*/i);
          if (match && match[0]) followReceber = ensureHttps(match[0], url);
        }
        if (followReceber) {
          window.ajaxGetUploadArvore(followReceber, queuedFiles, mode, result, arrayDropzone, $container);
          return;
        }
        console.warn('[SEIPro] processEscolherTipo não encontrou fluxos válidos');
        queueFallback(queuedFiles);
      }).catch(function(err){
        console.error('[SEIPro] processEscolherTipo falhou', err);
        queueFallback(queuedFiles);
      });
    }

    function parseHTMLDocument(html, baseHref){
      try {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        if (baseHref) {
          var baseEl = doc.querySelector('base') || doc.createElement('base');
          baseEl.setAttribute('href', baseHref);
          if (!baseEl.parentNode && doc.head) {
            doc.head.insertBefore(baseEl, doc.head.firstChild || null);
          }
        }
        return doc;
      } catch(e){
        var tmp = document.implementation.createHTMLDocument('tmp');
        if (baseHref) {
          var baseElTmp = tmp.createElement('base');
          baseElTmp.setAttribute('href', baseHref);
          tmp.head.insertBefore(baseElTmp, tmp.head.firstChild || null);
        }
        tmp.documentElement.innerHTML = html;
        return tmp;
      }
    }
    window.__seiProParseHtml = window.__seiProParseHtml || parseHTMLDocument;

    function getFirstHref(doc, selector){
      try {
        var el = doc.querySelector(selector);
        if (el && el.getAttribute) return el.getAttribute('href');
      } catch(e){}
      return null;
    }

    function parseUploadId(url){
      try {
        var parsed = new URL(url, window.location.origin);
        var id = parsed.searchParams.get('ID');
        if (id) return id;
      } catch(e){}
      return null;
    }

    function processUploadAnexo(url, queuedFiles, mode, result, arrayDropzone, $container){
      logStep('processUploadAnexo', { url: url });
      var uploadId = parseUploadId(url);
      if (!uploadId) {
        console.warn('[SEIPro] processUploadAnexo sem ID de upload');
        queueFallback(queuedFiles);
        return;
      }
      var attempts = 0;
      function pollProgress(){
        attempts++;
        var progressUrl = '/infra_js/infra_upload_progresso.php?ID=' + encodeURIComponent(uploadId) + '&CNT=' + attempts + '&DT=' + encodeURIComponent(new Date().toString());
        $.ajax({ url: ensureHttps(progressUrl, url), cache: false }).done(function(){
          if (attempts < 5) {
            setTimeout(pollProgress, 400);
          }
        }).fail(function(err){
          console.warn('[SEIPro] falha ao consultar progresso upload', err);
        });
      }
      pollProgress();
      requestHTMLWithHttps(url).then(function(html){
        recordHtmlSnapshot('documento_upload_anexo-' + describeUrlContext(url), html, { step: 'processUploadAnexo', url: url });
        var doc = parseHTMLDocument(html, url);
        window.submitUploadArvore(doc.documentElement.outerHTML, queuedFiles, mode, result, arrayDropzone, $container);
      }).catch(function(err){
        console.error('[SEIPro] processUploadAnexo falhou', err);
        queueFallback(queuedFiles);
      });
    }

    function collectFormValues($form){
      var collected = {};
      if (!$form || !$form.length) return collected;
      $form.find('input').each(function(){
        var $input = $(this);
        var name = $input.attr('name') || $input.attr('id');
        if (!name) return;
        var type = ($input.attr('type') || '').toLowerCase();
        if (type === 'radio' || type === 'checkbox') {
          if ($input.is(':checked')) collected[name] = $input.val();
        } else {
          collected[name] = $input.val();
        }
      });
      $form.find('select').each(function(){
        var $select = $(this);
        var name = $select.attr('name') || $select.attr('id');
        if (!name) return;
        collected[name] = $select.val();
      });
      $form.find('textarea').each(function(){
        var $textarea = $(this);
        var name = $textarea.attr('name') || $textarea.attr('id');
        if (!name) return;
        collected[name] = $textarea.val();
      });
      return collected;
    }

    function generateUploadIdentifier(){
      return (Date.now().toString(16) + Math.random().toString(16).slice(2, 10)).substr(0, 12);
    }

    function extractUploadIdentifierFromNode($context){
      if (!$context || !$context.length) return '';
      var uploadIdentifierInput = $context.find('input[name="UPLOAD_IDENTIFIER"]');
      if (uploadIdentifierInput && uploadIdentifierInput.length) {
        return uploadIdentifierInput.attr('value') || uploadIdentifierInput.val() || '';
      }
      return '';
    }

    function extractUploadIdentifierFromHtml(html){
      if (typeof html !== 'string' || !html.length) return '';
      var regex = /name=["']UPLOAD_IDENTIFIER["'][^>]*value=["']([^"']+)/i;
      var match = regex.exec(html);
      return match && match[1] ? match[1] : '';
    }

    function resolveUploadIdentifier($context, rawHtml, baseHref){
      return new Promise(function(resolve){
        try {
          var directValue = extractUploadIdentifierFromNode($context);
          if (directValue) {
            resolve({ value: directValue, source: 'form' });
            return;
          }
          var regexValue = extractUploadIdentifierFromHtml(rawHtml);
          if (regexValue) {
            resolve({ value: regexValue, source: 'html' });
            return;
          }
          var iframe = $context.find('iframe#ifrfrmAnexos, iframe[name="ifrfrmAnexos"]');
          var iframeSrc = iframe.attr('src') || iframe.attr('data-src') || (iframe.data ? iframe.data('src') : null);
          if (!iframeSrc) {
            resolve({ value: generateUploadIdentifier(), source: 'generated-no-iframe' });
            return;
          }
          var finalUrl = ensureHttps(iframeSrc, baseHref);
          logStep('upload:resolveIdentifier:iframe', { url: finalUrl });
          requestHTMLWithHttps(finalUrl).then(function(iframeHtml){
            recordHtmlSnapshot('documento_receber-iframe-' + describeUrlContext(finalUrl), iframeHtml, { step: 'resolveUploadIdentifier', url: finalUrl });
            var $iframeDoc = $(iframeHtml);
            var iframeValue = extractUploadIdentifierFromNode($iframeDoc) || extractUploadIdentifierFromHtml(iframeHtml);
            if (iframeValue) {
              resolve({ value: iframeValue, source: 'iframe', iframeUrl: finalUrl });
              return;
            }
            resolve({ value: generateUploadIdentifier(), source: 'generated-iframe-empty', iframeUrl: finalUrl });
          }).catch(function(err){
            console.warn('[SEIPro] resolveUploadIdentifier: erro ao carregar iframe', err);
            resolve({ value: generateUploadIdentifier(), source: 'generated-iframe-error', iframeUrl: finalUrl, error: err });
          });
        } catch(e){
          console.warn('[SEIPro] resolveUploadIdentifier falhou', e);
          resolve({ value: generateUploadIdentifier(), source: 'generated-exception', error: e });
        }
      });
    }

    function configureDropzoneAfterPost(htmlPrepared, queuedFiles, mode, result, arrayDropzone, containerContext, context){
      try {
        var $htmlPrepared = $(htmlPrepared);
        var formPrepared = $htmlPrepared.find('#frmDocumentoCadastro');
        var uploadForm = $htmlPrepared.find('#frmAnexos');
        if (!formPrepared.length || !uploadForm.length) {
          console.warn('[SEIPro] configureDropzoneAfterPost: elementos necessários não encontrados.');
          queueFallback(queuedFiles);
          return;
        }
        var finalHrefForm = ensureHttps(formPrepared.attr('action')) || context.hrefForm;
        var finalUploadUrl = ensureHttps(uploadForm.attr('action')) || context.urlUpload;
        resolveUploadIdentifier($htmlPrepared, htmlPrepared, finalHrefForm).then(function(identifierInfo){
          var uploadIdentifier = identifierInfo && identifierInfo.value ? identifierInfo.value : '';
          uploadIdentifier = (uploadIdentifier === null || typeof uploadIdentifier === 'undefined') ? '' : String(uploadIdentifier).trim();
          if (!uploadIdentifier) {
            uploadIdentifier = generateUploadIdentifier();
          }
          if (!uploadForm.find('input[name="UPLOAD_IDENTIFIER"]').length) {
            uploadForm.append('<input type="hidden" name="UPLOAD_IDENTIFIER" value="'+uploadIdentifier+'" />');
          } else {
            uploadForm.find('input[name="UPLOAD_IDENTIFIER"]').val(uploadIdentifier);
          }
          logStep('upload:post-response', {
            hasForm: true,
            hasUploadForm: true,
            uploadIdentifier: uploadIdentifier,
            identifierSource: identifierInfo ? identifierInfo.source : null,
            iframeUrl: identifierInfo ? identifierInfo.iframeUrl || null : null
          });
          if (!uploadIdentifier) {
            console.warn('[SEIPro] configureDropzoneAfterPost: UPLOAD_IDENTIFIER ausente mesmo após tentativa.');
            queueFallback(queuedFiles);
            return;
          }
          var collectedValues = collectFormValues(formPrepared);
          var finalParamsObj = Object.assign({}, context.baseParams || {}, collectedValues || {});
          finalParamsObj.hdnFlagDocumentoCadastro = "2";
          if (context.processedNameFile) {
            finalParamsObj.txtNumero = escapeComponentCompat(context.processedNameFile);
          }
          if (context.baseParams && context.baseParams.txtDataElaboracao) {
            finalParamsObj.txtDataElaboracao = context.baseParams.txtDataElaboracao;
          }
          if (context.baseParams && context.baseParams.rdoFormato) {
            finalParamsObj.rdoFormato = context.baseParams.rdoFormato;
          }
          if (context.selSerie) {
            finalParamsObj.selSerie = context.selSerie;
            finalParamsObj.hdnIdSerie = context.selSerie;
          }
          if (!arrayDropzone) {
            console.warn('[SEIPro] configureDropzoneAfterPost: arrayDropzone ausente.');
            queueFallback(queuedFiles);
            return;
          }
          arrayDropzone.options.url = finalUploadUrl;
          arrayDropzone.options.paramName = 'filArquivo';
          if (typeof arrayDropzone.paramName !== 'undefined') {
            arrayDropzone.paramName = 'filArquivo';
          }
          arrayDropzone.options.params = uploadIdentifier ? { UPLOAD_IDENTIFIER: uploadIdentifier } : {};
          arrayDropzone.__seiProUploadIdentifier = uploadIdentifier;
          arrayDropzone.__seiProUploadUrl = finalUploadUrl;
          arrayDropzone.__seiProSaveParams = {
            urlForm: finalHrefForm,
            paramsForm: finalParamsObj,
            userUnidade: context.userUnidade || null
          };
          arrayDropzone.__seiProContainer = containerContext;
          logStep('dropzone:configure', {
            url: finalUploadUrl,
            uploadIdentifier: uploadIdentifier,
            identifierSource: identifierInfo ? identifierInfo.source : null,
            paramsKeys: Object.keys(arrayDropzone.options.params || {})
          });
          console.debug('[SEIPro] configureDropzoneAfterPost configurado', {
            uploadUrl: finalUploadUrl,
            uploadIdentifier: uploadIdentifier,
            saveUrl: finalHrefForm
          });
          try {
            if (arrayDropzone.files && arrayDropzone.files.length) {
              var addedFiles = arrayDropzone.files.filter(function(file){ return file.status === Dropzone.ADDED; });
              if (addedFiles.length) {
                arrayDropzone.enqueueFiles(addedFiles);
              }
            }
          } catch(e) {
            console.warn('[SEIPro] Erro ao enfileirar arquivos no Dropzone', e);
          }
          try {
            if (arrayDropzone.getQueuedFiles && arrayDropzone.getQueuedFiles().length) {
              arrayDropzone.processQueue();
            } else if (arrayDropzone.processQueue) {
              arrayDropzone.processQueue();
            }
          } catch(e) {
            console.warn('[SEIPro] Erro ao processar fila Dropzone', e);
          }
          if (containerContext && containerContext.length) {
            containerContext.addClass('sei-pro-arvore-uploading');
          }
        }).catch(function(err){
          console.error('[SEIPro] configureDropzoneAfterPost: falha ao resolver UPLOAD_IDENTIFIER', err);
          queueFallback(queuedFiles);
        });
      } catch(err) {
        console.error('[SEIPro] configureDropzoneAfterPost falhou', err);
        queueFallback(queuedFiles);
      }
    }

    if (typeof window.sendUploadArvore === "function") return;
    var $ = window.jQuery || window.$;
    if (!$) return;

    var fallbackSelector = "#sei-pro-upload-form";
    window.__seiProArvoreFallbackSelector = fallbackSelector;

    var jmespathRef = window.jmespath;
    function jpSearch(data, expression){
      if (!jmespathRef || !data) return null;
      try { return jmespathRef.search(data, expression); } catch(e){ return null; }
    }

    function normalizeLink(href, baseHref){
      try {
        if (!href) return href;
        var base = baseHref || (document.baseURI || window.location.href);
        var parsed = new URL(href, base);
        return parsed.toString();
      } catch(e){
        return href;
      }
    }

  function ensureHttps(url, baseHref){
    var normalized = normalizeLink(url, baseHref);
    try {
      if (!normalized) return normalized;
      var loc = window.location;
      var parsed = new URL(normalized);
      if (loc && loc.protocol === 'https:' && parsed.protocol === 'http:') {
        parsed.protocol = 'https:';
        if (parsed.port === '80') parsed.port = '';
        return parsed.toString();
      }
      return normalized;
    } catch(e){
      return normalized;
    }
  }

  function describeUrlContext(url){
    try {
      var parsed = new URL(url, window.location.href);
      var acaoAjax = parsed.searchParams.get('acao_ajax');
      var acao = parsed.searchParams.get('acao');
      var base = parsed.pathname ? parsed.pathname.split('/').pop() : '';
      var context = acaoAjax || acao || base || 'unknown';
      return context.toString();
    } catch(e){
      return (url || '').toString();
    }
  }

  function recordHtmlSnapshot(label, html, meta){
    if (typeof html === 'undefined' || html === null) {
      return;
    }
    try {
      var store = window.__seiProHtmlSnapshots = window.__seiProHtmlSnapshots || [];
      var htmlContent = (typeof html === 'string') ? html : String(html);
      var timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
      var safeLabel = (label || 'snapshot').toString().replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
      var filename = safeLabel + '-' + timestamp + '.html';
      var entry = {
        label: label,
        timestamp: timestamp,
        filename: filename,
        meta: meta || null,
        size: htmlContent.length
      };
      if (window.Blob && window.URL && typeof window.URL.createObjectURL === 'function') {
        try {
          var blob = new Blob([htmlContent], { type: 'text/html; charset=ISO-8859-1' });
          entry.url = URL.createObjectURL(blob);
          entry.revoke = function(){
            try { URL.revokeObjectURL(entry.url); } catch(err){}
          };
        } catch(errBlob){
          console.warn('[SEIPro] Não foi possível gerar Blob para snapshot', errBlob);
        }
      }
      if (entry.url) {
        console.info('[SEIPro][snapshot]', label, filename, entry.url);
      } else {
        console.info('[SEIPro][snapshot]', label, filename, 'armazenado (download indisponível)');
      }
      entry.html = htmlContent;
      store.push(entry);
      var maxSnapshots = 12;
      while (store.length > maxSnapshots) {
        var oldEntry = store.shift();
        if (oldEntry && typeof oldEntry.revoke === 'function') oldEntry.revoke();
      }
    } catch(e){
      console.warn('[SEIPro] Falha ao armazenar snapshot', e);
    }
  }

  function logSaveStep(phase, details){
    try {
      console.info('[SEIPro][save]', phase, details || '');
    } catch(e){}
  }

  var DEBUG_VERBOSE = false;
  if (!window.__seiProConsolePatched) {
    window.__seiProConsolePatched = true;
    (function(){
      var originalDebug = console.debug ? console.debug.bind(console) : function(){};
      window.SEIPro_setVerboseDebug = function(flag){ DEBUG_VERBOSE = !!flag; };
      console.debug = function(){
        if (!DEBUG_VERBOSE && arguments.length && typeof arguments[0] === 'string' && arguments[0].indexOf('[SEIPro]') === 0) {
          return;
        }
        return originalDebug.apply(console, arguments);
      };
    })();
  }

  async function fetchFollowHttps(url, opts){
    try {
      var target = ensureHttps(url);
      var maxHops = 5;
      var attempt = 0;
      while (attempt < maxHops) {
        attempt++;
        var res = await fetch(target, Object.assign({ redirect: 'manual', credentials: 'include' }, opts || {}));
        // 2xx
        if (res.status >= 200 && res.status < 300) return res;
        // 3xx manual follow
        if (res.status >= 300 && res.status < 400) {
          var loc = res.headers.get('Location') || res.headers.get('location');
          if (!loc) break;
          var next = ensureHttps(loc);
          // Rebase relative redirects
          try { next = new URL(next, target).toString(); } catch(e) {}
          target = next;
          continue;
        }
        // Other codes: stop
        return res;
      }
      // Fallback final fetch
      return await fetch(target, Object.assign({ credentials: 'include' }, opts || {}));
    } catch(e) {
      throw e;
    }
  }

  // requestHTMLWithHttps já foi definida acima antes do UploadFlowManager

  function pushUniqueLink(name, url){
    if (!url) return;
    url = ensureHttps(url);
    try { console.debug('[SEIPro] pushUniqueLink candidato', name, url); } catch(e){}
    if (!url) return;
    try {
      var loc = window.location;
      var parsed = new URL(url, loc ? loc.origin : undefined);
      if (!parsed || !parsed.hostname || !loc || parsed.hostname !== loc.hostname) return;
      if (/sip\/login\.php/i.test(parsed.pathname)) return;
      url = parsed.toString();
    } catch(e){ return; }
    if (!Array.isArray(window.arrayLinksArvore)) window.arrayLinksArvore = [];
    var exists = window.arrayLinksArvore.some(function(item){ return item && item.name === name; });
    if (!exists) {
      window.arrayLinksArvore.push({ name: name, url: url, icon: '', alt: name });
    }
  }

  function ensureLinksArvore(){
    var hasLink = Array.isArray(window.arrayLinksArvore) && window.arrayLinksArvore.some(function(item){
      return item && item.name === 'Incluir Documento' && item.url;
    });
    if (hasLink) return;

    var visited = new WeakSet();
    var docsToCheck = [];

    function enqueue(doc){
      if (!doc || visited.has(doc)) return;
      visited.add(doc);
      docsToCheck.push(doc);
      try {
        var frames = doc.querySelectorAll('iframe');
        for (var i = 0; i < frames.length; i++) {
          var frame = frames[i];
          try {
            var childDoc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
            enqueue(childDoc);
          } catch(e) {}
        }
      } catch(e) {}
    }

    enqueue(document);
    if (window.parent && window.parent !== window) {
      try { enqueue(window.parent.document); } catch(e) {}
    }
    if (window.top && window.top !== window && window.top !== window.parent) {
      try { enqueue(window.top.document); } catch(e) {}
    }

    // Método 1: Buscar em scripts e DOM
    for (var i = 0; i < docsToCheck.length; i++) {
      var links = extractLinksArvoreFromScripts(docsToCheck[i]);
      if (links && links.length) {
        pushUniqueLink('Incluir Documento', links[0]);
        return;
      }
    }
    
    // Método 2: Tentar usar getUrlAcaoPro se disponível
    try {
      var parentCandidate = window.parent && window.parent.parent ? window.parent.parent : window.parent || window;
      if (typeof parentCandidate.getUrlAcaoPro === 'function') {
        var url = parentCandidate.getUrlAcaoPro('documento_escolher_tipo');
        if (url) {
          pushUniqueLink('Incluir Documento', url);
          return;
        }
        // Tentar documento_receber como alternativa
        url = parentCandidate.getUrlAcaoPro('documento_receber');
        if (url) {
          pushUniqueLink('Incluir Documento', url);
          return;
        }
      }
    } catch(e) {
      console.debug('[SEIPro] Erro ao usar getUrlAcaoPro:', e);
    }
    
    // Método 3: Construir URL baseada na URL atual
    try {
      var currentUrl = window.location.href || document.location.href;
      if (currentUrl && currentUrl.indexOf('/sei/') !== -1) {
        var baseUrl = currentUrl.split('/sei/')[0] + '/sei/';
        var procIdMatch = currentUrl.match(/[?&]id_procedimento=(\d+)/);
        var procId = procIdMatch ? procIdMatch[1] : null;
        
        if (procId) {
          var constructedUrl = baseUrl + 'controlador.php?acao=documento_escolher_tipo&acao_origem=arvore_visualizar&acao_retorno=arvore_visualizar&id_procedimento=' + procId + '&arvore=1';
          pushUniqueLink('Incluir Documento', constructedUrl);
          return;
        }
      }
    } catch(e) {
      console.debug('[SEIPro] Erro ao construir URL:', e);
    }
    
    console.warn('[SEIPro] Não foi possível localizar o link "Incluir Documento" nos scripts da árvore. O upload pode não funcionar corretamente.');
  }

    if (!window.arvoreDropzone && window.dropzoneInstance) {
      window.arvoreDropzone = window.dropzoneInstance;
    }

    var parentCandidate;
    try {
      parentCandidate = window.parent && window.parent.parent ? window.parent.parent : window.parent || window;
    } catch(e) {
      parentCandidate = window;
    }

    if (typeof parentCandidate.removeAcentos !== "function") {
      parentCandidate.removeAcentos = parentCandidate.removeAcentos || function(str){
        if (!str) return "";
        try { return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch(e){ return str; }
      };
    }

    if (typeof parentCandidate.getConfigValue !== "function") {
      parentCandidate.getConfigValue = parentCandidate.getConfigValue || function(){ return ""; };
    }

    if (typeof parentCandidate.checkConfigValue !== "function") {
      parentCandidate.checkConfigValue = parentCandidate.checkConfigValue || function(){ return false; };
    }

    if (typeof parentCandidate.encodeURI_toHex !== "function") {
      parentCandidate.encodeURI_toHex = parentCandidate.encodeURI_toHex || function(val){ return encodeURIComponent(val || ""); };
    }

    if (typeof parentCandidate.removeAcentos !== "function") {
      parentCandidate.removeAcentos = function(str){
        if (!str) return "";
        try { return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch(e){ return str; }
      };
    }

    if (typeof window.escapeComponent !== "function") {
      window.escapeComponent = function(val){
        return escapeComponentCompat(val);
      };
    }

    if (typeof window.getParamsUrlPro !== "function") {
      window.getParamsUrlPro = function(url){
        try {
          var out = {};
          if (!url) return out;
          var query = "";
          var hashIndex = url.indexOf('#');
          if (hashIndex >= 0) { url = url.slice(0, hashIndex); }
          var qIndex = url.indexOf('?');
          query = qIndex >= 0 ? url.slice(qIndex + 1) : url;
          query.split('&').forEach(function(part){
            if (!part) return;
            var kv = part.split('=');
            var key = decodeURIComponent((kv[0] || '').trim());
            if (!key) return;
            var val = kv.length > 1 ? decodeURIComponent(kv.slice(1).join('=')) : '';
            out[key] = val;
          });
          return out;
        } catch(e){ return {}; }
      };
    }

    if (typeof window.arrayLinksArvore === "undefined") window.arrayLinksArvore = [];
    if (typeof window.arrayLinksArvoreAll === "undefined") window.arrayLinksArvoreAll = [];
    if (typeof window.arrayIconsView === "undefined") window.arrayIconsView = [];
    if (typeof window.delayAjax === "undefined") window.delayAjax = false;

    if (typeof window.pathArvore === "undefined" || !window.pathArvore) {
      var isNew = false;
      try { isNew = !!(window.parent && window.parent.isNewSEI); } catch(e){}
      window.pathArvore = isNew ? "/infra_js/arvore/24/" : "/infra_js/arvore/";
    }

    if (typeof window.anchorDoc === "undefined" || !window.anchorDoc) {
      var isSEI5 = false;
      try { isSEI5 = !!window.isSEI_5; } catch(e){}
      window.anchorDoc = isSEI5 ? 'a[id*="anchorImg"][data-serialtip]' : 'a.clipboard[id*="anchorImg"]';
    }

    if (typeof window.encodeUrlUploadArvore !== "function") {
      window.encodeUrlUploadArvore = function(response, params) {
        var id = response[0];
        var nome = response[1];
        var dthora = response[4];
        var tamanho = response[3];
        var tamanho_formatado = typeof infraFormatarTamanhoBytes === "function" ? infraFormatarTamanhoBytes(parseInt(tamanho, 10)) : tamanho;
        var plus = '\u00B1';
        var hdnAnexos = id+plus+nome+plus+dthora+plus+tamanho+plus+tamanho_formatado+plus+(params && params.userUnidade ? params.userUnidade.user : "")+plus+(params && params.userUnidade ? params.userUnidade.unidade : "");
        hdnAnexos = (hdnAnexos.indexOf(' ') !== -1) ? hdnAnexos.replace(/ /g,'+') : hdnAnexos;
        hdnAnexos = encodeURIComponent(hdnAnexos);
        hdnAnexos = (hdnAnexos.indexOf('%C2') !== -1) ? hdnAnexos.replace(/%C2/g,'') : hdnAnexos;
        hdnAnexos = (hdnAnexos.indexOf('%2B') !== -1) ? hdnAnexos.replace(/%2B/g,'+') : hdnAnexos;
        return hdnAnexos;
      };
    }

    if (typeof window.ajaxPostUploadArvore !== "function") {
      window.ajaxPostUploadArvore = function($html, queuedFiles, mode, result, arrayDropzone, _containerUpload) {
        var urlForm = $html.find('#frmDocumentoEscolherTipo').attr('action');
        logStep('ajaxPostUploadArvore', { url: ensureHttps(urlForm), serieValue: window.__seiProSelectedSerieValue });
        var param = {};
        $html.find('#frmDocumentoEscolherTipo').find("input[type=hidden]").map(function () {
          if ( $(this).attr('name') && $(this).attr('id').indexOf('hdn') !== -1) {
            param[$(this).attr('name')] = $(this).val();
          }
        });
        var forcedSerie = window.__seiProSelectedSerieValue;
        if (forcedSerie) {
          param.hdnIdSerie = forcedSerie;
          param.selSerie = forcedSerie;
        }
        param.hdnIdSerie = param.hdnIdSerie || -1;
        $.ajax({
          method: 'POST',
          data: param,
          url: urlForm,
          contentType: 'application/x-www-form-urlencoded; charset=ISO-8859-1'
        }).done(function (htmlAnexo) {
          recordHtmlSnapshot('documento_receber-post-' + describeUrlContext(urlForm), htmlAnexo, { step: 'ajaxPostUploadArvore', url: urlForm });
          window.__seiProSelectedSerieValue = null;
          window.submitUploadArvore(htmlAnexo, queuedFiles, mode, result, arrayDropzone, _containerUpload);
        }).fail(function(err){
          console.error('[SEIPro] ajaxPostUploadArvore falhou', err);
          window.__seiProSelectedSerieValue = null;
          queueFallback(queuedFiles);
        });
      };
    }

    if (typeof window.ajaxGetUploadArvore !== "function") {
      window.ajaxGetUploadArvore = function(urlDocExterno, queuedFiles, mode, result, arrayDropzone, _containerUpload) {
        console.debug('[SEIPro] ajaxGetUploadArvore', urlDocExterno);
        logStep('ajaxGetUploadArvore', { url: ensureHttps(urlDocExterno) });
        requestHTMLWithHttps(urlDocExterno).then(function (htmlAnexo) {
          recordHtmlSnapshot('documento_receber-get-' + describeUrlContext(urlDocExterno), htmlAnexo, { step: 'ajaxGetUploadArvore', url: urlDocExterno });
          window.submitUploadArvore(htmlAnexo, queuedFiles, mode, result, arrayDropzone, _containerUpload);
        }).catch(function(err){
          console.error('[SEIPro] ajaxGetUploadArvore falhou', err);
          queueFallback(queuedFiles);
        });
      };
    }

    if (typeof window.submitUploadArvore !== "function") {
      window.submitUploadArvore = function(htmlAnexo, queuedFiles, mode, result, arrayDropzone, _containerUpload) {
        var $htmlAnexo = $(htmlAnexo);
        var form = $htmlAnexo.find('#frmDocumentoCadastro');
        var uploadForm = $htmlAnexo.find('#frmAnexos');
        var fallback = window.__seiProArvoreFallbackSelector || fallbackSelector;
        var containerUploadJq = _containerUpload ? $(_containerUpload) : $(fallback);
        console.debug('[SEIPro] submitUploadArvore form encontrado?', form.length);
        if (!form.length) {
          console.warn('[SEIPro] submitUploadArvore: formulário #frmDocumentoCadastro não encontrado.');
          queueFallback(queuedFiles);
          return;
        }
        var hrefFormRaw = form.attr('action');
        var hrefForm = ensureHttps(hrefFormRaw);
        recordHtmlSnapshot('documento_receber-form-' + describeUrlContext(hrefForm || hrefFormRaw), htmlAnexo, { step: 'submitUploadArvore', url: hrefForm || hrefFormRaw });

        var continueWithIdentifier = function(uploadIdentifier, identifierInfo){
          logStep('submitUploadArvore:forms', {
            action: hrefForm,
            uploadForm: uploadForm.length,
            uploadIdentifier: uploadIdentifier,
            identifierSource: identifierInfo ? identifierInfo.source : null,
            iframeUrl: identifierInfo ? identifierInfo.iframeUrl || null : null
          });
          var urlUpload = '';
          var extUpload = [];
          var userUnidade = '';
          $.each(htmlAnexo.split('\n'), function(index, value) {
            if (value.indexOf("objUpload = new infraUpload") !== -1) {
              var parsedUpload = value.split("'")[3];
              urlUpload = ensureHttps(parsedUpload, hrefForm);
            }
            if (value.indexOf("arrExt") !== -1) {
              if (typeof value.split('"')[1] !== 'undefined') {
                var extValue = '.'+value.split('"')[1];
                extUpload.push(extValue);
              }
            }
            if (value.indexOf("objTabelaAnexos.adicionar") !== -1) {
              var regex = /\s*objTabelaAnexos\.adicionar\(\[arr\['nome_upload'\],arr\['nome'\],arr\['data_hora'\],arr\['tamanho'],infraFormatarTamanhoBytes\(arr\['tamanho'\]\),'(.+?)' ,'(.+?)']\);/gm;
              var paramV = regex.exec(value);
              if (paramV !== null) {
                userUnidade = {user: paramV[1], unidade: paramV[2]};
              }
            }
          });
          if (!urlUpload) {
            console.warn('[SEIPro] submitUploadArvore: urlUpload não encontrado, abortando.');
            queueFallback(queuedFiles);
            return;
          }
          var param = {};
          form.find("input[type=hidden]").each(function () {
            if ($(this).attr('name') && $(this).attr('id').indexOf('hdn') !== -1) {
              param[$(this).attr('name')] = $(this).val();
            }
          });
          form.find('input[type=text]').each(function () {
            if ($(this).attr('id') && $(this).attr('id').indexOf('txt') !== -1) {
              param[$(this).attr('id')] = $(this).val();
            }
          });
          form.find('select').each(function () {
            if ($(this).attr('id') && $(this).attr('id').indexOf('sel') !== -1) {
              param[$(this).attr('id')] = $(this).val();
            }
          });
          form.find('input[type=radio]').each(function () {
            if ($(this).attr('name') && $(this).attr('name').indexOf('rdo') !== -1 && $(this).is(':checked')) {
              param[$(this).attr('name')] = $(this).val();
            }
          });

          if (extUpload.length > 0 && arrayDropzone) {
            arrayDropzone.options.acceptedFiles = extUpload.join(',');
            try {
              parentCandidate.localStorageStorePro && parentCandidate.localStorageStorePro('arvoreDropzone_acceptedFiles', extUpload.join(','));
            } catch(e){}
          }

          var Moment = window.moment;
          var nextFileQueued = queuedFiles[0];
          var txtDataElaboracao = (typeof nextFileQueued !== 'undefined' && typeof nextFileQueued.lastModifiedDate !== 'undefined' && Moment)
            ? Moment(nextFileQueued.lastModifiedDate).format('DD/MM/YYYY')
            : (Moment ? Moment().format('DD/MM/YYYY') : new Date().toLocaleDateString('pt-BR'));

          var nameFile = nextFileQueued ? nextFileQueued.name : '';
          var removeAcentosFn = function(str){ return parentCandidate.removeAcentos ? parentCandidate.removeAcentos(str) : str; };
          var getConfigValue = function(key){ return parentCandidate.getConfigValue ? parentCandidate.getConfigValue(key) : ''; };
          var checkConfigValue = function(key){ return parentCandidate.checkConfigValue ? parentCandidate.checkConfigValue(key) : false; };

          var nameFile_reg = removeAcentosFn(nameFile.trim().toLowerCase().replace(/_|:/g, ' '));
          var tipoDoc = [];
          var valueSerie = false;
          form.find('#selSerie option').each(function () {
            if ($(this).text().trim() !== '') {
              var nameOption = $(this).text().trim().toLowerCase().replace(/_|:/g, ' ');
              var nameOptionReg = removeAcentosFn(nameOption);
              var reg = new RegExp('^\\b'+nameOptionReg, 'igm');
              tipoDoc.push({name: nameOption, value: $(this).val()});
              if (reg.test(nameFile_reg)) {
                valueSerie = $(this).val();
                return false;
              }
            }
          });

          var selSerieDefault = checkConfigValue('newdocname')
            ? tipoDoc.filter(function(value){ return value.name == removeAcentosFn(getConfigValue('newdocname').trim().toLowerCase().replace(/_|:/g, ' ')); })[0]
            : tipoDoc.filter(function(value){ return value.name == 'anexo'; })[0];
          selSerieDefault = (typeof selSerieDefault !== 'undefined') ? selSerieDefault : tipoDoc.filter(function(value){ return value.name.indexOf('anexo') !== -1; })[0];
          selSerieDefault = (typeof selSerieDefault === 'undefined') ? tipoDoc[0] : selSerieDefault;

          var selSerie = (valueSerie) ? valueSerie : (selSerieDefault ? selSerieDefault.value : '');
          var selSerieSelected = tipoDoc.filter(function(value){ return value.value == valueSerie; })[0];
          selSerieSelected = (typeof selSerieSelected !== 'undefined') ? selSerieSelected : selSerieDefault;

          var regName = selSerieSelected ? new RegExp('^\\b'+selSerieSelected.name, 'igm') : null;
          var processedNameFile = nameFile;
          if (regName && regName.test(processedNameFile)) { processedNameFile = processedNameFile.replace(regName, '').trim(); }
          if (processedNameFile.indexOf('.') !== -1) {
            processedNameFile = processedNameFile.substring(0, processedNameFile.lastIndexOf('.'));
          }
          if (processedNameFile.length > 50) processedNameFile = processedNameFile.replace(/^(.{50}[^\s]*).*/, "$1");
          if (processedNameFile.length > 50) processedNameFile = processedNameFile.substring(0, 49);

          var valueSigilo = getConfigValue('newdocsigilo');
          valueSigilo = (valueSigilo && valueSigilo.indexOf('|') !== -1) ? valueSigilo.split('|') : false;

          var valueNivelAcesso = checkConfigValue('newdocnivel') ? "0" : (valueSigilo ? valueSigilo[1] : "0");

          param.selSerie = selSerie;
          param.hdnIdSerie = selSerie;
          param.rdoNivelAcesso = (form.find('input[name="rdoNivelAcesso"]:checked').length > 0)
            ? form.find('input[name="rdoNivelAcesso"]:checked').val()
            : valueNivelAcesso;
          param.hdnStaNivelAcessoLocal = param.rdoNivelAcesso;
          var newdocformat = getConfigValue('newdocformat');
          param.rdoFormato = (checkConfigValue('newdocformat') && newdocformat && newdocformat.indexOf('digitalizado') !== -1) ? "D" : "N";
          param.hdnFlagDocumentoCadastro = "2";
          param.hdnIdHipoteseLegal = (valueSigilo) ? valueSigilo[0] : param.selHipoteseLegal;
          param.selHipoteseLegal = param.hdnIdHipoteseLegal;
          param.selTipoConferencia = (checkConfigValue('newdocformat') && newdocformat && newdocformat.indexOf('digitalizado') !== -1 && newdocformat.indexOf('_') !== -1) ? newdocformat.split('_')[1] : "";
          param.hdnIdTipoConferencia = param.selTipoConferencia;
          param.txaObservacoes = "";
          param.txtDataElaboracao = txtDataElaboracao;
          param.txtNumero = escapeComponentCompat(processedNameFile);

          var contextUpload = {
            hrefForm: hrefForm,
            urlUpload: urlUpload,
            userUnidade: userUnidade,
            baseParams: Object.assign({}, param),
            selSerie: selSerie,
            processedNameFile: processedNameFile,
            uploadIdentifier: uploadIdentifier,
            identifierSource: identifierInfo ? identifierInfo.source : null
          };
          param.hdnFlagDocumentoCadastro = "1";
          logStep('upload:postDocumentoReceber', { href: hrefForm, paramsKeys: Object.keys(param), uploadIdentifier: uploadIdentifier });
          $.ajax({
            method: 'POST',
            data: param,
            url: hrefForm,
            contentType: 'application/x-www-form-urlencoded; charset=ISO-8859-1'
          }).done(function(htmlPrepared){
            recordHtmlSnapshot('documento_receber-post-' + describeUrlContext(hrefForm), htmlPrepared, { step: 'submitUploadArvore:post', url: hrefForm });
            configureDropzoneAfterPost(htmlPrepared, queuedFiles, mode, result, arrayDropzone, containerUploadJq, contextUpload);
          }).fail(function(jqXHR, textStatus, errorThrown){
            logStep('upload:postDocumentoReceber:error', { status: jqXHR && jqXHR.status, statusText: textStatus, error: errorThrown || null });
            queueFallback(queuedFiles);
          });
        };

        resolveUploadIdentifier($htmlAnexo, htmlAnexo, hrefForm).then(function(identifierInfo){
          var resolvedIdentifier = identifierInfo && identifierInfo.value ? identifierInfo.value : '';
          resolvedIdentifier = (resolvedIdentifier === null || typeof resolvedIdentifier === 'undefined') ? '' : String(resolvedIdentifier).trim();
          if (!resolvedIdentifier) {
            resolvedIdentifier = generateUploadIdentifier();
          }
          if (uploadForm && uploadForm.length) {
            if (!uploadForm.find('input[name="UPLOAD_IDENTIFIER"]').length) {
              uploadForm.append('<input type="hidden" name="UPLOAD_IDENTIFIER" value="'+resolvedIdentifier+'" />');
            } else {
              uploadForm.find('input[name="UPLOAD_IDENTIFIER"]').val(resolvedIdentifier);
            }
          }
          continueWithIdentifier(resolvedIdentifier, identifierInfo);
        }).catch(function(err){
          console.error('[SEIPro] submitUploadArvore: falha ao resolver UPLOAD_IDENTIFIER', err);
          queueFallback(queuedFiles);
        });
        return;
      };
    }

    /**
     * Função principal de upload - Ponto de entrada do fluxo
     * mode: 'upload' = iniciar upload | 'save' = salvar documento após upload
     */
    if (typeof window.sendUploadArvore !== "function") {
      window.sendUploadArvore = function(mode, result, arrayDropzone, _containerUpload) {
        logStep('sendUploadArvore:inicio', { mode: mode, hasResult: !!result });
        
        var isInternalUpload = (mode === 'upload' && result === false);
        if (mode === 'upload' && !window[MANUAL_UPLOAD_TRIGGER_FLAG] && !isInternalUpload) {
          console.debug('[SEIPro] Aguardando clique manual do usuário');
          return;
        }
        
        var fallback = window.__seiProArvoreFallbackSelector || fallbackSelector;
        var $container = _containerUpload ? $(_containerUpload) : $(fallback);
        var dzInstance = arrayDropzone || window.arvoreDropzone;
        if (!dzInstance && window.dropzoneInstance) dzInstance = window.dropzoneInstance;
        
        if (!dzInstance) {
          console.warn('[SEIPro] Dropzone não detectada');
          return;
        }

        ensureLinksArvore();

        var queuedFiles = [];
        if (dzInstance) {
          if (typeof dzInstance.getFilesWithStatus === 'function' && window.Dropzone && typeof window.Dropzone.QUEUED !== 'undefined') {
            queuedFiles = dzInstance.getFilesWithStatus(window.Dropzone.QUEUED);
          } else if (typeof dzInstance.getQueuedFiles === 'function') {
            queuedFiles = dzInstance.getQueuedFiles();
          } else if (dzInstance.files) {
            queuedFiles = dzInstance.files.filter(function(file){ return file && typeof file.status === 'string' && file.status.toLowerCase() === 'queued'; });
          }
        }
        if (dzInstance && dzInstance.files) {
          try {
            console.debug('[SEIPro] Dropzone files snapshot', dzInstance.files.map(function(file){
              return {
                name: file && file.name,
                status: file && file.status,
                accepted: file && file.accepted,
                queued: file && typeof file.status === 'string' && file.status.toLowerCase() === 'queued'
              };
            }));
          } catch(e) {}
        }
        var hasQueued = queuedFiles && queuedFiles.length;
        if (mode === 'upload' && !hasQueued) {
          window[MANUAL_UPLOAD_TRIGGER_FLAG] = false;
        }
        console.debug('[SEIPro] sendUploadArvore arquivos na fila (QUEUED)', hasQueued ? queuedFiles.length : 0);
        if (!hasQueued && dzInstance && dzInstance.files && dzInstance.files.length) {
          try {
            console.debug('[SEIPro] sendUploadArvore status dos arquivos', dzInstance.files.map(function(f){ return { name: f.name, status: f.status }; }));
            if (window.Dropzone) {
              var added = typeof window.Dropzone.ADDED !== 'undefined'
                ? window.Dropzone.ADDED
                : (dzInstance.ADDED || 'added');
              var queuedConst = typeof window.Dropzone.QUEUED !== 'undefined'
                ? window.Dropzone.QUEUED
                : (dzInstance.QUEUED || 'queued');
              if (typeof dzInstance.getFilesWithStatus === 'function') {
                var addedFiles = dzInstance.getFilesWithStatus(added);
                if (addedFiles && addedFiles.length && typeof dzInstance.enqueueFiles === 'function') {
                  dzInstance.enqueueFiles(addedFiles);
                } else if (addedFiles && addedFiles.length && typeof dzInstance.enqueueFile === 'function') {
                  addedFiles.forEach(function(file){ dzInstance.enqueueFile(file); });
                }
                queuedFiles = dzInstance.getFilesWithStatus(queuedConst);
              } else {
                dzInstance.files.forEach(function(file){
                  if (file && typeof file.status === 'string' && file.status.toLowerCase() === 'added' && typeof dzInstance.enqueueFile === 'function') {
                    dzInstance.enqueueFile(file);
                  }
                });
                queuedFiles = dzInstance.files.filter(function(file){ return file && typeof file.status === 'string' && file.status.toLowerCase() === 'queued'; });
              }
            }
            hasQueued = queuedFiles && queuedFiles.length;
            console.debug('[SEIPro] sendUploadArvore após enqueue, fila', hasQueued ? queuedFiles.length : 0);
          } catch(e) {
            console.warn('[SEIPro] sendUploadArvore falha ao alinhar fila Dropzone', e);
          }
        }
        // ====================================================================
        // MODO: UPLOAD - Iniciar processo de upload de arquivos
        // ====================================================================
        if (mode === 'upload' && hasQueued) {
          window[MANUAL_UPLOAD_TRIGGER_FLAG] = false;
          
          // Obter URL do link "Incluir Documento"
          var href = null;
          if (Array.isArray(window.arrayLinksArvore) && window.arrayLinksArvore.length) {
            for (var i = 0; i < window.arrayLinksArvore.length; i++) {
              if (window.arrayLinksArvore[i] && window.arrayLinksArvore[i].name === 'Incluir Documento') {
                href = window.arrayLinksArvore[i].url;
                break;
              }
            }
          }
          
          if (!href && typeof parentCandidate.getUrlAcaoPro === 'function') {
            href = parentCandidate.getUrlAcaoPro('documento_receber');
          }
          
          if (!href) {
            var includeLink = document.querySelector('a[href*="controlador.php?acao=documento_receber"]');
            if (includeLink) href = includeLink.getAttribute('href');
          }
          
          href = ensureHttps(href);
          
          // Validar URL
          try {
            var loc = window.location;
            var parsed = href ? new URL(href, loc ? loc.origin : undefined) : null;
            if (!parsed || parsed.hostname !== (loc && loc.hostname) || /sip\/login\.php/i.test(parsed.pathname)) {
              console.warn('[SEIPro] Link documento_receber inválido:', href);
              href = null;
            } else {
              href = parsed.toString();
            }
          } catch(e){ 
            href = null; 
          }
          
          if (!href) {
            var elem = $container.find('.dz-preview').eq(0);
            if (elem.length) {
              elem.addClass('dz-error').find('.dz-error-message span')
                .text('Link para documento não encontrado ou processo indisponível.');
            }
            queueFallback(queuedFiles);
            return;
          }
          
          logStep('FLUXO:inicio_upload', { url: href, arquivos: queuedFiles.length });
          
          // INICIAR ETAPA 1: Escolher tipo de documento
          try {
            UploadFlowManager.executarEtapa1_EscolherTipo(href, queuedFiles, dzInstance, $container)
              .then(function() {
                console.log('[SEIPro] ✓ Upload concluído');
              })
              .catch(function(err) {
                console.error('[SEIPro] ✗ Erro no upload:', err);
              });
            } catch(e) {
            console.error('[SEIPro] ✗ Exceção:', e);
            queueFallback(queuedFiles);
          }
          
        } else if (mode === 'save' && result) {
          // ====================================================================
          // MODO: SAVE - Salvar documento após upload do arquivo
          // ====================================================================
          logStep('FLUXO:salvar_documento', { url: result && result.urlForm });
          
          // Delegar para ETAPA 6 do UploadFlowManager
          UploadFlowManager.executarEtapa6_SalvarDocumento(result, dzInstance, $container);
        }
        
        logStep('sendUploadArvore:fim', { mode: mode });
      };
      window.sendUploadArvore.__seiProArvorePolyfill = true;
    }

    if (typeof window.getInfoArvoreLastDoc !== "function") {
      window.getInfoArvoreLastDoc = function(dataResult, urlParent, arrayDropzone, _containerUpload) {
        var fallback = window.__seiProArvoreFallbackSelector || fallbackSelector;
        var $container = _containerUpload ? $(_containerUpload) : $(fallback);
        var indexUpload = (typeof $container.data('index') !== 'undefined') ? parseInt($container.data('index'), 10) : 0;
        var paramsUrl = window.getParamsUrlPro ? window.getParamsUrlPro(urlParent) : {};
        var queuedFiles = (typeof arrayDropzone.getQueuedFiles === 'function') ? arrayDropzone.getQueuedFiles() : [];

        $.each(dataResult.split('\n'), function(index, value) {
          if (value.indexOf("atualizarArvore('") !== -1 || value.indexOf("var linkMontarArvoreProcessoDocumento") !== -1) {
            var urlArvore = value.split("'")[1];
            $.ajax({ url: urlArvore }).done(function (htmlArvore) {
              var arrayArvore = [];
              $.each(htmlArvore.split('\n'), function(i2, line) {
                if (line.indexOf('new infraArvoreNo("DOCUMENTO","'+paramsUrl.id_documento+'","'+paramsUrl.id_procedimento+'"') !== -1) {
                  arrayArvore = line.split('"');
                  return false;
                }
              });
              var elem = $container.find('.dz-preview').eq(indexUpload);
              if (elem.length && arrayArvore.length > 0) {
                elem.find('a[target]').attr('href', arrayArvore[7]).attr('id', 'anchor'+paramsUrl.id_documento)
                  .find('span').text(arrayArvore[11]).attr('span'+paramsUrl.id_documento);
                elem.find('a#anchorImgID').attr('id', 'anchorImg'+paramsUrl.id_documento)
                  .find('img').attr('src', arrayArvore[15]).attr('id', 'icon'+paramsUrl.id_documento);
              }
              $container.data('index', indexUpload + 1);
        if (queuedFiles.length === 0) {
          if (typeof window.dropzoneAlertBoxInfo === 'function') window.dropzoneAlertBoxInfo();
          if (queuedFiles.__sei_diagnostics__) {
            console.warn('SEIProArvore fallback diagnostic:', queuedFiles.__sei_diagnostics__);
            alertDiagnostic(queuedFiles.__sei_diagnostics__);
          }
        }
            });
            return false;
          }
        });
      };
    }

    function resolveContainerUploadElement(){
      var fallback = window.__seiProArvoreFallbackSelector || fallbackSelector;
      var target = null;
      try {
        if (typeof containerUpload !== 'undefined') {
          target = containerUpload;
        }
      } catch(e) {}
      try {
        if (!target && window.arvoreDropzone && window.arvoreDropzone.element) {
          target = window.arvoreDropzone.element;
        }
      } catch(e) {}
      return target ? $(target) : $(fallback);
    }

    function extractNrSeiFromName(nameDoc){
      if (!nameDoc || typeof nameDoc !== 'string') return '';
      var normalized = nameDoc.replace(/[_:]/g, ' ');
      var match = normalized.match(/\d{5,}/);
      if (match && match[0]) return match[0];
      if (typeof parentCandidate.getNrSei === 'function') {
        try { return parentCandidate.getNrSei(nameDoc); } catch(e){}
      }
      return normalized.trim();
    }

    if (typeof window.getDuplicateDoc !== "function") {
      window.getDuplicateDoc = function(nameDoc, paramDoc, newproc, openEditor, callback, callback_error) {
        nameDoc = typeof nameDoc === 'string' ? nameDoc : '';
        paramDoc = paramDoc && typeof paramDoc === 'object' ? paramDoc : {};
        var shouldOpenEditor = (typeof openEditor === 'undefined') ? true : !!openEditor;
        var onSuccess = (typeof callback === 'function') ? callback : null;
        var onError = (typeof callback_error === 'function') ? callback_error : null;

        if (newproc) {
          var arrayCurrentCloneDoc = {
            nameDoc: nameDoc,
            paramDoc: paramDoc || false
          };
          if (typeof setOptionsPro === 'function') {
            try { setOptionsPro('currentCloneDoc', arrayCurrentCloneDoc); } catch(e){}
          }
          try {
            if (parentCandidate && typeof parentCandidate.loadingButtonConfirm === 'function') {
              parentCandidate.loadingButtonConfirm(false);
            }
          } catch(e){}
          try {
            if (parentCandidate && typeof parentCandidate.resetDialogBoxPro === 'function') {
              parentCandidate.resetDialogBoxPro('dialogBoxPro');
            }
          } catch(e){}

          var newPage = (typeof url_host !== 'undefined' ? url_host : '') + '?acao=procedimento_trabalhar&id_procedimento=' + newproc + '#&acao_pro=duplicar_documento';
          var win = window.open(newPage, '_blank');
          if (win && typeof win.focus === 'function') {
            win.focus();
          } else {
            window.alert('Por favor, permita popups para essa página');
          }
          return;
        }

        var itemSelected = false;
        if (!nameDoc) {
          openAlertDuplicateDoc('Erro ao encontrar o documento de modelo');
          return;
        }

        var nrSei = extractNrSeiFromName(nameDoc);
        var href = null;
        try {
          if (parentCandidate && parentCandidate.jmespath && typeof parentCandidate.jmespath.search === 'function') {
            href = parentCandidate.jmespath.search(window.arrayLinksArvore, "[?name=='Incluir Documento'].url | [0]");
          } else if (typeof parent !== 'undefined' && parent !== null && parent.jmespath && typeof parent.jmespath.search === 'function') {
            href = parent.jmespath.search(window.arrayLinksArvore, "[?name=='Incluir Documento'].url | [0]");
          }
        } catch(e) {}
        if (!href && Array.isArray(window.arrayLinksArvore)) {
          for (var i = 0; i < window.arrayLinksArvore.length; i++) {
            if (window.arrayLinksArvore[i] && window.arrayLinksArvore[i].name === 'Incluir Documento') {
              href = window.arrayLinksArvore[i].url;
              break;
            }
          }
        }

        if (!href) {
          openAlertDuplicateDoc('Erro ao localizar o link de inserir documento. Verifique se o processo encontra-se aberto em sua unidade!');
          return;
        }

        href = ensureHttps(href);
        $.ajax({ url: href }).done(function(html){
          var $html = $(html);
          var $rows = $html.find('#tblSeries tbody tr');
          if (!$rows.length) {
            openAlertDuplicateDoc('Erro ao selecionar o tipo de documento');
            return;
          }

          $rows.each(function(){
            var $row = $(this);
            var text = ($row.data('desc') || '').toString().trim();
            if (!text) return;
            var value = $row.find('input').val();
            var urlDoc = $row.find('a.ancoraOpcao').attr('href');
            var checkPostEl = $html.find('#tblSeries').find('a.ancoraOpcao').attr('href');
            var checkPost = (typeof checkPostEl !== 'undefined' && checkPostEl === '#');
            var nameOption = escapeRegExp(text.replace(/_|:/g, ' '));
            var normalizedDoc = nameDoc.replace(/_|:/g, ' ');
            var reg = new RegExp('^\\b' + nameOption, 'igm');
            var docNameNormalized = normalizedDoc;
            try {
              if (parentCandidate && typeof parentCandidate.removeAcentos === 'function') {
                docNameNormalized = parentCandidate.removeAcentos(docNameNormalized.trim().toLowerCase());
              } else {
                docNameNormalized = docNameNormalized.trim().toLowerCase();
              }
            } catch(e) {
              docNameNormalized = docNameNormalized.trim().toLowerCase();
            }
            var optionNormalized = text;
            try {
              if (parentCandidate && typeof parentCandidate.removeAcentos === 'function') {
                optionNormalized = parentCandidate.removeAcentos(text.toLowerCase());
              } else {
                optionNormalized = text.toLowerCase();
              }
            } catch(e) {
              optionNormalized = text.toLowerCase();
            }
            if (!reg.test(docNameNormalized)) return;
            if (typeof urlDoc === 'undefined' || optionNormalized === 'externo') return;
            itemSelected = true;
            if (checkPost) {
              window.ajaxPostDuplicateArvore($html, value, nrSei, paramDoc, shouldOpenEditor, onSuccess, onError);
            } else {
              window.ajaxGetDuplicateArvore(urlDoc, nrSei, paramDoc, shouldOpenEditor, onSuccess, onError);
            }
            return false;
          });

          if (!itemSelected) {
            openAlertDuplicateDoc('Erro ao selecionar o tipo de documento');
          }
        }).fail(function(){
          openAlertDuplicateDoc('Erro ao acessar o formulário de duplicação');
        });
      };
    }

    if (typeof window.ajaxPostDuplicateArvore !== "function") {
      window.ajaxPostDuplicateArvore = function($html, value, nr_sei, paramDoc, openEditor, callback, callback_error) {
        if (!$html || typeof $html.find !== 'function') {
          if (typeof callback_error === 'function') callback_error();
          return;
        }
        var urlForm = ensureHttps($html.find('#frmDocumentoEscolherTipo').attr('action'));
        var param = {};
        $html.find('#frmDocumentoEscolherTipo').find('input[type=hidden]').each(function(){
          var $input = $(this);
          var name = $input.attr('name');
          var id = $input.attr('id') || '';
          if (name && id.indexOf('hdn') !== -1) {
            param[name] = $input.val();
          }
        });
        param.hdnIdSerie = value;
        $.ajax({
          method: 'POST',
          data: param,
          url: urlForm
        }).done(function(htmlDoc){
          window.saveDuplicateArvore(htmlDoc, nr_sei, paramDoc, openEditor, callback, callback_error);
        }).fail(function(){
          if (typeof callback_error === 'function') callback_error();
          openAlertDuplicateDoc('Erro ao preparar duplicação do documento');
        });
      };
    }

    if (typeof window.ajaxGetDuplicateArvore !== "function") {
      window.ajaxGetDuplicateArvore = function(urlDoc, nr_sei, paramDoc, openEditor, callback, callback_error) {
        var url = ensureHttps(urlDoc);
        $.ajax({ url: url }).done(function(htmlDoc){
          window.saveDuplicateArvore(htmlDoc, nr_sei, paramDoc, openEditor, callback, callback_error);
        }).fail(function(){
          if (typeof callback_error === 'function') callback_error();
          openAlertDuplicateDoc('Erro ao obter formulário de duplicação do documento');
        });
      };
    }

    if (typeof window.saveDuplicateArvore !== "function") {
      window.saveDuplicateArvore = function(htmlDoc, nr_sei, paramDoc, openEditor, callback, callback_error) {
        var $htmlDoc = $(htmlDoc || '');
        var form = $htmlDoc.find('#frmDocumentoCadastro');
        if (!form.length) {
          if (typeof callback_error === 'function') callback_error();
          openAlertDuplicateDoc('Formulário de duplicação não encontrado');
          return;
        }
        var hrefForm = ensureHttps(form.attr('action'));
        var param = {};
        form.find('input[type=hidden]').each(function(){
          var $input = $(this);
          var name = $input.attr('name');
          var id = $input.attr('id') || '';
          if (name && id.indexOf('hdn') !== -1) {
            param[name] = $input.val();
          }
        });
        form.find('input[type=text]').each(function(){
          var $input = $(this);
          var id = $input.attr('id') || '';
          if (id.indexOf('txt') !== -1) {
            param[id] = $input.val();
          }
        });
        form.find('select').each(function(){
          var $select = $(this);
          var id = $select.attr('id') || '';
          if (id.indexOf('sel') !== -1) {
            param[id] = $select.val();
          }
        });
        form.find('input[type=radio]').each(function(){
          var $radio = $(this);
          var name = $radio.attr('name') || '';
          if (name.indexOf('rdo') !== -1 && $radio.is(':checked')) {
            param[name] = $radio.val();
          }
        });
        param.selTextoPadrao = '0';
        param.hdnFlagDocumentoCadastro = '2';
        param.rdoTextoInicial = 'D';
        param.selTextoPadrao = null;
        param.txtProtocoloDocumentoTextoBase = nr_sei;
        if (paramDoc && typeof paramDoc === 'object') {
          if (typeof paramDoc.selAssuntos !== 'undefined') param.selAssuntos = paramDoc.selAssuntos;
          if (typeof paramDoc.hdnAssuntos !== 'undefined') param.hdnAssuntos = paramDoc.hdnAssuntos;
          if (typeof paramDoc.selInteressados !== 'undefined') param.selInteressados = paramDoc.selInteressados;
          if (typeof paramDoc.hdnInteressados !== 'undefined') param.hdnInteressados = paramDoc.hdnInteressados;
          if (typeof paramDoc.txtNumero !== 'undefined' && parentCandidate && typeof parentCandidate.isNumeric === 'function' && !parentCandidate.isNumeric(paramDoc.txtNumero)) {
            param.txtNumero = paramDoc.txtNumero;
          }
          if (typeof paramDoc.txtDescricao !== 'undefined') param.txtDescricao = paramDoc.txtDescricao;
          if (typeof paramDoc.txaObservacoes !== 'undefined') param.txaObservacoes = paramDoc.txaObservacoes;
          if (typeof paramDoc.rdoNivelAcesso !== 'undefined') param.rdoNivelAcesso = paramDoc.rdoNivelAcesso;
          if (typeof paramDoc.selHipoteseLegal !== 'undefined') param.selHipoteseLegal = paramDoc.selHipoteseLegal;
        }

        var postData = '';
        for (var k in param) {
          if (!Object.prototype.hasOwnProperty.call(param, k)) continue;
          if (postData !== '') postData += '&';
          var valor = (k === 'hdnAssuntos' || k === 'hdnInteressados') ? (param[k] || '') : window.escapeComponent(param[k]);
          if (k === 'txtDescricao') {
            try {
              var normalizedDescricao = (param[k] || '').normalize('NFC');
              valor = parentCandidate.encodeURI_toHex ? parentCandidate.encodeURI_toHex(normalizedDescricao) : window.escapeComponent(normalizedDescricao);
            } catch(e) {
              valor = window.escapeComponent(param[k]);
            }
          }
          if (k === 'txtNumero') {
            valor = window.escapeComponent(param[k]);
          }
          postData += k + '=' + (typeof valor === 'undefined' ? '' : valor);
        }

        var xhr = new XMLHttpRequest();
        $.ajax({
          method: 'POST',
          data: postData,
          url: hrefForm,
          contentType: 'application/x-www-form-urlencoded; charset=ISO-8859-1',
          xhr: function(){ return xhr; }
        }).done(function(htmlResult){
          var responseUrl = xhr.responseURL || hrefForm;
          var status = responseUrl && responseUrl.indexOf('controlador.php?acao=arvore_visualizar&acao_origem=documento_gerar') !== -1;
          var class_icon = '';
          var text_icon = '';
          if (status) {
            class_icon = 'fas fa-check verdeColor';
            text_icon = 'Documento duplicado com sucesso!';
            var $htmlResult = $(htmlResult || '');
            var urlReload = null;
            var urlEditor = [];
            var idUser = false;
            $.each(($htmlResult.text() || '').split('\n'), function(i, v){
              if (v.indexOf('var linkMontarArvoreProcessoDocumento') !== -1) {
                urlReload = v.split("'")[1];
              }
              if (v.indexOf("atualizarArvore('") !== -1) {
                urlReload = v.split("'")[1];
              }
              if (v.indexOf('acao=editor_montar') !== -1) {
                urlEditor.push(v.split("'")[1]);
              }
              if (v.indexOf('iniciarEditor(') !== -1) {
                idUser = v.split("'")[1];
              }
              if (v.indexOf('janelaEditor_') !== -1) {
                idUser = v.split('_')[1];
              }
            });
            if (urlEditor.length > 0 && idUser && openEditor) {
              try {
                if (parentCandidate && typeof parentCandidate.openWindowEditor === 'function') {
                  parentCandidate.openWindowEditor(urlEditor[0], idUser);
                }
              } catch(e){}
            }
            if (openEditor) {
              if (urlReload) {
                window.location.href = urlReload;
              } else {
                window.location.reload();
              }
            }
            if (typeof callback === 'function') callback();
          } else {
            class_icon = 'fas fa-exclamation-circle vermelhoColor';
            text_icon = 'Erro ao duplicar o documento';
            if (typeof callback_error === 'function') callback_error();
          }
          if (class_icon) {
            var $container = resolveContainerUploadElement();
            var $loading = $container.find('.loading-action-doc');
            if ($loading.length) {
              $loading
                .attr('onmouseover', "return infraTooltipMostrar('"+text_icon+"');")
                .attr('onmouseout', 'return infraTooltipOcultar();')
                .find('i').attr('class', class_icon);
            } else if (parentCandidate && typeof parentCandidate.alertaBoxPro === 'function') {
              parentCandidate.alertaBoxPro(status ? 'Sucesso' : 'Error', status ? 'check-circle' : 'exclamation-triangle', text_icon);
            } else {
              window.alert(text_icon);
            }
          }
        }).fail(function(){
          if (typeof callback_error === 'function') callback_error();
          openAlertDuplicateDoc('Erro ao duplicar o documento');
        });
      };
    }

    if (typeof window.openAlertDuplicateDoc !== "function") {
      window.openAlertDuplicateDoc = function(textAlert) {
        var message = textAlert || 'Erro ao duplicar documento';
        var $container = resolveContainerUploadElement();
        var $loading = $container.find('.loading-action-doc');
        if ($loading.length) {
          $loading
            .attr('onmouseover', "return infraTooltipMostrar('"+message+"');")
            .attr('onmouseout', 'return infraTooltipOcultar();')
            .find('i').attr('class', 'fas fa-exclamation-circle vermelhoColor');
        } else if (parentCandidate && typeof parentCandidate.alertaBoxPro === 'function') {
          parentCandidate.alertaBoxPro('Error', 'exclamation-triangle', message);
        } else {
          window.alert(message);
        }
      };
    }

    if (typeof window.dropzoneAlertBoxInfo !== "function") {
      window.dropzoneAlertBoxInfo = function() {
        var instance = window.arvoreDropzone || window.dropzoneInstance;
        if (!instance || typeof instance.getAcceptedFiles !== 'function') return;
        var accepted = instance.getAcceptedFiles();
        var rejected = instance.getRejectedFiles ? instance.getRejectedFiles() : [];
        if (accepted.length > 0) {
          var message = accepted.length + ' ' + (accepted.length === 1 ? 'arquivo enviado com sucesso!' : 'arquivos enviados com sucesso!');
          try { window.alert(message); } catch(e) { console.log(message); }
        }
        if (rejected.length > 0) {
          try { window.alert('Alguns arquivos foram rejeitados pelo SEI.'); } catch(e) { console.log('Arquivos rejeitados', rejected); }
        }
      };
    }
  }

  function resolveFromCurrentScript() {
    try {
      var cs = document.currentScript;
      if (cs && cs.src) {
        return new URL('lib/dropzone.min.js', cs.src).toString();
      }
    } catch(e){}
    return null;
  }

  function resolveExtensionPath() {
    try {
      var attr = (document.documentElement && document.documentElement.getAttribute("data-sei-pro-dropzone-src")) || null;
      if (attr) return attr;
    } catch(e){}
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.getURL === "function") {
        return chrome.runtime.getURL("/lib/dropzone.min.js");
      }
    } catch(e){}
    var viaScript = resolveFromCurrentScript();
    if (viaScript) return viaScript;
    return "/lib/dropzone.min.js";
  }

  function ensureDropzoneScript() {
    return new Promise(function(resolve, reject){
      if (typeof window.Dropzone !== "undefined") {
        try { Dropzone.autoDiscover = false; } catch(e){}
        resolve(true);
        return;
      }
      var src = window.SEI_PRO_DROPZONE_SRC || resolveExtensionPath();
      var already = document.querySelector('script[src*="dropzone.min.js"]');
      if (already) {
        var done = function(){ try { Dropzone.autoDiscover = false; } catch(e){} resolve(true); };
        already.addEventListener("load", done, { once:true });
        setTimeout(function(){ if (typeof window.Dropzone !== "undefined") done(); }, 0);
        return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function(){ try { Dropzone.autoDiscover = false; } catch(e){} resolve(true); };
      s.onerror = function(){ reject(new Error("Falha ao carregar Dropzone em " + src)); };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  function injectFallbackStyles() {
    if (document.getElementById(FALLBACK_STYLE_ID)) return;
    var css = [
      "#"+FALLBACK_MODAL_ID+"{position:fixed;inset:0;padding:32px;background:rgba(13,30,64,.5);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:2147483645;}",
      "#"+FALLBACK_MODAL_ID+".sei-pro-open{display:flex;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-content{position:relative;width:100%;max-width:640px;border-radius:20px;background:#ffffff;padding:28px 30px;box-shadow:0 24px 50px rgba(15,29,61,.22);display:flex;flex-direction:column;gap:22px;transform:translateY(24px);opacity:.96;transition:transform .24s ease,opacity .24s ease;overflow:hidden;}",
      "#"+FALLBACK_MODAL_ID+".sei-pro-open .sei-pro-arvore-modal-content{transform:translateY(0);opacity:1;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-header{display:flex;align-items:center;gap:16px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-header .sei-pro-icon{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#4da2ff 0%,#0d6efd 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-header h2{margin:0;font-size:20px;color:#0f1d3d;font-weight:700;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-header .sei-pro-close{border:none;background:transparent;color:#4a5978;font-size:22px;cursor:pointer;line-height:1;padding:6px;border-radius:10px;display:flex;align-items:center;justify-content:center;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-header .sei-pro-close:hover{background:#e8edff;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-header .sei-pro-close:focus-visible{outline:2px solid #0d6efd;outline-offset:2px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-description{margin:-8px 0 0 60px;color:#4a5978;font-size:14px;line-height:1.5;}",
      "#sei-pro-upload-form{display:flex;flex-direction:column;gap:16px;min-height:220px;}",
      "#sei-pro-upload-form .dz-message{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:36px;border:2px dashed #0d6efd;border-radius:18px;background:#f6f8ff;color:#0d6efd;font-size:15px;font-weight:500;transition:border-color .2s ease,background .2s ease;}",
      "#sei-pro-upload-form .dz-message strong{font-size:16px;color:#0b2b6d;}",
      "#sei-pro-upload-form .dz-message span{color:#476097;font-size:14px;font-weight:500;display:block;text-align:center;}",
      "#sei-pro-upload-form .dz-message .sei-pro-dropzone-icon{width:56px;height:56px;border-radius:50%;background:#0d6efd;color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;}",
      "#sei-pro-upload-form .dz-message .sei-pro-dropzone-hint{color:#7282a8;font-size:13px;text-align:center;}",
      "#sei-pro-upload-form.dz-drag-hover .dz-message{border-color:#2c8cff;background:#e8f1ff;}",
      "#sei-pro-upload-form.dz-started .dz-message{display:none;}",
      "#sei-pro-upload-form .dz-preview{position:relative;display:grid;grid-template-columns:auto 1fr auto;grid-template-rows:auto auto auto;row-gap:10px;column-gap:16px;align-items:center;padding:16px 18px;border-radius:14px;background:#f9faff;border:1px solid #e0e7ff;box-shadow:0 6px 18px rgba(13,30,64,.08);animation:seiProFadeIn .18s ease;}",
      "#sei-pro-upload-form .dz-preview:hover{border-color:#b7c6ff;box-shadow:0 10px 26px rgba(13,30,64,.12);}",
      "#sei-pro-upload-form .dz-preview .sei-pro-preview-icon{width:44px;height:44px;border-radius:14px;background:#eaf1ff;display:flex;align-items:center;justify-content:center;font-size:22px;color:#0d318e;font-weight:700;grid-row:1 / span 2;}",
      "#sei-pro-upload-form .dz-preview .dz-details{grid-column:2;grid-row:1;display:flex;flex-direction:column;gap:4px;color:#1c2c4d;font-size:14px;}",
      "#sei-pro-upload-form .dz-preview .dz-details .dz-filename span{font-size:14px;font-weight:600;color:#0f1d3d;}",
      "#sei-pro-upload-form .dz-preview .dz-details .dz-size{color:#53658c;font-size:12px;font-weight:600;}",
      "#sei-pro-upload-form .dz-preview .dz-progress{grid-column:2;grid-row:2;height:6px;border-radius:999px;background:#dce4ff;overflow:hidden;width:100%;}",
      "#sei-pro-upload-form .dz-preview .dz-progress .dz-upload{background:linear-gradient(90deg,#4da2ff 0%,#0d6efd 100%);}",
      "#sei-pro-upload-form .dz-preview .dz-success-mark,#sei-pro-upload-form .dz-preview .dz-error-mark{grid-column:3;grid-row:1;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:12px;font-size:18px;font-weight:700;}",
      "#sei-pro-upload-form .dz-preview .dz-success-mark{background:#eaf3ff;color:#0d6efd;}",
      "#sei-pro-upload-form .dz-preview .dz-error-mark{background:#ffecef;color:#e0315b;}",
      "#sei-pro-upload-form .dz-preview .dz-success-mark span,#sei-pro-upload-form .dz-preview .dz-error-mark span{display:block;line-height:1;font-size:18px;font-weight:700;}",
      "#sei-pro-upload-form .dz-preview .dz-remove{grid-column:3;grid-row:2;background:#eef2ff;color:#0b2970;border:none;border-radius:10px;padding:6px 12px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;transition:background .18s ease,color .18s ease;}",
      "#sei-pro-upload-form .dz-preview .dz-remove:hover{background:#dce6ff;color:#062362;}",
      "#sei-pro-upload-form .dz-preview .dz-remove:focus-visible{outline:2px solid #0d6efd;outline-offset:2px;}",
      "#sei-pro-upload-form .dz-preview .dz-error-message{grid-column:2 / span 2;grid-row:3;position:relative;margin:0;background:#ffecef;color:#d92550;border-radius:10px;padding:6px 10px;font-size:12px;font-weight:600;}",
      "#sei-pro-upload-form.sei-pro-highlight .dz-message{border-color:#ff6b6b;background:#fff4f4;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-footer{display:flex;justify-content:space-between;align-items:center;margin-top:4px;gap:12px;flex-wrap:wrap;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-footer-actions{display:flex;gap:10px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-footer button{border:none;border-radius:10px;padding:10px 18px;cursor:pointer;font-size:14px;font-weight:600;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-footer button:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(13,30,64,.12);}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-footer button:focus-visible{outline:2px solid #0d6efd;outline-offset:3px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-footer button.sei-pro-primary{background:#0d6efd;color:#fff;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-footer button.sei-pro-secondary{background:#e7ecf8;color:#1b2d55;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-footer button.sei-pro-credits{background:transparent;color:#0d6efd;padding:8px 12px;box-shadow:none;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-footer button.sei-pro-credits:hover{background:rgba(13,110,253,.12);}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-footer button.sei-pro-credits:focus-visible{outline:2px solid #0d6efd;outline-offset:3px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(13,30,64,.72);backdrop-filter:blur(4px);padding:24px;z-index:6;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-overlay.sei-credits-open{display:flex;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-card-wrapper{max-width:460px;width:100%;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-card{background:#ffffff;border-radius:18px;padding:26px 28px;box-shadow:0 22px 44px rgba(15,29,61,.28);display:flex;flex-direction:column;gap:22px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-header{display:flex;justify-content:space-between;align-items:center;gap:16px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-header h3{margin:0;font-size:20px;color:#0f1d3d;font-weight:700;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-close{border:none;background:#0d6efd;color:#fff;border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-close:hover{filter:brightness(1.1);}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-body{display:flex;flex-direction:column;gap:20px;color:#1c2c4d;font-size:14px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-developer{display:flex;gap:16px;align-items:center;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-avatar{width:54px;height:54px;border-radius:18px;background:#0d6efd;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-name{margin:0;font-size:16px;color:#0f1d3d;font-weight:600;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-role{margin:4px 0 10px;color:#4a5978;font-size:13px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-contact{display:inline-flex;align-items:center;gap:8px;color:#0d6efd;text-decoration:none;font-weight:600;font-size:13px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-contact:hover{text-decoration:underline;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-features{display:flex;flex-direction:column;gap:10px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-feature{display:flex;gap:10px;align-items:center;color:#364468;font-size:13px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-credits-footer{text-align:center;font-size:12px;color:#4a5978;}",
      "@keyframes seiProFadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}"
    ].join("");
    var style = document.createElement("style");
    style.id = FALLBACK_STYLE_ID;
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(style);
  }


  /**
   * Função de diagnóstico para mostrar informações sobre o ambiente
   */
  function diagnosticarAmbiente() {
    // Verificar elementos DOM
    // Declarar variáveis localmente para evitar erros de referência
    var ckeElements = document.querySelectorAll('.cke, [id*="cke_"]');
    var iframes = document.querySelectorAll('iframe');
    // Nota: essas variáveis são apenas para diagnóstico, não são usadas atualmente
  }

  function ensureFallbackModal() {

    diagnosticarAmbiente()
    // if (ckeElements.length === 0) {
    //   return;
    // }

    injectFallbackStyles();
    var modal = document.getElementById(FALLBACK_MODAL_ID);
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = FALLBACK_MODAL_ID;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    var content = document.createElement("div");
    content.className = "sei-pro-arvore-modal-content";

    var header = document.createElement("div");
    header.className = "sei-pro-arvore-modal-header";

    var headerIcon = document.createElement("div");
    headerIcon.className = "sei-pro-icon";
    headerIcon.innerHTML = "<span aria-hidden=\"true\">📤</span>";

    var title = document.createElement("h2");
    title.textContent = "Adicionar arquivos externos";

    var close = document.createElement("button");
    close.type = "button";
    close.className = "sei-pro-close";
    close.setAttribute("aria-label", "Fechar");
    close.innerHTML = "&times;";
    close.addEventListener("click", closeFallbackModal);

    header.appendChild(headerIcon);
    header.appendChild(title);
    header.appendChild(close);

    var instructions = document.createElement("p");
    instructions.className = "sei-pro-arvore-modal-description";
    instructions.textContent = "Selecione arquivos e clique em \"Enviar para a árvore\" para anexar ao processo.";

    var form = document.createElement("form");
    form.id = "sei-pro-upload-form";
    form.className = "dropzone dz-arvore";
    form.innerHTML = [
      '<div class="dz-message" data-dz-message>',
      '  <div class="sei-pro-dropzone-icon">⬆️</div>',
      '  <strong>Arraste e solte arquivos aqui</strong>',
      '  <span>ou clique para procurar no seu computador</span>',
      '  <div class="sei-pro-dropzone-hint">Suporta PDF, DOC, JPG, PNG e outros formatos permitidos pelo SEI.</div>',
      '</div>'
    ].join("");

    var footer = document.createElement("div");
    footer.className = "sei-pro-arvore-modal-footer";

    var creditsButton = document.createElement("button");
    creditsButton.type = "button";
    creditsButton.className = "sei-pro-credits";
    creditsButton.textContent = "Créditos";
    creditsButton.addEventListener("click", function(ev){
      try { ev.preventDefault(); } catch(e){}
      try { ev.stopPropagation(); } catch(e){}
      openCreditsHub();
    });

    var footerActions = document.createElement("div");
    footerActions.className = "sei-pro-footer-actions";

    var uploadFooter = document.createElement("button");
    uploadFooter.type = "button";
    uploadFooter.className = "sei-pro-primary";
    uploadFooter.textContent = "Enviar para a árvore";
    uploadFooter.addEventListener("click", handleFallbackUpload);

    var closeFooter = document.createElement("button");
    closeFooter.type = "button";
    closeFooter.className = "sei-pro-secondary";
    closeFooter.textContent = "Fechar";
    closeFooter.addEventListener("click", closeFallbackModal);

    footerActions.appendChild(closeFooter);
    footerActions.appendChild(uploadFooter);

    footer.appendChild(creditsButton);
    footer.appendChild(footerActions);

    content.appendChild(header);
    content.appendChild(instructions);
    content.appendChild(form);
    content.appendChild(footer);
    ensureCreditsTemplate();

    modal.appendChild(content);

    modal.addEventListener("click", function(ev){
      if (ev.target === modal) closeFallbackModal();
    });

    (document.body || document.documentElement).appendChild(modal);
    return modal;
  }

  function dispatchFallbackFiles(instance) {
    if (!instance) return;
    try {
      var detail = { files: instance.files || [] };
      var evt = new CustomEvent("SEIProArvoreFallbackFiles", { detail: detail });
      document.dispatchEvent(evt);
    } catch(e){}
  }

  function ensureFallbackDropzone() {
    var modal = ensureFallbackModal();
    if (!modal) return null;
    var form = modal.querySelector("#sei-pro-upload-form");
    if (!form) return null;
    if (!window.Dropzone || typeof Dropzone !== "function") return null;
    try { Dropzone.autoDiscover = false; } catch(e){}
    if (!form.dropzone) {
      var options = {
        url: "/",
        autoProcessQueue: false,
        uploadMultiple: false,
        parallelUploads: 1,
        clickable: true,
        addRemoveLinks: true,
        createImageThumbnails: false,
        dictDefaultMessage: "Clique ou arraste arquivos para adicionar",
        dictRemoveFile: "Remover",
        paramName: "filArquivo"
      };
      try {
        var inst = new Dropzone(form, options);
        attachDropzoneHandlers(inst);
        inst.on("addedfile", function(){
          try {
            form.classList.remove("sei-pro-highlight");
          } catch(e){}
          dispatchFallbackFiles(inst);
          if (window[MANUAL_UPLOAD_TRIGGER_FLAG]) {
            scheduleFallbackUpload();
          } else {
            console.debug('[SEIPro] Arquivo adicionado ao fallback Dropzone, aguardando clique manual.');
          }
        });
        inst.on("removedfile", function(){
          dispatchFallbackFiles(inst);
          if (!inst.files || !inst.files.length) {
            try { form.classList.add("sei-pro-highlight"); } catch(e){}
          }
        });
      } catch(e){}
    }
    if (form.dropzone) {
      attachDropzoneHandlers(form.dropzone);
      window.arvoreDropzone = form.dropzone;
      window.dropzoneInstance = form.dropzone;
      window[DROPZONE_READY_FLAG] = true;
      return form.dropzone;
    }
    return null;
  }

  function handleFallbackUpload(){
    try { registerLegacyUploadFunctions(); } catch(e){}
    var modal = document.getElementById(FALLBACK_MODAL_ID);
    var dz = window.arvoreDropzone;
    if (modal && dz) {
      if (!dz.files || !dz.files.length) {
        try {
          var form = modal.querySelector("#sei-pro-upload-form");
          if (form) form.classList.add("sei-pro-highlight");
        } catch(e){}
        return;
      }
      if (typeof window.sendUploadArvore === "function") {
        try {
          window[MANUAL_UPLOAD_TRIGGER_FLAG] = true;
          window.sendUploadArvore("upload");
        } catch(e){}
      } else {
        dispatchFallbackFiles(dz);
      }
    }
  }

  function scheduleFallbackUpload(){
    try {
      registerLegacyUploadFunctions();
      if (typeof window.sendUploadArvore === "function") {
        setTimeout(function(){
          try { window.sendUploadArvore("upload"); } catch(e){}
        }, 120);
      }
    } catch(e){}
  }

  function openFallbackModal() {
    try {
      console.log('[SEIPro] openFallbackModal: Iniciando...');
      var modal = ensureFallbackModal();
      if (!modal) {
        console.error('[SEIPro] openFallbackModal: Modal não foi criado');
        return;
      }
      
      console.log('[SEIPro] openFallbackModal: Modal encontrado, abrindo...');
      
      // Garantir que estilos estão aplicados
      modal.classList.add("sei-pro-open");
      modal.style.display = "flex";
      modal.style.visibility = "visible";
      modal.style.opacity = "1";
      modal.style.zIndex = "2147483645";
      
      // Garantir que modal está no body
      if (!document.body.contains(modal)) {
        (document.body || document.documentElement).appendChild(modal);
      }
      
      // Inicializar Dropzone se necessário
      var dz = ensureFallbackDropzone();
      if (dz) {
        console.log('[SEIPro] openFallbackModal: Dropzone inicializado');
        // Não tentar abrir file input automaticamente - deixar usuário clicar
      } else {
        console.warn('[SEIPro] openFallbackModal: Dropzone não inicializado (continuando)');
      }
      
      console.log('[SEIPro] openFallbackModal: Modal aberto com sucesso');
      
      // Verificar se modal está realmente visível
      setTimeout(function() {
        var isVisible = modal.offsetParent !== null || modal.style.display === "flex";
        if (!isVisible) {
          console.warn('[SEIPro] openFallbackModal: Modal não está visível, forçando...');
          modal.style.display = "flex";
          modal.style.visibility = "visible";
          modal.style.opacity = "1";
        }
      }, 100);
      
    } catch(err) {
      console.error('[SEIPro] openFallbackModal: Erro ao abrir modal:', err);
    }
  }

  function closeFallbackModal() {
    var modal = document.getElementById(FALLBACK_MODAL_ID);
    if (!modal) return;
    try {
      closeCreditsOverlay();
    } catch(e){}
    modal.classList.remove("sei-pro-open");
    modal.style.display = "none";
  }

  function openCreditsHub() {
    // Tentar abrir o overlay no modal de upload se existir
    var uploadModal = document.getElementById(FALLBACK_MODAL_ID);
    if (uploadModal) {
      return openCreditsOverlay(uploadModal).catch(function(err){
        console.warn('[SEIPro] Erro ao abrir overlay, usando fallback inline:', err);
        renderCreditsInlineFallback(uploadModal);
      });
    }
    
    // Fallback: tentar abrir em nova janela
    return openCreditsOverlay().catch(function(){
      var fallbackUrl = resolveExtensionUrl('credits.html');
      try {
        var win = window.open(fallbackUrl, '_blank');
        if (win) { try { win.opener = null; } catch(e){} }
      } catch(err) {
        try {
          var alt = window.open('https://github.com/stefanini-sei/SEI-extension#cr%C3%A9ditos', '_blank');
          if (alt) { try { alt.opener = null; } catch(e){} }
        } catch(e){}
      }
    });
  }

  try {
    if (typeof window !== "undefined") {
      window.openCreditsHub = openCreditsHub;
    }
  } catch(e){}

  function idempotentInit() {
    try { registerLegacyUploadFunctions(); } catch(e){}
    if (window[DROPZONE_READY_FLAG]) return true;

    if (typeof window.loadUploadArvore === "function") {
      try { window.loadUploadArvore(); } catch(e){}
    }

    try {
      var el = document.querySelector("#divUploadArvore") || document.querySelector(".dz-arvore") || document.querySelector("body");
      var dz = null;
      if (window.Dropzone && typeof Dropzone.forElement === "function" && el) {
        try { dz = Dropzone.forElement(el); } catch(e){ dz = null; }
      }
      if (!dz && el && el.dropzone) dz = el.dropzone;
      if (!dz && window.Dropzone && Array.isArray(Dropzone.instances) && Dropzone.instances.length) {
        dz = Dropzone.instances[Dropzone.instances.length - 1];
      }
      if (dz) { window.arvoreDropzone = dz; window.dropzoneInstance = dz; window[DROPZONE_READY_FLAG] = true; return true; }
    } catch(e){}

    try {
      var fallback = ensureFallbackDropzone();
      if (fallback) return true;
    } catch(e){}
    return false;
  }

  function injectButtonStylesIfNeeded() {
    if (document.getElementById("sei-pro-arvore-floating-style")) return;
    var containerSelector = "#"+FLOATING_CONTAINER_ID;
    var css = [
      containerSelector+"{position:fixed;right:24px;bottom:24px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;",
      "justify-content:flex-end;z-index:2147483646;font-family:inherit;}",
      containerSelector+" .sei-pro-floating-round,.sei-pro-floating-round{width:52px;height:52px;border-radius:50%;border:none;background:#017FFF;color:#fff;",
      "box-shadow:0 10px 24px rgba(1,127,255,.3);display:inline-flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;",
      "transition:transform .18s ease,box-shadow .18s ease,filter .18s ease;}",
      containerSelector+" .sei-pro-floating-round:hover,.sei-pro-floating-round:hover{transform:translateY(-2px);box-shadow:0 16px 32px rgba(1,127,255,.35);filter:brightness(1.05);}",
      containerSelector+" .sei-pro-floating-round:focus-visible,.sei-pro-floating-round:focus-visible{outline:2px solid #ffffff;outline-offset:4px;}",
      containerSelector+" .sei-pro-floating-round .sei-pro-arvore-icon,.sei-pro-floating-round .sei-pro-arvore-icon{width:24px;height:24px;display:block;background-repeat:no-repeat;background-position:center;background-size:22px 22px;}",
      // Ajuste: o botão tools do tipo ".sei-tools-button" deve ficar do tamanho do ícone do upload
      containerSelector+" .sei-tools-button,.sei-tools-button{width:52px;height:52px;min-width:52px;min-height:52px;max-width:52px;max-height:52px;border-radius:50%;padding:0;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:none;box-shadow:none;font-size:22px;gap:0;}",
      containerSelector+" .sei-tools-button span,.sei-tools-button span{font-size:22px;line-height:1;}",
      containerSelector+" .sei-pro-floating-pill,.sei-pro-floating-pill{height:52px;border-radius:26px;padding:0 20px;background:#0d6efd;color:#fff;font-weight:600;",
      "font-size:15px;border:none;display:inline-flex;align-items:center;gap:10px;box-shadow:0 10px 24px rgba(13,110,253,.28);cursor:pointer;",
      "transition:transform .18s ease,box-shadow .18s ease;min-width:138px;}",
      containerSelector+" .sei-pro-floating-pill:hover,.sei-pro-floating-pill:hover{transform:translateY(-2px);box-shadow:0 16px 32px rgba(13,110,253,.35);}",
      containerSelector+" .sei-pro-floating-pill:focus-visible,.sei-pro-floating-pill:focus-visible{outline:2px solid #ffffff;outline-offset:4px;}",
      containerSelector+" .sei-pro-floating-pill>*,.sei-pro-floating-pill>*{pointer-events:none;}",
      // Removido gap e padding personalizados do botão tools internamente na pill para padronizar (o próprio .sei-tools-button já é estilizado acima)
      containerSelector+" .sei-pro-floating-label,.sei-pro-floating-label{pointer-events:none;font-size:15px;font-weight:600;color:inherit;}",
      containerSelector+" .sei-pro-floating-pill .sei-pro-floating-label,.sei-pro-floating-pill .sei-pro-floating-label{margin-left:4px;}"
    ].join("");
    var style = document.createElement("style");
    style.id = "sei-pro-arvore-floating-style";
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureButtonIcon(btn) {
    if (!btn) return;
    var icon = btn.querySelector(".sei-pro-arvore-icon");
    if (!icon) {
      icon = document.createElement("span");
      icon.className = "sei-pro-arvore-icon";
      icon.setAttribute("aria-hidden", "true");
      btn.textContent = "";
      btn.appendChild(icon);
    }
    // Remove a label do botão se existir
    var label = btn.querySelector(".sei-pro-floating-label");
    if (label) {
      label.remove();
    }
    try {
      icon.style.backgroundImage = "url('" + UPLOAD_ICON_DATA_URI + "')";
    } catch(e){}
  }


  function ensureFloatingContainer(doc) {
    var container = doc.getElementById(FLOATING_CONTAINER_ID);
    if (!container) {
      container = doc.createElement("div");
      container.id = FLOATING_CONTAINER_ID;
      container.setAttribute("role", "presentation");
      (doc.body || doc.documentElement).appendChild(container);
    }
    return container;
  }

  function normalizeFloatingButtonStyles(btn, isRound) {
    if (!btn) return;
    try {
      btn.removeAttribute("style");
      btn.classList.remove("sei-pro-floating-round", "sei-pro-floating-pill");
      btn.classList.add(isRound ? "sei-pro-floating-round" : "sei-pro-floating-pill");
    } catch(e){}
    // Ajuste: se for sei-tools-button, sempre aplica dimensões como "round"
    if (btn.classList.contains("sei-tools-button")) {
      btn.classList.remove("sei-pro-floating-pill");
      btn.classList.add("sei-pro-floating-round");
    }
  }

  function ensureFloatingLabel(btn, text) {
    if (!btn || !text) return;
    var label = btn.querySelector(".sei-pro-floating-label");
    if (!label) {
      label = document.createElement("span");
      label.className = "sei-pro-floating-label";
      btn.appendChild(label);
    }
    label.textContent = text;
  }

  function harmonizeFloatingButtons(doc) {
    var container = ensureFloatingContainer(doc);
    var configs = KNOWN_FLOATING_BUTTONS.concat([{ id: UPLOAD_BUTTON_ID, shape: "round" }]);
    configs.forEach(function(cfg){
      if (!cfg || !cfg.id) return;
      var btn = doc.getElementById(cfg.id);
      if (!btn) return;
      if (!container.contains(btn)) {
        container.appendChild(btn);
      }
      // Ajuste: se for ".sei-tools-button", sempre isRound
      var isRound = cfg.shape === "round" || (btn.classList && btn.classList.contains("sei-tools-button"));
      normalizeFloatingButtonStyles(btn, isRound);
      if (cfg.label) {
        ensureFloatingLabel(btn, cfg.label);
      }
    });
    if (container.childElementCount > 0) {
      container.style.display = "";
    }
  }

  function scheduleHarmonize(doc) {
    harmonizeFloatingButtons(doc);
    setTimeout(function(){ harmonizeFloatingButtons(doc); }, 120);
    setTimeout(function(){ harmonizeFloatingButtons(doc); }, 500);
  }

  /**
   * Verifica se há link "Incluir Documento" disponível
   */
  function hasIncluirDocumentoLink() {
    // Primeiro, tentar garantir que os links foram buscados (se a função estiver disponível)
    try {
      // Verificar se a função existe antes de chamar
      if (typeof ensureLinksArvore === 'function') {
        ensureLinksArvore();
      }
      // Se não existe, continuar com outras verificações (não é crítico)
    } catch(e) {
      // Ignorar erro silenciosamente - continuar com outras verificações
    }
    
    // Verificar se há link válido no array
    if (Array.isArray(window.arrayLinksArvore) && window.arrayLinksArvore.length) {
      for (var i = 0; i < window.arrayLinksArvore.length; i++) {
        if (window.arrayLinksArvore[i] && window.arrayLinksArvore[i].name === 'Incluir Documento' && window.arrayLinksArvore[i].url) {
          return true;
        }
      }
    }
    
    // Verificar se há função getUrlAcaoPro disponível
    try {
      var parentCandidate = window.parent && window.parent.parent ? window.parent.parent : window.parent || window;
      if (typeof parentCandidate.getUrlAcaoPro === 'function') {
        var url = parentCandidate.getUrlAcaoPro('documento_escolher_tipo') || parentCandidate.getUrlAcaoPro('documento_receber');
        if (url) return true;
      }
    } catch(e) {
      // Ignorar erro
    }
    
    // Verificar se há link no DOM
    try {
      var links = document.querySelectorAll('a[href*="documento_escolher_tipo"], a[href*="documento_receber"]');
      if (links && links.length > 0) {
        for (var j = 0; j < links.length; j++) {
          var href = links[j].getAttribute('href');
          if (href && href.indexOf('controlador.php') !== -1) {
            return true;
          }
        }
      }
    } catch(e) {
      // Ignorar erro
    }
    
    // Verificar se há id_procedimento na URL atual (pode construir link)
    try {
      var currentUrl = window.location.href || document.location.href;
      if (currentUrl && currentUrl.indexOf('/sei/') !== -1) {
        var procIdMatch = currentUrl.match(/[?&]id_procedimento=(\d+)/);
        if (procIdMatch && procIdMatch[1]) {
          return true; // Pode construir URL
        }
      }
    } catch(e) {
      // Ignorar erro
    }
    
    return false;
  }

  function createOrUpdateButton() {
    var doc = document;
    injectButtonStylesIfNeeded();
    
    // Verificar se há link disponível antes de criar/mostrar botão
    var hasLink = hasIncluirDocumentoLink();
    
    var btn = doc.getElementById(UPLOAD_BUTTON_ID);
    var container = ensureFloatingContainer(doc);
    
    if (!btn) {
      // Só criar botão se houver link disponível
      if (!hasLink) {
        return null;
      }
      
      btn = doc.createElement("button");
      btn.id = UPLOAD_BUTTON_ID;
      btn.type = "button";
      btn.title = "Enviar arquivos externos";
      btn.setAttribute("aria-label", "Enviar arquivos externos");
      
      // Registrar evento de clique de forma mais robusta
      btn.onclick = function(e) {
        try {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
        } catch(err) {}
        onClickUpload(e);
      };
      
      // Marcar como tendo listener
      btn.setAttribute('data-sei-pro-listener', 'true');
      
      // Adicionar também addEventListener como backup
      try {
        btn.addEventListener("click", function(e) {
          try {
            if (e) {
              e.preventDefault();
              e.stopPropagation();
            }
          } catch(err) {}
          onClickUpload(e);
        }, { capture: false, once: false });
      } catch(e) {
        console.warn('[SEIPro] Erro ao adicionar event listener:', e);
      }
      
      container.appendChild(btn);
    } else if (!container.contains(btn)) {
      container.appendChild(btn);
    }
    
    // Garantir que botão existente tenha o listener registrado
    if (btn) {
      // Verificar se já tem listener - se não tiver, adicionar
      var hasOnclick = btn.onclick !== null && btn.onclick !== undefined;
      var hasAttr = btn.getAttribute('data-sei-pro-listener') === 'true';
      
      if (!hasOnclick || !hasAttr) {
        // Registrar evento de clique de forma robusta
        btn.onclick = function(e) {
          try {
            if (e) {
              e.preventDefault();
              e.stopPropagation();
            }
          } catch(err) {}
          onClickUpload(e);
        };
        
        // Marcar como tendo listener
        btn.setAttribute('data-sei-pro-listener', 'true');
        
        // Adicionar também addEventListener como backup
        try {
          btn.addEventListener("click", function(e) {
            try {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
            } catch(err) {}
            onClickUpload(e);
          }, { capture: false, once: false });
        } catch(e) {
          console.warn('[SEIPro] Erro ao adicionar event listener:', e);
        }
      }
    }
    
    // Mostrar/ocultar botão baseado na disponibilidade do link
    if (hasLink && btn) {
      btn.classList.add("sei-pro-floating-round");
      btn.style.display = "";
      btn.hidden = false;
      ensureButtonIcon(btn);
    } else if (btn) {
      btn.style.display = "none";
      btn.hidden = true;
    }
    
    scheduleHarmonize(doc);
    return btn;
  }

  async function onClickUpload(e){
    try {
      if (e && typeof e.preventDefault === "function") {
        e.preventDefault();
      }
      if (e && typeof e.stopPropagation === "function") {
        e.stopPropagation();
      }
    } catch(err) {}
    
    console.log('[SEIPro] ========================================');
    console.log('[SEIPro] Botão de upload clicado - INICIANDO');
    console.log('[SEIPro] ========================================');
    
    // Garantir que o modal será aberto - sempre usar fallback como método principal
    var modalOpened = false;
    
    // Função para abrir modal de forma garantida
    var forceOpenModal = function() {
      if (modalOpened) return;
      try {
        console.log('[SEIPro] Forçando abertura do modal de fallback...');
        var modal = ensureFallbackModal();
        if (modal) {
          modal.classList.add("sei-pro-open");
          modal.style.display = "flex";
          modal.style.visibility = "visible";
          modal.style.opacity = "1";
          modalOpened = true;
          console.log('[SEIPro] ✓ Modal aberto com sucesso');
          
          // Tentar inicializar dropzone se ainda não foi
          setTimeout(function() {
            try {
              ensureFallbackDropzone();
            } catch(e) {
              console.warn('[SEIPro] Erro ao inicializar dropzone:', e);
            }
          }, 100);
        } else {
          console.error('[SEIPro] ✗ Não foi possível criar modal');
        }
      } catch(err) {
        console.error('[SEIPro] ✗ Erro ao abrir modal:', err);
      }
    };
    
    // Verificar se há link disponível
    var hasLink = false;
    try {
      hasLink = hasIncluirDocumentoLink();
    } catch(e) {
      console.warn('[SEIPro] Erro ao verificar link:', e);
    }
    
    console.log('[SEIPro] Link disponível?', hasLink);
    
    window[MANUAL_UPLOAD_TRIGGER_FLAG] = true;
    
    // Tentar carregar Dropzone, mas não bloquear se falhar
    try {
      await ensureDropzoneScript();
      console.log('[SEIPro] ✓ Dropzone carregado');
    } catch(err) { 
      console.warn('[SEIPro] ⚠ Erro ao carregar Dropzone (continuando):', err);
    }
    
    // Tentar inicializar funções legadas, mas não bloquear
    try {
      registerLegacyUploadFunctions();
      console.log('[SEIPro] ✓ Funções legadas registradas');
    } catch(e) {
      console.warn('[SEIPro] ⚠ Erro ao registrar funções legadas:', e);
    }
    
    // Tentar idempotentInit, mas não bloquear
    try {
      idempotentInit();
      console.log('[SEIPro] ✓ Inicialização idempotente concluída');
    } catch(e) {
      console.warn('[SEIPro] ⚠ Erro na inicialização idempotente:', e);
    }
    
    // Se tem link, tentar métodos nativos primeiro
    if (hasLink) {
      // Tentar abrir modal nativo do SEI
      try {
        if (typeof window.openModalDropzone === "function") {
          console.log('[SEIPro] Tentando abrir modal nativo do SEI...');
          window.openModalDropzone();
          modalOpened = true;
          console.log('[SEIPro] ✓ Modal nativo aberto');
          return;
        }
      } catch(e) {
        console.warn('[SEIPro] ⚠ Erro ao abrir modal nativo:', e);
      }
      
      // Tentar usar sendUploadArvore (se disponível)
      try {
        if (typeof window.sendUploadArvore === "function") {
          console.log('[SEIPro] Tentando iniciar upload via sendUploadArvore...');
          window.sendUploadArvore("upload");
          
          // Verificar se modal foi aberto após um tempo
          setTimeout(function() {
            var modal = document.getElementById(FALLBACK_MODAL_ID);
            if (!modal || !modal.classList.contains('sei-pro-open')) {
              console.log('[SEIPro] Modal não foi aberto, abrindo fallback');
              forceOpenModal();
            } else {
              console.log('[SEIPro] ✓ Modal já estava aberto');
              modalOpened = true;
            }
          }, 500);
          
          // Se não for polyfill, considerar sucesso
          var fn = window.sendUploadArvore;
          if (fn && !fn.__seiProArvorePolyfill) {
            return;
          }
        }
      } catch(e) {
        console.warn('[SEIPro] ⚠ Erro ao chamar sendUploadArvore:', e);
      }
    }
    
    // Garantir que o modal seja aberto (método principal)
    if (!modalOpened) {
      console.log('[SEIPro] Abrindo modal de fallback...');
      forceOpenModal();
    }
    
    console.log('[SEIPro] ========================================');
    console.log('[SEIPro] Processamento do clique concluído');
    console.log('[SEIPro] ========================================');
  }

  function ensureUploadButton() {
    if (BOOT_DONE) return;
    BOOT_DONE = true;

    function attempt() {
      if (document.body || document.documentElement) {
        createOrUpdateButton(); 
        return true;
      }
      return false;
    }
    
    // Função para atualizar visibilidade do botão quando o link aparecer/desaparecer
    function updateButtonVisibility() {
      var hasLink = hasIncluirDocumentoLink();
      var btn = document.getElementById(UPLOAD_BUTTON_ID);
      
      if (hasLink) {
        // Se há link e botão não existe, criar
        if (!btn) {
          createOrUpdateButton();
        } else {
          // Se há link e botão existe, mostrar
          btn.style.display = "";
          btn.hidden = false;
        }
      } else {
        // Se não há link e botão existe, ocultar
        if (btn) {
          btn.style.display = "none";
          btn.hidden = true;
        }
      }
    }

    // Tentar criar botão imediatamente
    if (!attempt()) {
      var t0 = Date.now();
      var timer = setInterval(function(){
        if (attempt() || (Date.now()-t0) > 10000) {
          clearInterval(timer);
          // Após criar, verificar periodicamente a disponibilidade do link
          if (document.getElementById(UPLOAD_BUTTON_ID)) {
            // Verificar a cada 2 segundos se o link apareceu/desapareceu
            setInterval(updateButtonVisibility, 2000);
          }
        }
      }, 120);
      
      try {
        var mo = new MutationObserver(function(){
          if (attempt()) { 
            try { 
              mo.disconnect(); 
              // Após criar botão, começar a monitorar mudanças no DOM para atualizar visibilidade
              if (document.getElementById(UPLOAD_BUTTON_ID)) {
                // Verificar periodicamente
                setInterval(updateButtonVisibility, 2000);
              }
            } catch(e){} 
          } else {
            // Se o botão já existe, apenas atualizar visibilidade
            updateButtonVisibility();
          }
        });
        mo.observe(document.documentElement || document, { childList: true, subtree: true });
      } catch(e){}
      
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function(){
          attempt();
          // Após DOM carregado, verificar periodicamente
          if (document.getElementById(UPLOAD_BUTTON_ID)) {
            setInterval(updateButtonVisibility, 2000);
          }
        }, { once: true });
      }
    } else {
      // Se já criou o botão, começar a monitorar mudanças
      if (document.getElementById(UPLOAD_BUTTON_ID)) {
        // Verificar periodicamente se o link apareceu/desapareceu
        setInterval(updateButtonVisibility, 2000);
        
        // Também monitorar mudanças no DOM que podem indicar nova carga de links
        try {
          var visibilityObserver = new MutationObserver(function(){
            updateButtonVisibility();
          });
          visibilityObserver.observe(document.body || document.documentElement, { 
            childList: true, 
            subtree: true,
            attributes: false
          });
        } catch(e) {}
      }
    }
  }

  function extractLinksArvoreFromScripts(doc){
    var results = [];
    if (!doc) return results;
    
    try {
      // Método 1: Buscar em scripts inline
      var scripts = doc.querySelectorAll('script');
      for (var i = 0; i < scripts.length; i++) {
        var script = scripts[i];
        if (script.getAttribute && script.getAttribute('src')) continue;
        var text = script.textContent || script.innerHTML || '';
        
        // Padrão original
        if (text.indexOf('Nos[0].acoes') !== -1 || text.indexOf('documento_escolher_tipo') !== -1) {
          var regex = /controlador\.php\?[^"'\s]*acao=documento_escolher_tipo[^"'\s]*/gi;
          var match;
          while ((match = regex.exec(text))) {
            var url = match[0];
            if (!url) continue;
            url = url.replace(/&amp;/g, '&');
            if (results.indexOf(url) === -1) results.push(url);
          }
        }
        
        // Padrões alternativos
        var altPatterns = [
          /controlador\.php\?[^"'\s]*acao=documento_receber[^"'\s]*/gi,
          /['"]([^'"]*controlador\.php[^'"]*acao=documento_escolher_tipo[^'"]*)['"]/gi,
          /['"]([^'"]*controlador\.php[^'"]*acao=documento_receber[^'"]*)['"]/gi
        ];
        
        for (var p = 0; p < altPatterns.length; p++) {
          var pattern = altPatterns[p];
          var match;
          while ((match = pattern.exec(text))) {
            var url = match[1] || match[0];
            if (!url) continue;
            url = url.replace(/&amp;/g, '&');
            if (url.indexOf('controlador.php') !== -1 && results.indexOf(url) === -1) {
              results.push(url);
            }
          }
        }
      }
      
      // Método 2: Buscar em links do DOM
      try {
        var links = doc.querySelectorAll('a[href*="documento_escolher_tipo"], a[href*="documento_receber"]');
        for (var j = 0; j < links.length; j++) {
          var href = links[j].getAttribute('href');
          if (href && href.indexOf('controlador.php') !== -1) {
            href = normalizeLink(href);
            if (results.indexOf(href) === -1) results.push(href);
          }
        }
      } catch(e){}
      
      // Método 3: Buscar em atributos onclick, data-*, etc
      try {
        var elementsWithActions = doc.querySelectorAll('[onclick*="documento_escolher_tipo"], [onclick*="documento_receber"], [data-url*="documento"]');
        for (var k = 0; k < elementsWithActions.length; k++) {
          var el = elementsWithActions[k];
          var onclick = el.getAttribute('onclick') || '';
          var dataUrl = el.getAttribute('data-url') || '';
          var text = onclick + ' ' + dataUrl;
          
          var regex = /controlador\.php\?[^"'\s)]*acao=documento_(escolher_tipo|receber)[^"'\s)]*/gi;
          var match;
          while ((match = regex.exec(text))) {
            var url = match[0];
            if (!url) continue;
            url = url.replace(/&amp;/g, '&');
            if (results.indexOf(url) === -1) results.push(url);
          }
        }
      } catch(e){}
      
    } catch(e){
      console.debug('[SEIPro] Falha ao extrair scripts da árvore', e);
    }
    
    return results;
  }

  function escapeRegExp(str){
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeComponentCompat(value) {
    if (value === null || typeof value === 'undefined') return '';
    try {
      var str = value.toString();
      try {
        str = decodeURIComponent(str);
      } catch(e){}
      return encodeURIComponent(str).replace(/%20/g, '+');
    } catch(err) {
      return value;
    }
  }

  function resolveFileEmoji(filename) {
    if (!filename || typeof filename !== "string") return "📁";
    var ext = "";
    var idx = filename.lastIndexOf(".");
    if (idx !== -1) ext = filename.substring(idx + 1).toLowerCase();
    if (!ext) return "📁";
    if (["pdf"].indexOf(ext) !== -1) return "📄";
    if (["doc", "docx", "odt", "rtf"].indexOf(ext) !== -1) return "📝";
    if (["xls", "xlsx", "csv", "ods"].indexOf(ext) !== -1) return "📊";
    if (["ppt", "pptx", "odp"].indexOf(ext) !== -1) return "🖥️";
    if (["jpg", "jpeg", "png", "gif", "bmp", "tif", "tiff", "webp"].indexOf(ext) !== -1) return "🖼️";
    if (["zip", "rar", "7z", "gz"].indexOf(ext) !== -1) return "🗜️";
    if (["mp4", "mkv", "mov", "avi", "wmv"].indexOf(ext) !== -1) return "🎞️";
    if (["mp3", "wav", "ogg", "flac"].indexOf(ext) !== -1) return "🎵";
    if (["txt", "md", "log"].indexOf(ext) !== -1) return "📄";
    return "📁";
  }

  function attachDropzoneHandlers(dz){
    if (!dz || dz.__seiProHandlersAttached) return;
    if (dz.options && dz.options.paramName !== 'filArquivo') {
      dz.options.paramName = 'filArquivo';
    }
    if (dz.options) {
      dz.options.uploadMultiple = false;
      dz.options.parallelUploads = 1;
    }
    if (typeof dz.paramName !== 'undefined') {
      dz.paramName = 'filArquivo';
    }
    dz.__seiProHandlersAttached = true;
    try {
      dz.on('addedfile', function(file){
        console.debug('[SEIPro] Dropzone adicionou arquivo', file && file.name);
        try {
          if (file && file.previewElement) {
            file.previewElement.classList.add("sei-pro-preview");
            var details = file.previewElement.querySelector('.dz-details');
            var icon = file.previewElement.querySelector('.sei-pro-preview-icon');
            if (!icon) {
              icon = document.createElement('div');
              icon.className = 'sei-pro-preview-icon';
              if (details && details.parentNode) {
                details.parentNode.insertBefore(icon, details);
              } else {
                file.previewElement.insertBefore(icon, file.previewElement.firstChild);
              }
            }
            icon.textContent = resolveFileEmoji(file && file.name);
            var nameEl = file.previewElement.querySelector('[data-dz-name]');
            if (nameEl && file && file.name) {
              nameEl.setAttribute('title', file.name);
            }
            var sizeEl = file.previewElement.querySelector('[data-dz-size]');
            if (sizeEl && file && typeof file.size === "number") {
              sizeEl.setAttribute('title', (file.size / 1024).toFixed(1) + ' KB');
            }
            var successMark = file.previewElement.querySelector('.dz-success-mark');
            if (successMark) successMark.innerHTML = '<span>✓</span>';
            var errorMark = file.previewElement.querySelector('.dz-error-mark');
            if (errorMark) errorMark.innerHTML = '<span>!</span>';
            var removeLink = file.previewElement.querySelector('.dz-remove');
            if (removeLink) {
              removeLink.textContent = 'Remover';
              removeLink.setAttribute('aria-label', 'Remover arquivo');
            }
          }
        } catch(e){}
      });
    } catch(e){}
    try {
      dz.on('error', function(file, errorMessage){
        console.warn('[SEIPro] ❌ Erro no upload:', file && file.name, errorMessage);
        window[MANUAL_UPLOAD_TRIGGER_FLAG] = false;
        // Atualizar status visual para erro
        try {
          if (file && file.previewElement) {
            var statusMsg = file.previewElement.querySelector('.sei-pro-upload-status');
            if (statusMsg) {
              statusMsg.textContent = '❌ Erro: ' + (typeof errorMessage === 'string' ? errorMessage : 'Falha no upload');
              statusMsg.style.color = '#ef4444';
            }
          }
        } catch(e){}
      });
    } catch(e){}
    try {
      dz.on('queuecomplete', function(){
        console.debug('[SEIPro] Dropzone fila concluída');
        window[MANUAL_UPLOAD_TRIGGER_FLAG] = false;
      });
    } catch(e){}
    try {
      dz.on('sending', function(file, xhr, formData){
        console.log('[SEIPro] 📤 Iniciando upload:', file && file.name);
        if (dz.__seiProUploadIdentifier) {
          var normalizedId = String(dz.__seiProUploadIdentifier).trim();
          if (normalizedId && !formData.has('UPLOAD_IDENTIFIER')) {
            formData.append('UPLOAD_IDENTIFIER', normalizedId);
          }
          dz.__seiProUploadIdentifier = normalizedId;
        }
        logStep('dropzone:sending', {
          file: file && file.name,
          url: dz.__seiProUploadUrl,
          formDataKeys: formData ? Array.from(formData.keys()) : []
        });
        // Adicionar indicador visual de que o upload está em andamento
        try {
          if (file && file.previewElement) {
            var statusMsg = file.previewElement.querySelector('.sei-pro-upload-status');
            if (!statusMsg) {
              statusMsg = document.createElement('div');
              statusMsg.className = 'sei-pro-upload-status';
              var details = file.previewElement.querySelector('.dz-details');
              if (details && details.parentNode) {
                details.parentNode.appendChild(statusMsg);
              }
            }
            statusMsg.textContent = '📤 Enviando...';
            statusMsg.style.cssText = 'grid-column:2;grid-row:3;color:#0d6efd;font-size:12px;font-weight:600;margin-top:4px;';
          }
        } catch(e){
          console.warn('[SEIPro] Erro ao adicionar status visual', e);
        }
      });
      dz.on('uploadprogress', function(file, progress, bytesSent){
        console.debug('[SEIPro] 📊 Progresso upload:', file && file.name, progress.toFixed(0) + '%');
        try {
          if (file && file.previewElement) {
            var statusMsg = file.previewElement.querySelector('.sei-pro-upload-status');
            if (statusMsg) {
              if (progress < 100) {
                statusMsg.textContent = '📤 Enviando... ' + progress.toFixed(0) + '%';
              } else {
                statusMsg.textContent = '⏳ Processando no servidor...';
              }
            }
          }
        } catch(e){}
      });
      dz.on('success', function(file, response){
        console.log('[SEIPro] ✅ Upload concluído:', file && file.name);
        logStep('ETAPA-5:upload_sucesso', { 
          file: file && file.name, 
          url: dz.__seiProUploadUrl 
        });
        
        // Atualizar status visual para sucesso
        try {
          if (file && file.previewElement) {
            var statusMsg = file.previewElement.querySelector('.sei-pro-upload-status');
            if (statusMsg) {
              statusMsg.textContent = '✅ Upload concluído com sucesso!';
              statusMsg.style.color = '#10b981';
              setTimeout(function(){
                if (statusMsg && statusMsg.parentNode) {
                  statusMsg.remove();
                }
              }, 3000);
            }
          }
        } catch(e){}
        
        try {
          // Obter parâmetros de salvamento configurados
          var saveParams = dz.__seiProSaveParams ? JSON.parse(JSON.stringify(dz.__seiProSaveParams)) : {};
          var paramsFormObj = saveParams.paramsForm || {};
          
          // Processar resposta do upload
          var rawResponse = '';
          if (typeof response === 'string') {
            rawResponse = response;
          } else if (response && typeof response === 'object' && typeof response.join === 'function') {
            rawResponse = response.join('#');
          }
          if (!rawResponse && file && file.xhr) {
            rawResponse = file.xhr.response || file.xhr.responseText || '';
          }
          
          // Registrar snapshot da resposta
          try {
            var label = 'etapa5-upload-response-' + (file && file.name ? file.name.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase() : 'sem-nome');
            recordHtmlSnapshot(label, rawResponse || '[vazio]', {
              step: 'upload_arquivo_sucesso',
              file: file && file.name,
              size: file && file.size,
              rawLength: rawResponse ? rawResponse.length : 0
            });
          } catch(e) {}
          
          // Validar resposta: formato esperado é "id#nome#hash#tamanho#data"
          var parts = rawResponse ? rawResponse.split('#') : [];
          logStep('ETAPA-5:resposta_parseada', { 
            partes: parts.length
          });
          
          if (!parts || parts.length < 4 || !parts[0]) {
            console.error('[SEIPro] ETAPA 5: Resposta do upload inválida', parts);
            try {
              var previewElem = file && file.previewElement ? file.previewElement : null;
              if (previewElem) {
                previewElem.classList.add('dz-error');
                var msgNode = previewElem.querySelector('.dz-error-message span');
                if (msgNode) msgNode.textContent = 'Falha ao processar resposta do SEI.';
              }
            } catch(e){}
            if (window.__seiProQueueFallback) {
              window.__seiProQueueFallback(file ? [file] : []);
            }
            return;
          }
          
          // Codificar dados do anexo para hdnAnexos
          if (typeof window.encodeUrlUploadArvore === 'function') {
            try {
              saveParams.paramsForm.hdnAnexos = window.encodeUrlUploadArvore(parts, saveParams);
              logStep('ETAPA-5:hdnAnexos_gerado', { 
                hdnAnexos: saveParams.paramsForm.hdnAnexos ? 'OK' : 'FALHA' 
              });
            } catch(e) {
              console.warn('[SEIPro] Falha ao gerar hdnAnexos', e);
            }
          }
          
          // Montar payload POST para salvamento
          var postData = '';
          for (var key in paramsFormObj) {
            if (!Object.prototype.hasOwnProperty.call(paramsFormObj, key)) continue;
            if (postData !== '') postData += '&';
            var valor = (key === 'hdnAnexos') ? paramsFormObj[key] : escapeComponentCompat(paramsFormObj[key]);
            
            // Tratamento especial para txtNumero (encoding hexadecimal)
            if (key === 'txtNumero') {
              try {
                var parentCandidate = window.parent || window;
                valor = parentCandidate.encodeURI_toHex 
                  ? parentCandidate.encodeURI_toHex((paramsFormObj[key] || '').normalize('NFC')) 
                  : valor;
              } catch(e) {}
            }
            
            postData += key + '=' + (valor || '');
          }
          
          saveParams.paramsForm = postData;
          
          logStep('ETAPA-5:payload_salvar_pronto', { 
            payloadLength: postData.length,
            temHdnAnexos: postData.indexOf('hdnAnexos=') !== -1
          });
          
          var containerToUse = dz.__seiProContainer || null;
          
          // Ir para ETAPA 6: Salvar documento
          window.sendUploadArvore('save', saveParams, dz, containerToUse);
          
        } catch(err) {
          console.error('[SEIPro] ETAPA 5: Erro ao processar sucesso do upload', err);
          if (window.__seiProQueueFallback) {
            window.__seiProQueueFallback(file ? [file] : []);
          }
        }
      });
    } catch(e){}
  }

  window.SEIProArvoreLazy = {
    ensureUploadButton: ensureUploadButton,
    loadOnClickOnly: true
  };

  try { ensureUploadButton(); } catch(e){}
  window[MANUAL_UPLOAD_TRIGGER_FLAG] = window[MANUAL_UPLOAD_TRIGGER_FLAG] || false;

  function extractSaveErrors(html){
    var errors = [];
    if (!html) return errors;
    try {
      var doc = (typeof window.__seiProParseHtml === 'function')
        ? window.__seiProParseHtml(typeof html === 'string' ? html : String(html), window.location.href)
        : parseHTMLDocument(typeof html === 'string' ? html : String(html), window.location.href);
      var selectors = ['.infraBarraMensagem', '.infraMensagemErro', '.infraMensagemAviso', '.infraMensagemAlerta'];
      selectors.forEach(function(sel){
        var nodes = doc.querySelectorAll(sel);
        nodes.forEach(function(node){
          var txt = node.textContent ? node.textContent.trim() : '';
          if (txt) errors.push(txt);
        });
      });
      var scripts = html.match(/alert\(['"]([^'"]+)['"]\)/g);
      if (scripts) {
        scripts.forEach(function(match){
          var msg = match.replace(/^alert\(['"]/, '').replace(/['"]\)$/, '');
          if (msg) errors.push(msg);
        });
      }
      if (errors.length === 0) {
        var missingRequired = doc.querySelectorAll('.infraLabelObrigatorio, label.infraLabelObrigatorio');
        missingRequired.forEach(function(label){
          if (label.textContent) {
            errors.push('Campo possivelmente obrigatório sem preenchimento: ' + label.textContent.replace(/\*/g, '').trim());
          }
        });
      }
    } catch(e) {
      console.warn('[SEIPro] Falha ao extrair mensagens do save', e);
    }
    return errors.filter(function(value, index, self){ return value && self.indexOf(value) === index; });
  }

  function summarizePayload(paramForm){
    var summary = {};
    if (!paramForm) return summary;
    var params;
    if (typeof paramForm === 'string') {
      params = new URLSearchParams(paramForm);
      summary._rawType = 'string';
    } else if (paramForm && typeof paramForm === 'object') {
      summary._rawType = 'object';
      params = new URLSearchParams();
      Object.keys(paramForm).forEach(function(key){
        params.append(key, paramForm[key]);
      });
    } else {
      summary._rawType = typeof paramForm;
      return summary;
    }
    ['hdnIdSerie','selSerie','txtDataElaboracao','txtNumero','rdoFormato','rdoNivelAcesso','hdnIdHipoteseLegal','hdnAnexos'].forEach(function(key){
      if (params.has(key)) {
        summary[key] = params.get(key);
      }
    });
    summary.payloadLength = typeof paramForm === 'string' ? paramForm.length : undefined;
    return summary;
  }

  var SAVE_HISTORY_LIMIT = 5;
  var saveHistory = window.__seiProSaveHistory || [];
  window.__seiProSaveHistory = saveHistory;

  window.SEIPro_getLastSave = function(){
    return window.__seiProLastSave || null;
  };

  window.SEIPro_printLastSave = function(){
    var last = window.__seiProLastSave || null;
    if (last) {
      console.group('[SEIPro] Último save');
      console.info('Timestamp:', last.timestamp);
      console.info('Href:', last.href);
      console.info('Resumo payload:', last.payloadSummary);
      if (last.response) {
        console.info('Status:', last.response.status);
        console.info('Final URL:', last.response.finalUrl);
        console.info('Erros:', last.response.errors);
        console.info('HTML length:', last.response.htmlLength);
      }
      console.groupEnd();
    } else {
      console.info('[SEIPro] Nenhum save registrado ainda.');
    }
    return last;
  };

  window.SEIPro_listSnapshots = function(){
    var store = window.__seiProHtmlSnapshots || [];
    console.table(store.map(function(entry, index){
      return {
        index: index,
        label: entry.label,
        filename: entry.filename,
        timestamp: entry.timestamp,
        size: entry.size
      };
    }));
    return store;
  };

  window.SEIPro_downloadSnapshot = function(index){
    var store = window.__seiProHtmlSnapshots || [];
    if (!store.length) {
      console.warn('[SEIPro] Não há snapshots armazenados.');
      return null;
    }
    var entry = typeof index === 'number' ? store[index] : store[store.length - 1];
    if (!entry) {
      console.warn('[SEIPro] Snapshot não encontrado para índice', index);
      return null;
    }
    if (entry.url) {
      var link = document.createElement('a');
      link.href = entry.url;
      link.download = entry.filename;
      link.click();
      return entry;
    }
    console.warn('[SEIPro] Snapshot não possui URL de download.');
    return entry;
  };

  function extractDuplicadoUrl(html, baseHref) {
    if (!html) return null;
    try {
      var doc = (typeof window.__seiProParseHtml === 'function')
        ? window.__seiProParseHtml(html, baseHref)
        : parseHTMLDocument(html, baseHref);
      var selectorLink = doc.querySelector('a[href*="acao_ajax=documento_recebido_duplicado"]');
      if (selectorLink && selectorLink.getAttribute) {
        var directHref = selectorLink.getAttribute('href');
        if (directHref) return ensureHttps(directHref, baseHref);
      }
      var scripts = doc.querySelectorAll('script');
      for (var i = 0; i < scripts.length; i++) {
        var text = scripts[i].textContent || scripts[i].innerText || '';
        if (!text) continue;
        var matchScript = text.match(/controlador_ajax\.php\?[^"'\s]*acao_ajax=documento_recebido_duplicado[^"'\s]*/i);
        if (matchScript && matchScript[0]) {
          return ensureHttps(matchScript[0].replace(/&amp;/g, '&'), baseHref);
        }
      }
    } catch(e) {
      console.warn('[SEIPro] Falha ao analisar HTML em busca do documento_recebido_duplicado', e);
    }
    var matchHtml = html.match(/controlador_ajax\.php\?[^"'<>\s]*acao_ajax=documento_recebido_duplicado[^"'<>\s]*/i);
    if (matchHtml && matchHtml[0]) {
      return ensureHttps(matchHtml[0].replace(/&amp;/g, '&'), baseHref);
    }
    return null;
  }

  function logStep(step, data){
    try {
      if (data && typeof data === 'object') {
        console.info('[SEIPro][flow]', step, JSON.parse(JSON.stringify(data)));
      } else {
      console.info('[SEIPro][flow]', step, data || '');
      }
    } catch(e){
      console.warn('[SEIPro] Erro no logStep:', e);
      console.info('[SEIPro][flow]', step, '(erro ao serializar dados)');
    }
  }

  var creditsTemplatePromise = null;

  function ensureCreditsTemplate() {
    if (window.SeiCreditsTemplate && typeof window.SeiCreditsTemplate.getHtml === 'function') {
      return Promise.resolve(window.SeiCreditsTemplate);
    }
    if (creditsTemplatePromise) return creditsTemplatePromise;
    creditsTemplatePromise = Promise.resolve(window.SeiCreditsTemplate || null);
    return creditsTemplatePromise;
  }

  function getOrCreateCreditsOverlay(container) {
    if (!container) return null;
    var overlay = container.querySelector('.sei-credits-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sei-credits-overlay';
      var host = document.createElement('div');
      host.className = 'sei-credits-card-wrapper';
      overlay.appendChild(host);
      overlay.__seiCreditsHost = host;
      overlay.addEventListener('click', function(ev){
        if (ev.target === overlay) {
          closeCreditsOverlay(container);
        }
      });
      container.appendChild(overlay);
    }
    return overlay;
  }

  function openCreditsOverlay(container) {
    ensureCreditsStyles();
    return ensureCreditsTemplate().then(function(template){
      if (!template) throw new Error('Template indisponível');
      var overlay = getOrCreateCreditsOverlay(container);
      var host = overlay.__seiCreditsHost || overlay.querySelector('.sei-credits-card-wrapper');
      if (host) {
        if (typeof template.inject === 'function') {
          template.inject(host, { onClose: function(){ closeCreditsOverlay(container); } });
        } else if (typeof template.getHtml === 'function') {
          host.innerHTML = template.getHtml();
          var closeBtn = host.querySelector('[data-sei-credits-close]');
          if (closeBtn) closeBtn.addEventListener('click', function(){ closeCreditsOverlay(container); });
        }
      }
      overlay.classList.add('sei-credits-open');
      if (!overlay.__escHandler) {
        overlay.__escHandler = function(ev){ if (ev.key === 'Escape') closeCreditsOverlay(container); };
        document.addEventListener('keydown', overlay.__escHandler);
      }
    }).catch(function(err){
      console.warn('[SEIPro] Erro ao carregar template de créditos, usando fallback inline:', err);
      renderCreditsInlineFallback(container);
    });
  }

  function renderCreditsInlineFallback(container) {
    if (!container) {
      container = document.getElementById(FALLBACK_MODAL_ID);
      if (!container) return;
    }
    
    var overlay = getOrCreateCreditsOverlay(container);
    var host = overlay.__seiCreditsHost || overlay.querySelector('.sei-credits-card-wrapper');
    if (!host) return;

    // HTML inline dos créditos com encoding correto
    host.innerHTML = [
      '<div class="sei-credits-card" role="dialog" aria-modal="true">',
      '  <div class="sei-credits-header">',
      '    <h3>🎉 Créditos - SEI Smart</h3>',
      '    <button type="button" class="sei-credits-close" data-sei-credits-close>Fechar</button>',
      '  </div>',
      '  <div class="sei-credits-body">',
      '    <div class="sei-credits-developer">',
      '      <div class="sei-credits-avatar" aria-hidden="true">SF</div>',
      '      <div class="sei-credits-info">',
      '        <h4 class="sei-credits-name">Steferson Ferreira</h4>',
      '        <p class="sei-credits-role">Desenvolvedor & Criador</p>',
      '        <a class="sei-credits-contact" href="mailto:steferson.ferreira@gmail.com" target="_blank" rel="noopener">',
      '          <span aria-hidden="true">✉️</span>',
      '          <span>steferson.ferreira@gmail.com</span>',
      '        </a>',
      '      </div>',
      '    </div>',
      '    <div class="sei-credits-features">',
      '      <div class="sei-credits-feature"><span aria-hidden="true">🤖</span><span>Geração automática de despachos com IA</span></div>',
      '      <div class="sei-credits-feature"><span aria-hidden="true">📄</span><span>Modelos personalizados de documentos</span></div>',
      '      <div class="sei-credits-feature"><span aria-hidden="true">🛠️</span><span>Ferramentas avançadas de formatação</span></div>',
      '      <div class="sei-credits-feature"><span aria-hidden="true">📤</span><span>Upload inteligente de arquivos</span></div>',
      '      <div class="sei-credits-feature"><span aria-hidden="true">📸</span><span>Captura automática de texto</span></div>',
      '      <div class="sei-credits-feature"><span aria-hidden="true">⚡</span><span>Interface otimizada e intuitiva</span></div>',
      '    </div>',
      '    <div class="sei-credits-footer">',
      '      <span class="sei-credits-version">Versão 1.0.0</span>',
      '      <span class="sei-credits-copy">© 2025 SEI Smart. Todos os direitos reservados.</span>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    var closeBtn = host.querySelector('[data-sei-credits-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', function(){ closeCreditsOverlay(container); });
    }

    overlay.classList.add('sei-credits-open');
    if (!overlay.__escHandler) {
      overlay.__escHandler = function(ev){ if (ev.key === 'Escape') closeCreditsOverlay(container); };
      document.addEventListener('keydown', overlay.__escHandler);
    }
  }

  function closeCreditsOverlay(container) {
    var overlay = null;
    if (container) {
      overlay = container.querySelector('.sei-credits-overlay');
    }
    if (!overlay) {
      overlay = document.getElementById('sei-global-credits-overlay');
    }
    if (!overlay) {
      // Tentar encontrar qualquer overlay de créditos aberto
      overlay = document.querySelector('.sei-credits-overlay.sei-credits-open');
    }
    if (overlay) {
      overlay.classList.remove('sei-credits-open');
      if (overlay.__escHandler) {
        document.removeEventListener('keydown', overlay.__escHandler);
        overlay.__escHandler = null;
      }
    }
  }

  var SCRIPT_BASE_URL = (function(){
    try {
      if (document.currentScript && document.currentScript.src) {
        return document.currentScript.src.replace(/\/[^/]*$/, '/');
      }
    } catch(e){}
    try {
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        var src = scripts[i].getAttribute('src');
        if (src && src.indexOf('sei-pro-arvore.js') !== -1) {
          return src.replace(/\/[^/]*$/, '/');
        }
      }
    } catch(e){}
    return '';
  })();

  function resolveExtensionUrl(resource) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
        return chrome.runtime.getURL(resource);
      }
    } catch(e){}
    if (SCRIPT_BASE_URL) {
      return SCRIPT_BASE_URL + resource;
    }
    try {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].getAttribute('src') || '';
        if (src.indexOf('sei-pro-arvore.js') !== -1 || src.indexOf('credits-template.js') !== -1) {
          return src.replace(/\/[^/]*$/, '/' + resource);
        }
      }
    } catch(e){}
    return resource;
  }

  var creditsTemplatePromise = null;

  function ensureCreditsTemplate() {
    if (window.SeiCreditsTemplate && typeof window.SeiCreditsTemplate.getHtml === 'function') {
      return Promise.resolve(window.SeiCreditsTemplate);
    }
    if (creditsTemplatePromise) return creditsTemplatePromise;
    creditsTemplatePromise = new Promise(function(resolve, reject){
      try {
        var script = document.createElement('script');
        script.src = resolveExtensionUrl('credits-template.js');
        script.charset = 'UTF-8';
        script.type = 'text/javascript';
        script.onload = function(){ 
          // Aguardar um pouco para garantir que o script foi executado
          setTimeout(function(){
            if (window.SeiCreditsTemplate && typeof window.SeiCreditsTemplate.getHtml === 'function') {
              resolve(window.SeiCreditsTemplate);
            } else {
              creditsTemplatePromise = null;
              reject(new Error('Template não disponível após carregamento'));
            }
          }, 50);
        };
        script.onerror = function(err){ 
          creditsTemplatePromise = null; 
          reject(err || new Error('Falha ao carregar template de créditos')); 
        };
        (document.head || document.documentElement).appendChild(script);
      } catch(e) {
        creditsTemplatePromise = null;
        reject(e);
      }
    });
    return creditsTemplatePromise;
  }

  function getOrCreateCreditsOverlay() {
    var overlay = document.getElementById('sei-global-credits-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sei-global-credits-overlay';
      overlay.className = 'sei-credits-overlay';
      var wrapper = document.createElement('div');
      wrapper.className = 'sei-credits-card-wrapper';
      overlay.appendChild(wrapper);
      overlay.__seiHost = wrapper;
      overlay.addEventListener('click', function(ev){
        if (ev.target === overlay) {
          closeCreditsOverlay();
        }
      });
      (document.body || document.documentElement).appendChild(overlay);
    }
    return overlay;
  }

  function openCreditsOverlay() {
    ensureCreditsStyles();
    return ensureCreditsTemplate().then(function(template){
      if (!template) throw new Error('Template indisponível');
      var overlay = getOrCreateCreditsOverlay();
      var host = overlay.__seiHost || overlay.querySelector('.sei-credits-card-wrapper');
      if (host) {
        if (typeof template.inject === 'function') {
          template.inject(host, { onClose: closeCreditsOverlay });
        } else if (typeof template.getHtml === 'function') {
          host.innerHTML = template.getHtml();
          var closeBtn = host.querySelector('[data-sei-credits-close]');
          if (closeBtn) closeBtn.addEventListener('click', closeCreditsOverlay);
        }
      }
      overlay.classList.add('sei-credits-open');
      if (!overlay.__escHandler) {
        overlay.__escHandler = function(ev){ if (ev.key === 'Escape') closeCreditsOverlay(); };
        document.addEventListener('keydown', overlay.__escHandler);
      }
    });
  }

  function closeCreditsOverlay() {
    var overlay = document.getElementById('sei-global-credits-overlay');
    if (!overlay) return;
    overlay.classList.remove('sei-credits-open');
    if (overlay.__escHandler) {
      document.removeEventListener('keydown', overlay.__escHandler);
      overlay.__escHandler = null;
    }
  }

  function ensureCreditsStyles() {
    if (document.getElementById('sei-credits-style')) return;
    var css = [
      '.sei-credits-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(13,30,64,.72);backdrop-filter:blur(4px);padding:24px;z-index:2147483646;}',
      '.sei-credits-overlay.sei-credits-open{display:flex;}',
      '.sei-credits-card-wrapper{max-width:480px;width:90%;}',
      '.sei-credits-card{background:#ffffff;border-radius:20px;box-shadow:0 24px 50px rgba(15,29,61,.22);padding:26px 28px;display:flex;flex-direction:column;gap:22px;font-family:"Segoe UI",Tahoma,sans-serif;}',
      '.sei-credits-header{display:flex;justify-content:space-between;align-items:center;gap:16px;}',
      '.sei-credits-header h3{margin:0;font-size:20px;color:#0f1d3d;font-weight:700;}',
      '.sei-credits-close{border:none;background:#0d6efd;color:#fff;border-radius:999px;padding:6px 14px;font-size:13px;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease;}',
      '.sei-credits-close:hover{transform:translateY(-1px);box-shadow:0 12px 24px rgba(13,110,253,.25);}',
      '.sei-credits-body{display:flex;flex-direction:column;gap:20px;color:#1c2c4d;font-size:14px;}',
      '.sei-credits-developer{display:flex;gap:16px;align-items:center;}',
      '.sei-credits-avatar{width:54px;height:54px;border-radius:18px;background:linear-gradient(135deg,#4da2ff 0%,#0d6efd 100%);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;box-shadow:0 12px 30px rgba(13,110,253,.28);}',
      '.sei-credits-name{margin:0;font-size:16px;color:#0f1d3d;font-weight:600;}',
      '.sei-credits-role{margin:4px 0 10px;color:#4a5978;font-size:13px;}',
      '.sei-credits-contact{display:inline-flex;align-items:center;gap:8px;color:#0d6efd;text-decoration:none;font-weight:600;font-size:13px;}',
      '.sei-credits-contact:hover{text-decoration:underline;}',
      '.sei-credits-features{display:flex;flex-direction:column;gap:10px;}',
      '.sei-credits-feature{display:flex;gap:10px;align-items:center;color:#364468;font-size:13px;}',
      '.sei-credits-footer{text-align:center;font-size:12px;color:#4a5978;display:flex;flex-direction:column;gap:4px;}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'sei-credits-style';
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(style);
  }

  var DEFAULT_CREDITS_TEMPLATE_HTML = [
    '<div class="sei-credits-card" role="dialog" aria-modal="true">',
    '  <div class="sei-credits-header">',
    '    <h3>🎉 Créditos - SEI Smart</h3>',
    '    <button type="button" class="sei-credits-close" data-sei-credits-close>Fechar</button>',
    '  </div>',
    '  <div class="sei-credits-body">',
    '    <div class="sei-credits-developer">',
    '      <div class="sei-credits-avatar" aria-hidden="true">SF</div>',
    '      <div class="sei-credits-info">',
    '        <h4 class="sei-credits-name">Steferson Ferreira</h4>',
    '        <p class="sei-credits-role">Desenvolvedor & Criador</p>',
    '        <a class="sei-credits-contact" href="mailto:steferson.ferreira@gmail.com" target="_blank" rel="noopener">',
    '          <span aria-hidden="true">✉️</span>',
    '          <span>steferson.ferreira@gmail.com</span>',
    '        </a>',
    '      </div>',
    '    </div>',
    '    <div class="sei-credits-features">',
    '      <div class="sei-credits-feature"><span aria-hidden="true">🤖</span><span>Geração automática de despachos com IA</span></div>',
    '      <div class="sei-credits-feature"><span aria-hidden="true">📄</span><span>Modelos personalizados de documentos</span></div>',
    '      <div class="sei-credits-feature"><span aria-hidden="true">📸</span><span>Captura automática de texto</span></div>',
    '      <div class="sei-credits-feature"><span aria-hidden="true">⚡</span><span>Interface otimizada e intuitiva</span></div>',
    '    </div>',
    '    <div class="sei-credits-footer">',
    '      <span class="sei-credits-version">Versão 1.0.0</span>',
    '      <span class="sei-credits-copy">© 2025 SEI Smart. Todos os direitos reservados.</span>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('');

  if (!window.SeiCreditsTemplate) {
    window.SeiCreditsTemplate = {
      getHtml: function(){ return DEFAULT_CREDITS_TEMPLATE_HTML; },
      inject: function(container, options){
        if (!container) return null;
        container.innerHTML = DEFAULT_CREDITS_TEMPLATE_HTML;
        var closeBtn = container.querySelector('[data-sei-credits-close]');
        if (closeBtn) {
          closeBtn.addEventListener('click', function(ev){
            try { ev.preventDefault(); } catch(e){}
            if (options && typeof options.onClose === 'function') {
              options.onClose();
            }
          });
        }
        return container;
      }
    };
  }
})();

