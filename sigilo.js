/**
 * SEI Smart - Interface de Gerenciamento de Sigilo
 * Controla a UI para marcar e ocultar informações sigilosas
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elementos
    const tabs = document.querySelectorAll('.sigilo-tab');
    const contents = document.querySelectorAll('.sigilo-content');
    
    const inputTexto = document.getElementById('inputTexto');
    const btnMarcarTexto = document.getElementById('btnMarcarTexto');
    const btnMarcarDados = document.getElementById('btnMarcarDados');
    const btnAplicarTarjas = document.getElementById('btnAplicarTarjas');
    const btnRemoverMarcas = document.getElementById('btnRemoverMarcas');
    const btnFechar = document.getElementById('btnFechar');
    
    const targetSeiTab = document.getElementById('targetSeiTab');
    const reloadSeiTabs = document.getElementById('reloadSeiTabs');

    const resultTexto = document.getElementById('resultTexto');
    const resultDados = document.getElementById('resultDados');
    const resultTarjas = document.getElementById('resultTarjas');
    const resultRemover = document.getElementById('resultRemover');

    // Gerenciamento de tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        });
    });

    // Marcar texto específico
    btnMarcarTexto.addEventListener('click', async () => {
        const texto = inputTexto.value.trim();
        
        if (!texto) {
            showResult(resultTexto, 'Digite um texto para marcar', 'error');
            return;
        }

        btnMarcarTexto.disabled = true;
        showResult(resultTexto, 'Processando...', 'info');

        try {
            const result = await executeInSEI('marcarTexto', texto);
            
            if (result.success) {
                showResult(resultTexto, `✅ ${result.message}`, 'success');
                inputTexto.value = '';
                await atualizarEstatisticas();
            } else {
                showResult(resultTexto, `ℹ️ ${result.message}`, 'info');
            }
        } catch (error) {
            showResult(resultTexto, `❌ Erro: ${error.message}`, 'error');
        } finally {
            btnMarcarTexto.disabled = false;
        }
    });

    // Enter no input
    inputTexto.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnMarcarTexto.click();
        }
    });

    // Marcar dados pessoais
    btnMarcarDados.addEventListener('click', async () => {
        btnMarcarDados.disabled = true;
        showResult(resultDados, 'Procurando CPFs e e-mails...', 'info');

        try {
            const result = await executeInSEI('marcarDadosPessoais');
            
            if (result.success) {
                const detalhes = result.details 
                    ? ` (${result.details.cpfs} CPF${result.details.cpfs !== 1 ? 's' : ''}, ${result.details.emails} e-mail${result.details.emails !== 1 ? 's' : ''})`
                    : '';
                showResult(resultDados, `✅ ${result.message}${detalhes}`, 'success');
                await atualizarEstatisticas();
            } else {
                showResult(resultDados, `ℹ️ ${result.message}`, 'info');
            }
        } catch (error) {
            showResult(resultDados, `❌ Erro: ${error.message}`, 'error');
        } finally {
            btnMarcarDados.disabled = false;
        }
    });

    // Aplicar tarjas
    btnAplicarTarjas.addEventListener('click', async () => {
        btnAplicarTarjas.disabled = true;
        showResult(resultTarjas, 'Aplicando tarjas...', 'info');

        try {
            const result = await executeInSEI('aplicarTarjas');
            
            if (result.success) {
                showResult(resultTarjas, `✅ ${result.message}`, 'success');
                await atualizarEstatisticasTarjas();
            } else {
                showResult(resultTarjas, `ℹ️ ${result.message}`, 'info');
            }
        } catch (error) {
            showResult(resultTarjas, `❌ Erro: ${error.message}`, 'error');
        } finally {
            btnAplicarTarjas.disabled = false;
        }
    });

    // Remover marcas
    btnRemoverMarcas.addEventListener('click', async () => {
        if (!confirm('Tem certeza que deseja remover TODAS as marcas de sigilo?\n\nEsta ação não pode ser desfeita!')) {
            return;
        }

        btnRemoverMarcas.disabled = true;
        showResult(resultRemover, 'Removendo marcas...', 'info');

        try {
            const result = await executeInSEI('removerMarcas');
            
            showResult(resultRemover, `✅ ${result.message}`, 'success');
            await atualizarEstatisticas();
            await atualizarEstatisticasTarjas();
        } catch (error) {
            showResult(resultRemover, `❌ Erro: ${error.message}`, 'error');
        } finally {
            btnRemoverMarcas.disabled = false;
        }
    });

    // Fechar
    btnFechar.addEventListener('click', () => {
        window.close();
    });

    // Carregar lista de janelas do SEI
    async function loadSeiTabs() {
        try {
            console.log('🔄 [Sigilo] Carregando lista de janelas do SEI...');
            
            const allTabs = await chrome.tabs.query({});
            const seiTabs = allTabs.filter(tab => 
                tab.url && /\/sei\//i.test(tab.url)
            );

            console.log(`✅ [Sigilo] ${seiTabs.length} janelas do SEI encontradas`);

            // Limpar select
            targetSeiTab.innerHTML = '<option value="">Detectar automaticamente</option>';

            if (seiTabs.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '⚠️ Nenhuma janela do SEI aberta';
                option.disabled = true;
                targetSeiTab.appendChild(option);
                return;
            }

            // Separar janelas de documentos das outras
            const docTabs = seiTabs.filter(t => 
                t.url.includes('documento_visualizar') || 
                t.url.includes('controlador.php?acao=documento') ||
                t.url.includes('editor')
            );
            const otherTabs = seiTabs.filter(t => 
                !t.url.includes('documento_visualizar') && 
                !t.url.includes('controlador.php?acao=documento') &&
                !t.url.includes('editor')
            );

            // Adicionar janelas de documentos primeiro
            if (docTabs.length > 0) {
                const group = document.createElement('optgroup');
                group.label = '📄 Documentos (recomendado)';
                
                docTabs.forEach(tab => {
                    const option = document.createElement('option');
                    option.value = tab.id;
                    let title = tab.title || 'Janela do SEI';
                    if (title.length > 60) {
                        title = title.substring(0, 57) + '...';
                    }
                    option.textContent = `✅ ${title}`;
                    group.appendChild(option);
                });
                
                targetSeiTab.appendChild(group);
            }

            // Adicionar outras janelas
            if (otherTabs.length > 0) {
                const group = document.createElement('optgroup');
                group.label = '📋 Outras Janelas do SEI';
                
                otherTabs.forEach(tab => {
                    const option = document.createElement('option');
                    option.value = tab.id;
                    let title = tab.title || 'Janela do SEI';
                    if (title.length > 60) {
                        title = title.substring(0, 57) + '...';
                    }
                    option.textContent = title;
                    group.appendChild(option);
                });
                
                targetSeiTab.appendChild(group);
            }

            console.log('✅ [Sigilo] Lista de janelas carregada');
        } catch (error) {
            console.error('❌ [Sigilo] Erro ao carregar lista de janelas:', error);
        }
    }

    // Event listener para botão de recarregar
    reloadSeiTabs.addEventListener('click', () => {
        loadSeiTabs();
    });

    // Funções auxiliares
    function showResult(element, message, type = 'info') {
        element.textContent = message;
        element.className = `sigilo-result show ${type}`;
    }

    async function atualizarEstatisticas() {
        try {
            const stats = await executeInSEI('contarMarcas');
            
            document.getElementById('statMarcas').textContent = stats.marcas;
            document.getElementById('statTarjas').textContent = stats.tarjas;
            document.getElementById('statTotal').textContent = stats.total;
            
            document.getElementById('statsContainer').style.display = 
                stats.total > 0 ? 'grid' : 'none';
        } catch (error) {
            console.error('Erro ao atualizar estatísticas:', error);
        }
    }

    async function atualizarEstatisticasTarjas() {
        try {
            const stats = await executeInSEI('contarMarcas');
            
            document.getElementById('statMarcasTarjas').textContent = stats.marcas;
            document.getElementById('statTarjasTarjas').textContent = stats.tarjas;
            document.getElementById('statTotalTarjas').textContent = stats.total;
            
            document.getElementById('statsContainerTarjas').style.display = 
                stats.total > 0 ? 'grid' : 'none';
        } catch (error) {
            console.error('Erro ao atualizar estatísticas:', error);
        }
    }

    async function executeInSEI(action, param = null) {
        return new Promise((resolve, reject) => {
            console.log(`🔒 [Sigilo] Executando ação: ${action}`, param ? `com parâmetro: ${param}` : '');
            
            const selectedTabId = targetSeiTab.value;
            
            // Se uma janela específica foi selecionada
            if (selectedTabId) {
                console.log(`🎯 [Sigilo] Usando janela selecionada: ${selectedTabId}`);
                
                chrome.tabs.get(parseInt(selectedTabId), async (tab) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error('Janela selecionada não encontrada. Clique em "Atualizar Lista de Janelas".'));
                        return;
                    }

                    try {
                        console.log(`🔍 [Sigilo] Executando na aba ${tab.id}: ${tab.title}`);
                        
                        // ETAPA 1: Executar em todos os frames (allFrames: true) SEM world: MAIN
                        const results = await chrome.scripting.executeScript({
                            target: { tabId: tab.id, allFrames: true },
                            // NÃO usar world: 'MAIN' aqui, pois queremos executar no contexto da extensão primeiro
                            func: executeSigiloAction,
                            args: [action, param]
                        });

                        console.log(`📊 [Sigilo] Resultados:`, results.length, 'frames');

                        const validResult = results.find(r => r.result && r.result.executed);
                        
                        if (validResult) {
                            console.log(`✅ [Sigilo] Editor encontrado!`);
                            console.log(`📤 [Sigilo] Resultado:`, validResult.result);
                            
                            // ETAPA 2: Sincronizar com CKEDITOR usando world: MAIN (se necessário)
                            if (validResult.result.needsSync) {
                                console.log(`🔄 [Sigilo] Sincronizando com CKEDITOR...`);
                                await syncCKEditor(tab.id);
                            }
                            
                            resolve(validResult.result);
                        } else {
                            console.log(`⚠️ [Sigilo] Editor não encontrado`);
                            reject(new Error('Editor CKEditor não encontrado nesta janela. Selecione a janela do POPUP do editor (não a janela principal do SEI).'));
                        }
                    } catch (error) {
                        console.error(`❌ [Sigilo] Erro:`, error);
                        reject(error);
                    }
                });
            } else {
                // Modo automático - busca em todas as abas
                console.log(`🔍 [Sigilo] Modo automático - buscando em todas as abas`);
                
                chrome.tabs.query({}, async (allTabs) => {
                    console.log(`📋 [Sigilo] Total de abas abertas: ${allTabs.length}`);
                    
                    const seiTabs = allTabs.filter(tab => 
                        tab.url && /\/sei\//i.test(tab.url)
                    );

                    console.log(`🎯 [Sigilo] Abas do SEI encontradas: ${seiTabs.length}`);
                    seiTabs.forEach(tab => {
                        console.log(`  - Tab ${tab.id}: ${tab.title}`);
                    });

                    if (seiTabs.length === 0) {
                        reject(new Error('Nenhuma aba do SEI encontrada. Abra um documento no SEI primeiro.'));
                        return;
                    }

                    let foundEditor = false;

                    for (const tab of seiTabs) {
                        try {
                            console.log(`🔍 [Sigilo] Tentando executar na aba ${tab.id}: ${tab.title}`);
                            
                            const results = await chrome.scripting.executeScript({
                                target: { tabId: tab.id, allFrames: true },
                                func: executeSigiloAction,
                                args: [action, param]
                            });

                            console.log(`📊 [Sigilo] Resultados da aba ${tab.id}:`, results.length, 'frames');

                            const validResult = results.find(r => r.result && r.result.executed);
                            
                            if (validResult) {
                                console.log(`✅ [Sigilo] Editor encontrado na aba ${tab.id}!`);
                                console.log(`📤 [Sigilo] Resultado:`, validResult.result);
                                
                                // Sincronizar com CKEDITOR se necessário
                                if (validResult.result.needsSync) {
                                    console.log(`🔄 [Sigilo] Sincronizando com CKEDITOR...`);
                                    await syncCKEditor(tab.id);
                                }
                                
                                foundEditor = true;
                                resolve(validResult.result);
                                break;
                            } else {
                                console.log(`⚠️ [Sigilo] Editor não encontrado na aba ${tab.id}`);
                            }
                        } catch (error) {
                            console.error(`❌ [Sigilo] Erro na aba ${tab.id}:`, error);
                        }
                    }

                    if (!foundEditor) {
                        console.error('❌ [Sigilo] Nenhum editor encontrado em nenhuma aba');
                        reject(new Error('Editor CKEditor não encontrado. Selecione manualmente a janela do POPUP do editor no dropdown acima.'));
                    }
                });
            }
        });
    }
    
    // Função auxiliar para sincronizar com CKEDITOR
    async function syncCKEditor(tabId) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                world: 'MAIN',
                func: () => {
                    console.log('🔄 [Sigilo SYNC] Forçando atualização do CKEditor...');
                    if (typeof CKEDITOR !== 'undefined') {
                        const editors = Object.keys(CKEDITOR.instances);
                        editors.forEach(editorName => {
                            const editor = CKEDITOR.instances[editorName];
                            if (editor) {
                                console.log(`✅ [Sigilo SYNC] Atualizando editor: ${editorName}`);
                                editor.fire('change');
                                editor.updateElement();
                            }
                        });
                    }
                }
            });
        } catch (e) {
            console.warn('⚠️ [Sigilo SYNC] Erro ao sincronizar:', e);
        }
    }

    // Carregar lista de janelas e estatísticas iniciais
    loadSeiTabs();
    atualizarEstatisticas();
});

// Função executada no contexto da página SEI
function executeSigiloAction(action, param) {
    try {
        console.log('🔍 [Sigilo Action] Iniciando busca por CKEDITOR...');
        console.log('   URL:', window.location.href);
        console.log('   Document.title:', document.title);
        
        // === FILTRO: Ignorar iframes internos do CKEditor ===
        if (window.location.href.includes('about:srcdoc') || window.location.href === 'about:blank') {
            console.log('   ⏭️ Pulando iframe interno (about:srcdoc ou about:blank)');
            return { 
                executed: false, 
                skipped: true,
                reason: 'iframe interno do CKEditor'
            };
        }
        
        // === BUSCAR CKEDITOR em múltiplos contextos (igual ao popup.js) ===
        let CKEDITOR_ref = null;
        let editor = null;
        
        const possiveisCKEDITORs = [
            { name: 'window.CKEDITOR', ref: () => window.CKEDITOR },
            { name: 'global CKEDITOR', ref: () => (typeof CKEDITOR !== 'undefined' ? CKEDITOR : null) },
            { name: 'window.parent.CKEDITOR', ref: () => window.parent?.CKEDITOR },
            { name: 'window.top.CKEDITOR', ref: () => window.top?.CKEDITOR },
            { name: 'self.CKEDITOR', ref: () => self?.CKEDITOR }
        ];
        
        console.log('   🔍 Procurando CKEDITOR em diferentes contextos...');
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
            console.log('   ❌ CKEDITOR não encontrado em nenhum contexto');
            return { executed: false, error: 'CKEDITOR não encontrado' };
        }

        // Procura por uma instância ativa do editor
        const editors = Object.keys(CKEDITOR_ref.instances);
        if (editors.length === 0) {
            console.log('   ❌ Nenhuma instância de editor encontrada');
            return { executed: false, error: 'Nenhum editor ativo' };
        }

        const editorName = editors[0];
        editor = CKEDITOR_ref.instances[editorName];

        if (!editor) {
            console.log('   ❌ Editor não disponível');
            return { executed: false, error: 'Editor não disponível' };
        }
        
        console.log(`   ✅ Editor encontrado: ${editorName}`);
        console.log(`       - readOnly: ${editor.readOnly}`);

        // Criar instância do gerenciador de sigilo
        if (typeof SigiloManager === 'undefined') {
            // Se a classe não foi carregada, definir inline
            class SigiloManagerInline {
                constructor(editorInstance) {
                    this.editor = editorInstance;
                    this.sigiloClass = 'sigiloSEI';
                    this.tarjaClass = 'sigiloSEI_tarja';
                    this.redactor = '\u2588';
                }

                getEditorIframe() {
                    try {
                        const frameId = this.editor.id;
                        console.log(`   🔍 Procurando iframe do editor: ${frameId}`);
                        
                        // Tentar múltiplos seletores
                        const possiveisIframes = [
                            document.querySelector(`#cke_${frameId} iframe.cke_wysiwyg_frame`),
                            document.querySelector(`iframe.cke_wysiwyg_frame`),
                            document.querySelector(`iframe[id*="${frameId}"]`)
                        ];
                        
                        for (let iframe of possiveisIframes) {
                            if (iframe) {
                                try {
                                    const doc = iframe.contentDocument || iframe.contentWindow?.document;
                                    if (doc) {
                                        console.log(`   ✅ Iframe encontrado e acessível`);
                                        return doc;
                                    }
                                } catch (e) {
                                    console.log(`   ⚠️ Iframe encontrado mas inacessível:`, e.message);
                                }
                            }
                        }
                        
                        console.log(`   ❌ Nenhum iframe acessível encontrado`);
                        return null;
                    } catch (e) {
                        console.error('   ❌ Erro ao obter iframe:', e);
                        return null;
                    }
                }

                contarMarcas() {
                    const doc = this.getEditorIframe();
                    if (!doc) return { marcas: 0, tarjas: 0, total: 0 };

                    const marcas = doc.querySelectorAll(`span.${this.sigiloClass}`).length;
                    const tarjas = doc.querySelectorAll(`span.${this.tarjaClass}`).length;

                    return { marcas, tarjas, total: marcas + tarjas };
                }

                marcarTexto(texto) {
                    const doc = this.getEditorIframe();
                    if (!doc || !texto) {
                        return { success: false, message: 'Editor ou texto inválido', count: 0 };
                    }

                    console.log(`   📝 Marcando texto: "${texto}"`);

                    this.editor.focus();
                    this.editor.fire('saveSnapshot');

                    let count = 0;
                    const paragraphs = doc.querySelectorAll('p, div, span, td, li');
                    const regex = new RegExp(`\\b(${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');

                    paragraphs.forEach(element => {
                        // Processar apenas elementos que não sejam já marcados
                        if (!element.classList.contains(this.sigiloClass) && 
                            !element.classList.contains(this.tarjaClass)) {
                            
                            const originalHtml = element.innerHTML;
                            
                            // Verificar se o elemento contém o texto
                            if (regex.test(originalHtml)) {
                                const newHtml = originalHtml.replace(regex, (match) => {
                                    count++;
                                    return `<span class="${this.sigiloClass}">${match}</span>`;
                                });
                                element.innerHTML = newHtml;
                            }
                        }
                    });

                    this.editor.fire('saveSnapshot');

                    console.log(`   ✅ ${count} marcas adicionadas`);

                    return {
                        success: count > 0,
                        message: count === 0 
                            ? 'Nenhum texto encontrado'
                            : `${count} ${count === 1 ? 'marca adicionada' : 'marcas adicionadas'}`,
                        count
                    };
                }

                marcarDadosPessoais() {
                    const doc = this.getEditorIframe();
                    if (!doc) {
                        return { success: false, message: 'Editor não encontrado', count: 0 };
                    }

                    const texto = doc.body.textContent || '';
                    
                    // Regex para CPF e e-mail
                    const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
                    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
                    
                    const cpfs = [...new Set(texto.match(cpfRegex) || [])];
                    const emails = [...new Set(texto.match(emailRegex) || [])];
                    const dadosSensiveis = [...cpfs, ...emails];

                    if (dadosSensiveis.length === 0) {
                        return { success: false, message: 'Nenhum dado pessoal encontrado', count: 0 };
                    }

                    let totalMarcados = 0;
                    dadosSensiveis.forEach(dado => {
                        const result = this.marcarTexto(dado);
                        totalMarcados += result.count;
                    });

                    return {
                        success: true,
                        message: `${totalMarcados} ${totalMarcados === 1 ? 'dado pessoal marcado' : 'dados pessoais marcados'}`,
                        count: totalMarcados,
                        details: {
                            cpfs: cpfs.length,
                            emails: emails.length
                        }
                    };
                }

                aplicarTarjas() {
                    const doc = this.getEditorIframe();
                    if (!doc) {
                        return { success: false, message: 'Editor não encontrado', count: 0 };
                    }

                    console.log(`   🔒 Aplicando tarjas...`);

                    this.editor.focus();
                    this.editor.fire('saveSnapshot');

                    const marcas = doc.querySelectorAll(`span.${this.sigiloClass}`);
                    let count = 0;

                    console.log(`   📊 Encontradas ${marcas.length} marcas para tarjar`);

                    marcas.forEach(marca => {
                        const originalText = marca.innerHTML;
                        const tarjaLength = Math.floor(Math.random() * 8) + 8;
                        
                        marca.dataset.text = originalText;
                        marca.textContent = this.redactor.repeat(tarjaLength);
                        marca.className = this.tarjaClass;
                        count++;
                    });

                    this.editor.fire('saveSnapshot');

                    console.log(`   ✅ ${count} marcas tarjadas`);

                    return {
                        success: count > 0,
                        message: count === 0
                            ? 'Nenhuma marca encontrada para tarjar'
                            : `${count} ${count === 1 ? 'marca tarjada' : 'marcas tarjadas'}`,
                        count
                    };
                }

                removerMarcas() {
                    const doc = this.getEditorIframe();
                    if (!doc) {
                        return { success: false, message: 'Editor não encontrado', count: 0 };
                    }

                    console.log(`   🗑️ Removendo marcas...`);

                    this.editor.focus();
                    this.editor.fire('saveSnapshot');

                    let count = 0;

                    // Remove marcas normais
                    const marcas = doc.querySelectorAll(`span.${this.sigiloClass}`);
                    console.log(`   📊 Encontradas ${marcas.length} marcas simples`);
                    
                    marcas.forEach(marca => {
                        const parent = marca.parentNode;
                        while (marca.firstChild) {
                            parent.insertBefore(marca.firstChild, marca);
                        }
                        parent.removeChild(marca);
                        count++;
                    });

                    // Remove tarjas
                    const tarjas = doc.querySelectorAll(`span.${this.tarjaClass}`);
                    console.log(`   📊 Encontradas ${tarjas.length} tarjas`);
                    
                    tarjas.forEach(tarja => {
                        const originalText = tarja.dataset.text || tarja.textContent;
                        const parent = tarja.parentNode;
                        const textNode = doc.createTextNode(originalText);
                        parent.replaceChild(textNode, tarja);
                        count++;
                    });

                    this.editor.fire('saveSnapshot');

                    console.log(`   ✅ ${count} marcas removidas`);

                    return {
                        success: true,
                        message: count === 0
                            ? 'Nenhuma marca encontrada'
                            : `${count} ${count === 1 ? 'marca removida' : 'marcas removidas'}`,
                        count
                    };
                }
            }

            window.SigiloManager = SigiloManagerInline;
        }

        const manager = new window.SigiloManager(editor);
        let result;

        console.log(`   🎬 Executando ação: ${action}`);

        switch (action) {
            case 'marcarTexto':
                result = manager.marcarTexto(param);
                break;
            case 'marcarDadosPessoais':
                result = manager.marcarDadosPessoais();
                break;
            case 'aplicarTarjas':
                result = manager.aplicarTarjas();
                break;
            case 'removerMarcas':
                result = manager.removerMarcas();
                break;
            case 'contarMarcas':
                result = manager.contarMarcas();
                break;
            default:
                result = { success: false, message: 'Ação desconhecida' };
        }

        console.log(`   📤 Resultado:`, result);

        // Adicionar flag needsSync se a ação modificou o editor
        const needsSync = ['marcarTexto', 'marcarDadosPessoais', 'aplicarTarjas', 'removerMarcas'].includes(action);

        return { 
            executed: true, 
            needsSync: needsSync,
            ...result 
        };

    } catch (error) {
        console.error('   ❌ Erro na execução:', error);
        return { executed: false, error: error.message };
    }
}

