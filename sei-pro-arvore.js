
/*! sei-pro-arvore.lazy.ext.v3.js
 * Resolução robusta do caminho do Dropzone (evita 404 em domínio do site):
 * Ordem: window.SEI_PRO_DROPZONE_SRC → chrome.runtime.getURL('/lib/dropzone.min.js') →
 *        new URL('lib/dropzone.min.js', document.currentScript.src) → '/lib/dropzone.min.js'
 * Botão flutuante + boot no clique (idempotente, sem logs).
 */

(function(){
  var UPLOAD_BUTTON_ID = "btnUploadArvoreFloating";
  var DROPZONE_READY_FLAG = "__sei_pro_dropzone_ready__";
  var FALLBACK_MODAL_ID = "sei-pro-arvore-modal";
  var FALLBACK_STYLE_ID = "sei-pro-arvore-modal-style";
  var BOOT_DONE = false;
  var SVG_ICON_MARKUP = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 6v14"/><polyline points="10 12 16 6 22 12"/><rect x="8" y="22" width="16" height="4" fill="#ffffff"/></svg>';
  var UPLOAD_ICON_DATA_URI = "data:image/svg+xml," + encodeURIComponent(SVG_ICON_MARKUP);
  var MANUAL_UPLOAD_TRIGGER_FLAG = "__seiProManualTrigger";

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

    function processEscolherTipo(url, queuedFiles, mode, result, arrayDropzone, $container){
      console.debug('[SEIPro] processEscolherTipo', url);
      requestHTMLWithHttps(url).then(function(html){
        var doc = parseHTMLDocument(html, url);
        var $html = $(doc);
        var hasCadastro = $html.find('#frmDocumentoCadastro').length > 0;
        if (hasCadastro) {
          console.debug('[SEIPro] processEscolherTipo -> formulário de cadastro detectado');
          window.submitUploadArvore(html, queuedFiles, mode, result, arrayDropzone, $container);
          return;
        }
        var hasEscolherForm = $html.find('#frmDocumentoEscolherTipo').length > 0;
        if (hasEscolherForm) {
          console.debug('[SEIPro] processEscolherTipo -> formulário escolher tipo detectado');
          window.ajaxPostUploadArvore($html, queuedFiles, mode, result, arrayDropzone, $container);
          return;
        }
        var followReceber = ensureHttps(getFirstHref(doc, 'a[href*="controlador.php?acao=documento_receber"]'), url);
        if (!followReceber) {
          var match = html.match(/https?:\/\/[^"'\s]*controlador\.php\?[^"'\s]*acao=documento_receber[^"']*/i) || html.match(/controlador\.php\?[^"'\s]*acao=documento_receber[^"']*/i);
          if (match && match[0]) followReceber = ensureHttps(match[0], url);
        }
        if (followReceber) {
          console.debug('[SEIPro] processEscolherTipo -> encaminhando para documento_receber', followReceber);
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
      console.debug('[SEIPro] processUploadAnexo', url);
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
        console.debug('[SEIPro] processUploadAnexo página carregada');
        var doc = parseHTMLDocument(html, url);
        window.submitUploadArvore(doc.documentElement.outerHTML, queuedFiles, mode, result, arrayDropzone, $container);
      }).catch(function(err){
        console.error('[SEIPro] processUploadAnexo falhou', err);
        queueFallback(queuedFiles);
      });
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
      if (loc && loc.protocol === 'https:' && parsed.protocol === 'http:' && parsed.hostname === loc.hostname) {
        parsed.protocol = 'https:';
        if (parsed.port === '80') parsed.port = '';
        return parsed.toString();
      }
      return normalized;
    } catch(e){
      return normalized;
    }
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

  function requestHTMLWithHttps(url, opts){
    return new Promise(function(resolve, reject){
      var target = ensureHttps(url);
      console.debug('[SEIPro] requestHTMLWithHttps->', target);
      $.ajax(Object.assign({
        url: target,
        type: 'GET',
        dataType: 'text',
        success: function(data, textStatus, jqXHR){
          var statusCode = jqXHR && jqXHR.status;
          console.debug('[SEIPro] ajax sucesso', statusCode, (data || '').slice(0, 200));
          if (typeof data === 'string' && data.trim().length) {
            resolve(data);
            return;
          }
          try {
            console.debug('[SEIPro] Ajax retornou vazio, tentando fallback síncrono', target);
            var xhr = new XMLHttpRequest();
            xhr.open('GET', target, false);
            xhr.send(null);
            console.debug('[SEIPro] Fallback status', xhr.status, 'texto', xhr.responseText ? xhr.responseText.slice(0, 200) : '');
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
          console.error('[SEIPro] requestHTMLWithHttps falhou', jqXHR ? jqXHR.status : 'sem status', errorThrown);
          reject(errorThrown || textStatus);
        }
      }, opts || {}));
    });
  }

  function pushUniqueLink(name, url){
    if (!url) return;
    try { console.debug('[SEIPro] pushUniqueLink candidato', name, url); } catch(e){}
    url = ensureHttps(url);
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

    for (var i = 0; i < docsToCheck.length; i++) {
      var links = extractLinksArvoreFromScripts(docsToCheck[i]);
      if (links && links.length) {
        pushUniqueLink('Incluir Documento', links[0]);
        return;
      }
    }
    console.warn('[SEIPro] Não foi possível localizar o link "Incluir Documento" nos scripts da árvore.');
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
        if (val === null || typeof val === "undefined") return "";
        try { return encodeURIComponent(val); } catch(e){ return val; }
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
          console.debug('[SEIPro] ajaxPostUploadArvore -> sucesso');
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
        requestHTMLWithHttps(urlDocExterno).then(function (htmlAnexo) {
          window.submitUploadArvore(htmlAnexo, queuedFiles, mode, result, arrayDropzone, _containerUpload);
        }).catch(function(){});
      };
    }

    if (typeof window.submitUploadArvore !== "function") {
      window.submitUploadArvore = function(htmlAnexo, queuedFiles, mode, result, arrayDropzone, _containerUpload) {
        console.debug('[SEIPro] submitUploadArvore invocado, tamanho html', htmlAnexo ? htmlAnexo.length : 0);
        var $htmlAnexo = $(htmlAnexo);
        var form = $htmlAnexo.find('#frmDocumentoCadastro');
        console.debug('[SEIPro] submitUploadArvore form encontrado?', form.length);
        if (!form.length) {
          console.warn('[SEIPro] submitUploadArvore: formulário #frmDocumentoCadastro não encontrado.');
          queueFallback(queuedFiles);
          return;
        }
        var hrefFormRaw = form.attr('action');
        var hrefForm = ensureHttps(hrefFormRaw);
        console.debug('[SEIPro] submitUploadArvore action', hrefFormRaw, 'normalizado', hrefForm);
        var urlUpload = '';
        var extUpload = [];
        var userUnidade = '';
        $.each(htmlAnexo.split('\n'), function(index, value) {
          if (value.indexOf("objUpload = new infraUpload") !== -1) {
            var parsedUpload = value.split("'")[3];
            urlUpload = ensureHttps(parsedUpload, hrefForm);
            console.debug('[SEIPro] submitUploadArvore urlUpload detectado', urlUpload);
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
        console.debug('[SEIPro] submitUploadArvore extUpload', extUpload, 'userUnidade', userUnidade);
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
        param.txtNumero = window.escapeComponent(processedNameFile);

        console.debug('[SEIPro] submitUploadArvore parâmetros finais', {
          urlUpload: urlUpload,
          hrefForm: hrefForm,
          selSerie: selSerie,
          selSerieSelected: selSerieSelected,
          valueSigilo: valueSigilo,
          valueNivelAcesso: valueNivelAcesso
        });

        if (arrayDropzone) {
          arrayDropzone.options.url = ensureHttps(urlUpload);
          arrayDropzone.options.params = {
            urlForm: hrefForm,
            paramsForm: param,
            userUnidade: userUnidade
          };
          console.debug('[SEIPro] submitUploadArvore configurando Dropzone', arrayDropzone.options);
          arrayDropzone.processQueue();
        } else {
          console.warn('[SEIPro] submitUploadArvore: arrayDropzone ausente, não foi possível processar fila.');
        }
      };
    }

    if (typeof window.sendUploadArvore !== "function") {
      window.sendUploadArvore = function(mode, result, arrayDropzone, _containerUpload) {
        console.debug('[SEIPro] sendUploadArvore chamado', { mode: mode, result: result, arrayDropzone: !!arrayDropzone });
        var isInternalUpload = (mode === 'upload' && result === false);
        if (mode === 'upload' && !window[MANUAL_UPLOAD_TRIGGER_FLAG] && !isInternalUpload) {
          console.debug('[SEIPro] sendUploadArvore ignorando disparo automático; aguardando clique manual.');
          return;
        }
        var fallback = window.__seiProArvoreFallbackSelector || fallbackSelector;
        var $container = _containerUpload ? $(_containerUpload) : $(fallback);
        var dzInstance = arrayDropzone || window.arvoreDropzone;
        if (!dzInstance && window.dropzoneInstance) dzInstance = window.dropzoneInstance;
        console.debug('[SEIPro] sendUploadArvore dropzone detectada?', !!dzInstance);
        if (!dzInstance) return;

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
        if (mode === 'upload' && hasQueued) {
          window[MANUAL_UPLOAD_TRIGGER_FLAG] = false;
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
          console.debug('[SEIPro] Link documento_receber normalizado', href);
          try {
            var loc = window.location;
            var parsed = href ? new URL(href, loc ? loc.origin : undefined) : null;
            if (!parsed || parsed.hostname !== (loc && loc.hostname) || /sip\/login\.php/i.test(parsed.pathname)) {
              console.warn('[SEIPro] Link documento_receber descartado (host/SIP):', href);
              href = null;
            } else {
              href = parsed.toString();
            }
          } catch(e){ href = null; }
          if (!href) {
            var elem = $container.find('.dz-preview').eq(0);
            if (elem.length) elem.addClass('dz-error').find('.dz-error-message span').text('Link para  cumento não encontrado ou processo indisponível.');
            queueFallback(queuedFiles);
            return;
          }
          console.debug('[SEIPro] Requisitando página de séries', href);
          requestHTMLWithHttps(href).then(function(html){
            console.debug('[SEIPro] HTML bruto documentação', html.slice(0, 200));
            var doc = parseHTMLDocument(html, href);
            var $html = $(doc);
            console.debug('[SEIPro] Documento HTML parseado', $html);

            function sanitizeName(value) {
              if (!value) return '';
              var result = value.replace(/[_:]/g, ' ').trim().toLowerCase();
              try {
                if (parentCandidate && typeof parentCandidate.removeAcentos === 'function') {
                  result = parentCandidate.removeAcentos(result);
                }
              } catch(e){}
              return result;
            }

            var hasEscolherForm = $html.find('#frmDocumentoEscolherTipo').length > 0;
            var hasCadastro = $html.find('#frmDocumentoCadastro').length > 0;
            var urlUploadAnexo = ensureHttps(getFirstHref(doc, 'form[action*="acao=documento_upload_anexo"]'), href);
            if (!urlUploadAnexo) {
              var matchUploadAnexo = html.match(/https?:\/\/[^"'\s]*controlador\.php\?[^"'\s]*acao=documento_upload_anexo[^"']*/i) || html.match(/controlador\.php\?[^"'\s]*acao=documento_upload_anexo[^"']*/i);
              if (matchUploadAnexo && matchUploadAnexo[0]) urlUploadAnexo = ensureHttps(matchUploadAnexo[0], href);
            }

            var seriesSelection = null;
            try {
              var table = $html.find('#tblSeries');
              if (table.length) {
                var queuedFile = queuedFiles[0];
                var nameDoc = queuedFile ? queuedFile.name || '' : '';
                var nameDocProcessed = sanitizeName(nameDoc);
                if (nameDocProcessed.indexOf('.') !== -1) {
                  nameDocProcessed = nameDocProcessed.substring(0, nameDocProcessed.lastIndexOf('.'));
                }
                table.find('tbody tr').each(function(){
                  if (seriesSelection) return false;
                  var $row = $(this);
                  var desc = ($row.data('desc') || '').toString().trim();
                  if (!desc) return;
                  var processedDesc = sanitizeName(desc);
                  if (!processedDesc) return;
                  var reg = new RegExp('^\\b' + escapeRegExp(processedDesc));
                  if (reg.test(nameDocProcessed)) {
                    var anchor = $row.find('a.ancoraOpcao').first();
                    var hrefCandidate = anchor && anchor.attr('href');
                    var serieValue = $row.find('input').first().val();
                    seriesSelection = {
                      urlDoc: hrefCandidate && hrefCandidate !== '#' ? ensureHttps(hrefCandidate, href) : null,
                      requiresPost: !hrefCandidate || hrefCandidate === '#',
                      serieValue: serieValue || null,
                      matchText: desc
                    };
                    return false;
                  }
                });
                if (!seriesSelection) {
                  var firstRow = table.find('tbody tr').first();
                  if (firstRow.length) {
                    var firstAnchor = firstRow.find('a.ancoraOpcao').first();
                    var firstHref = firstAnchor && firstAnchor.attr('href');
                    seriesSelection = {
                      urlDoc: firstHref && firstHref !== '#' ? ensureHttps(firstHref, href) : null,
                      requiresPost: !firstHref || firstHref === '#',
                      serieValue: firstRow.find('input').first().val() || null,
                      matchText: firstRow.data('desc') || ''
                    };
                  }
                }
              }
            } catch(e) {
              console.warn('[SEIPro] Falha ao analisar tblSeries', e);
            }

            var urlEscolherTipo = ensureHttps(getFirstHref(doc, 'a[href*="controlador.php?acao=documento_escolher_tipo"]'), href);
            if (!urlEscolherTipo) {
              var matchEscolher = html.match(/https?:\/\/[^"'\s]*controlador\.php\?[^"'\s]*acao=documento_escolher_tipo[^"']*/i) || html.match(/controlador\.php\?[^"'\s]*acao=documento_escolher_tipo[^"']*/i);
              if (matchEscolher && matchEscolher[0]) urlEscolherTipo = ensureHttps(matchEscolher[0], href);
            }

            console.debug('[SEIPro] seriesSelection', seriesSelection);
            console.debug('[SEIPro] hasEscolherForm', hasEscolherForm, 'hasCadastro', hasCadastro, 'urlUploadAnexo', urlUploadAnexo);

            if (seriesSelection) {
              if (seriesSelection.requiresPost) {
                console.debug('[SEIPro] Serie exige POST, selecionando via ajaxPostUploadArvore', seriesSelection);
                window.__seiProSelectedSerieValue = seriesSelection.serieValue || null;
                window.ajaxPostUploadArvore($html, queuedFiles, mode, result, dzInstance, $container);
                return;
              }
              if (seriesSelection.urlDoc) {
                console.debug('[SEIPro] Serie possui link direto para documento_receber', seriesSelection.urlDoc);
                window.ajaxGetUploadArvore(seriesSelection.urlDoc, queuedFiles, mode, result, dzInstance, $container);
                return;
              }
            }

            if (hasCadastro) {
              window.submitUploadArvore(html, queuedFiles, mode, result, dzInstance, $container);
            } else if (hasEscolherForm) {
              window.ajaxPostUploadArvore($html, queuedFiles, mode, result, dzInstance, $container);
            } else if (urlEscolherTipo) {
              processEscolherTipo(urlEscolherTipo, queuedFiles, mode, result, dzInstance, $container);
            } else if (urlUploadAnexo) {
              console.debug('[SEIPro] Fluxo detectado direto para documento_upload_anexo', urlUploadAnexo);
              processUploadAnexo(urlUploadAnexo, queuedFiles, mode, result, dzInstance, $container);
            } else {
              console.warn('[SEIPro] Erro ao requisitar formulário de série');
              queueFallback(queuedFiles);
            }
          }).catch(function(err){
            console.error('[SEIPro] Falha ao obter documento_receber', err);
            queueFallback(queuedFiles);
          });
        } else if (mode === 'save' && result) {
          var hrefFormRaw = result.urlForm;
          var hrefForm = ensureHttps(hrefFormRaw);
          var paramForm = result.paramsForm;
          console.debug('[SEIPro] salvage POST documento_receber', hrefFormRaw, '->', hrefForm);
          var xhr = new XMLHttpRequest();
          $.ajax({
            method: 'POST',
            data: paramForm,
            url: hrefForm,
            contentType: 'application/x-www-form-urlencoded; charset=ISO-8859-1',
            xhr: function(){ return xhr; }
          }).done(function (htmlResult) {
            var finalUrl = xhr.responseURL || hrefForm;
            console.debug('[SEIPro] save retorno final URL', finalUrl);
            var status = (finalUrl && finalUrl.indexOf('acao=arvore_visualizar&acao_origem=documento_receber') !== -1);
            console.debug('[SEIPro] save retorno', finalUrl, 'status', status, 'snippet', (htmlResult || '').slice(0, 200));
            if (status) {
              var ajaxUrl = null;
              try {
                var parsedFinal = new URL(finalUrl, window.location.href);
                parsedFinal.pathname = parsedFinal.pathname.replace('controlador.php', 'controlador_ajax.php');
                parsedFinal.searchParams.set('acao_ajax', 'documento_recebido_duplicado');
                parsedFinal.searchParams.delete('acao');
                ajaxUrl = parsedFinal.toString();
              } catch(e) {
                console.warn('[SEIPro] Não foi possível construir URL documento_recebido_duplicado', e);
              }
              var followUp = function(){
                window.sendUploadArvore('upload', false, dzInstance, $container);
                window.getInfoArvoreLastDoc(htmlResult, finalUrl, dzInstance, $container);
              };
              if (ajaxUrl) {
                console.debug('[SEIPro] save disparando documento_recebido_duplicado', ajaxUrl);
                $.ajax({ url: ajaxUrl, method: 'GET' }).done(function(resp){
                  console.debug('[SEIPro] documento_recebido_duplicado retorno', (resp || '').toString().slice(0, 120));
                }).fail(function(err){
                  console.warn('[SEIPro] documento_recebido_duplicado falhou', err);
                }).always(function(){
                  followUp();
                });
              } else {
                followUp();
              }
            } else {
              var elem = $container.find('.dz-preview').eq(0);
              elem.addClass('dz-error').find('.dz-error-message span').text('Não foi possível completar o upload.');
              console.warn('[SEIPro] save retorno inesperado, snippet:', (htmlResult || '').slice(0, 300));
              queueFallback(queuedFiles);
            }
          }).fail(function(err){
            console.error('[SEIPro] save falhou', err);
            queueFallback(queuedFiles);
          });
        }
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
      "#"+FALLBACK_MODAL_ID+"{position:fixed;top:0;left:0;width:100%;height:100%;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:999998;padding:16px;box-sizing:border-box;}",
      "#"+FALLBACK_MODAL_ID+".sei-pro-open{display:flex;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-content{background:#fff;width:100%;max-width:520px;border-radius:12px;box-shadow:0 18px 32px rgba(0,0,0,.28);padding:20px;display:flex;flex-direction:column;gap:14px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-header{display:flex;align-items:center;justify-content:space-between;gap:12px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-header h2{margin:0;font-size:18px;color:#0f1d3d;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-close{border:none;background:none;color:#4a4a4a;font-size:24px;line-height:1;cursor:pointer;padding:4px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-close:hover{color:#000;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-instructions{margin:0;color:#4a4a4a;font-size:14px;line-height:1.4;}",
      "#sei-pro-upload-form{border:2px dashed #017FFF;border-radius:10px;padding:28px;min-height:180px;display:flex;align-items:center;justify-content:center;text-align:center;background:#f7faff;transition:background .2s,border-color .2s;}",
      "#sei-pro-upload-form:hover{background:#eef4ff;}",
      "#sei-pro-upload-form.sei-pro-highlight{border-color:#ff5252;background:#fff5f5;}",
      "#sei-pro-upload-form.dz-started{justify-content:flex-start;flex-wrap:wrap;overflow:auto;gap:12px;}",
      "#sei-pro-upload-form .dz-message{font-size:15px;color:#017FFF;margin:0;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-footer{display:flex;justify-content:flex-end;margin-top:4px;gap:10px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-footer button{border:none;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:14px;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-footer button.sei-pro-primary{background:#017FFF;color:#fff;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-footer button.sei-pro-primary:hover{filter:brightness(1.08);}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-footer button.sei-pro-secondary{background:#e0e6f3;color:#1d2b4a;}",
      "#"+FALLBACK_MODAL_ID+" .sei-pro-arvore-modal-footer button.sei-pro-secondary:hover{filter:brightness(0.97);}" 
    ].join("");
    var style = document.createElement("style");
    style.id = FALLBACK_STYLE_ID;
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureFallbackModal() {
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

    var title = document.createElement("h2");
    title.textContent = "Adicionar arquivos externos";

    var close = document.createElement("button");
    close.type = "button";
    close.className = "sei-pro-arvore-close";
    close.setAttribute("aria-label", "Fechar");
    close.textContent = "×";
    close.addEventListener("click", closeFallbackModal);

    header.appendChild(title);
    header.appendChild(close);

    var instructions = document.createElement("p");
    instructions.className = "sei-pro-arvore-instructions";
    instructions.textContent = "Selecione arquivos e clique em \"Enviar para a árvore\".";

    var form = document.createElement("form");
    form.id = "sei-pro-upload-form";
    form.className = "dropzone dz-arvore";

    var footer = document.createElement("div");
    footer.className = "sei-pro-arvore-modal-footer";

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

    footer.appendChild(uploadFooter);
    footer.appendChild(closeFooter);

    content.appendChild(header);
    content.appendChild(instructions);
    content.appendChild(form);
    content.appendChild(footer);

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
        uploadMultiple: true,
        parallelUploads: 6,
        clickable: true,
        addRemoveLinks: true,
        createImageThumbnails: false,
        dictDefaultMessage: "Clique ou arraste arquivos para adicionar"
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
    var modal = ensureFallbackModal();
    if (!modal) return;
    var dz = ensureFallbackDropzone();
    modal.classList.add("sei-pro-open");
    modal.style.display = "flex";
    if (dz && dz.hiddenFileInput) {
      try { dz.hiddenFileInput.click(); } catch(e){}
    }
  }

  function closeFallbackModal() {
    var modal = document.getElementById(FALLBACK_MODAL_ID);
    if (!modal) return;
    modal.classList.remove("sei-pro-open");
    modal.style.display = "none";
  }

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
    var css = [
      "#"+UPLOAD_BUTTON_ID+"{position:fixed;right:250px;bottom:16px;width:56px;height:56px;border-radius:50%;border:none;",
      "box-shadow:0 6px 12px rgba(0,0,0,.25);background:#017FFF;color:#fff;cursor:pointer;z-index:999999;display:inline-flex;",
      "align-items:center;justify-content:center;font-size:22px;line-height:1;}",
      "#"+UPLOAD_BUTTON_ID+":hover{filter:brightness(1.08);}",
      "#"+UPLOAD_BUTTON_ID+":focus-visible{outline:2px solid #ffffff;outline-offset:3px;}",
      "#"+UPLOAD_BUTTON_ID+" .sei-pro-arvore-icon{width:28px;height:28px;display:block;background-repeat:no-repeat;background-position:center;background-size:24px 24px;}"
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
    try {
      icon.style.backgroundImage = "url('" + UPLOAD_ICON_DATA_URI + "')";
    } catch(e){}
  }

  function createOrUpdateButton() {
    var doc = document;
    injectButtonStylesIfNeeded();
    var btn = doc.getElementById(UPLOAD_BUTTON_ID);
    if (!btn) {
      btn = doc.createElement("button");
      btn.id = UPLOAD_BUTTON_ID;
      btn.type = "button";
      btn.title = "Enviar arquivos externos";
      btn.setAttribute("aria-label", "Enviar arquivos externos");
      btn.addEventListener("click", onClickUpload, { once: false });
      (doc.body || doc.documentElement).appendChild(btn);
    }
    btn.style.display = "";
    btn.hidden = false;
    ensureButtonIcon(btn);
    return btn;
  }

  async function onClickUpload(e){
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    window[MANUAL_UPLOAD_TRIGGER_FLAG] = true;
    try { await ensureDropzoneScript(); } catch(err) { window[MANUAL_UPLOAD_TRIGGER_FLAG] = false; return; }
    var ok = idempotentInit();
    if (!ok) return;
    try { registerLegacyUploadFunctions(); } catch(e){}
    var usedNative = false;
    try {
      if (typeof window.openModalDropzone === "function") {
        window.openModalDropzone();
        usedNative = true;
      }
    } catch(e){}
    try {
      if (typeof window.sendUploadArvore === "function") {
        var fn = window.sendUploadArvore;
        window.sendUploadArvore("upload");
        if (!fn.__seiProArvorePolyfill) {
          usedNative = true;
        }
      }
    } catch(e){}
    if (!usedNative) {
      try { openFallbackModal(); } catch(e){}
    }
  }

  function ensureUploadButton() {
    if (BOOT_DONE) return;
    BOOT_DONE = true;

    function attempt() {
      if (document.body || document.documentElement) {
        createOrUpdateButton(); return true;
      }
      return false;
    }

    if (!attempt()) {
      var t0 = Date.now();
      var timer = setInterval(function(){
        if (attempt() || (Date.now()-t0) > 10000) clearInterval(timer);
      }, 120);
      try {
        var mo = new MutationObserver(function(){
          if (attempt()) { try { mo.disconnect(); } catch(e){} }
        });
        mo.observe(document.documentElement || document, { childList: true, subtree: true });
      } catch(e){}
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", attempt, { once: true });
      }
    }
  }

  function extractLinksArvoreFromScripts(doc){
    var results = [];
    if (!doc) return results;
    try {
      var scripts = doc.querySelectorAll('script');
      for (var i = 0; i < scripts.length; i++) {
        var script = scripts[i];
        if (script.getAttribute && script.getAttribute('src')) continue;
        var text = script.textContent || '';
        if (text.indexOf('Nos[0].acoes') === -1) continue;
        var regex = /controlador\.php\?[^"'\s]*acao=documento_escolher_tipo[^"'\s]*/gi;
        var match;
        while ((match = regex.exec(text))) {
          var url = match[0];
          if (!url) continue;
          url = url.replace(/&amp;/g, '&');
          results.push(url);
        }
        if (results.length) break;
      }
    } catch(e){
      console.debug('[SEIPro] Falha ao extrair scripts da árvore', e);
    }
    return results;
  }

  function escapeRegExp(str){
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function attachDropzoneHandlers(dz){
    if (!dz || dz.__seiProHandlersAttached) return;
    dz.__seiProHandlersAttached = true;
    try {
      dz.on('addedfile', function(file){
        console.debug('[SEIPro] Dropzone adicionou arquivo', file && file.name);
      });
    } catch(e){}
    try {
      dz.on('error', function(file, errorMessage){
        console.warn('[SEIPro] Dropzone erro', file && file.name, errorMessage);
        window[MANUAL_UPLOAD_TRIGGER_FLAG] = false;
      });
    } catch(e){}
    try {
      dz.on('queuecomplete', function(){
        console.debug('[SEIPro] Dropzone fila concluída');
        window[MANUAL_UPLOAD_TRIGGER_FLAG] = false;
      });
    } catch(e){}
    try {
      dz.on('success', function(file, response){
        console.debug('[SEIPro] Dropzone sucesso', file && file.name);
        try {
          var params = dz.options && dz.options.params;
          if (!params || !params.paramsForm) {
            console.warn('[SEIPro] Dropzone sucesso sem paramsForm configurado');
            return;
          }
          var rawResponse = '';
          if (typeof response === 'string') {
            rawResponse = response;
          } else if (response && typeof response === 'object' && typeof response.join === 'function') {
            rawResponse = response.join('#');
          }
          if (!rawResponse && file && file.xhr) {
            rawResponse = file.xhr.response || file.xhr.responseText || '';
          }
          var parts = rawResponse ? rawResponse.split('#') : [];
          if (typeof window.encodeUrlUploadArvore === 'function') {
            try {
              params.paramsForm.hdnAnexos = window.encodeUrlUploadArvore(parts, params);
            } catch(e) {
              console.warn('[SEIPro] Falha ao calcular hdnAnexos', e);
            }
          }
          var postData = '';
          for (var key in params.paramsForm) {
            if (!Object.prototype.hasOwnProperty.call(params.paramsForm, key)) continue;
            if (postData !== '') postData += '&';
            var valor = (key === 'hdnAnexos') ? params.paramsForm[key] : window.escapeComponent(params.paramsForm[key]);
            if (key === 'txtNumero') {
              try {
                valor = parentCandidate.encodeURI_toHex ? parentCandidate.encodeURI_toHex((params.paramsForm[key] || '').normalize('NFC')) : valor;
              } catch(e) {}
            }
            postData += key + '=' + (valor || '');
          }
          params.paramsForm = postData;
          console.debug('[SEIPro] Dropzone sucesso chamando sendUploadArvore save');
          window[MANUAL_UPLOAD_TRIGGER_FLAG] = false;
          var containerUploadJq = null;
          try {
            if (typeof window.jQuery === 'function' && dz.element) {
              containerUploadJq = window.jQuery(dz.element);
            }
          } catch(e){}
          window.sendUploadArvore('save', params, dz, containerUploadJq);
        } catch(err) {
          console.error('[SEIPro] Erro no handler de sucesso do Dropzone', err);
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
})();

