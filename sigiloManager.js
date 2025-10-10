/**
 * SEI Smart - Gerenciador de Sigilo
 * Gerencia marcas de sigilo e tarjas em documentos do SEI
 * Governo do Estado do Maranhão
 */

// Funções auxiliares
function extractEmails(text) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return text.match(emailRegex) || [];
}

function extractCPFs(text) {
    // Remove formatação e busca padrão XXX.XXX.XXX-XX ou apenas números
    const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
    return text.match(cpfRegex) || [];
}

function uniqPro(array) {
    return [...new Set(array)];
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Classe principal para gerenciar sigilo
class SigiloManager {
    constructor(editorInstance) {
        this.editor = editorInstance;
        this.sigiloClass = 'sigiloSEI';
        this.tarjaClass = 'sigiloSEI_tarja';
        this.redactor = '\u2588'; // █
    }

    // Adiciona marca de sigilo ao texto selecionado
    marcarTextoSelecionado() {
        const selection = this.editor.getSelection();
        if (!selection || selection.getSelectedText().trim() === '') {
            return { success: false, message: 'Nenhum texto selecionado' };
        }

        const style = new CKEDITOR.style({
            element: 'span',
            attributes: { 'class': this.sigiloClass }
        });

        this.editor.focus();
        this.editor.fire('saveSnapshot');
        this.editor.applyStyle(style);
        this.editor.fire('saveSnapshot');

        return { success: true, message: 'Marca de sigilo adicionada' };
    }

    // Localiza e marca texto específico
    marcarTexto(texto) {
        if (!texto || texto.trim() === '') {
            return { success: false, message: 'Digite um texto para marcar', count: 0 };
        }

        const iframe = this.getEditorIframe();
        if (!iframe) {
            return { success: false, message: 'Editor não encontrado', count: 0 };
        }

        // Remove marcas antigas deste texto
        const tagSigilo = iframe.find(`p:contains("${texto}") span.${this.sigiloClass}`);
        if (tagSigilo.length) {
            tagSigilo.each(function() {
                $(this).after($(this).html()).remove();
            });
        }

        // Conta ocorrências
        const bodyText = iframe.find('p').map(function() {
            return $(this).text();
        }).get().join(' ');

        const regex = new RegExp('\\b' + texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'igm');
        const matches = bodyText.match(regex);
        
        if (!matches || matches.length === 0) {
            return { success: false, message: 'Nenhum texto encontrado', count: 0 };
        }

        // Aplica marcas
        this.editor.focus();
        this.editor.fire('saveSnapshot');
        
        this.wrapTextInParagraphs(iframe, texto);
        
        this.editor.fire('saveSnapshot');

        return { 
            success: true, 
            message: `${matches.length} ${matches.length === 1 ? 'marca adicionada' : 'marcas adicionadas'}`,
            count: matches.length
        };
    }

    // Localiza e marca dados pessoais (CPF e e-mail)
    marcarDadosPessoais() {
        const iframe = this.getEditorIframe();
        if (!iframe) {
            return { success: false, message: 'Editor não encontrado', count: 0 };
        }

        const bodyText = iframe.text();
        
        const emails = extractEmails(bodyText);
        const cpfs = extractCPFs(bodyText);
        const dadosSensiveis = uniqPro([...cpfs, ...emails]);

        if (dadosSensiveis.length === 0) {
            return { success: false, message: 'Nenhum dado pessoal encontrado', count: 0 };
        }

        let totalMarcados = 0;
        dadosSensiveis.forEach(dado => {
            const result = this.marcarTexto(dado);
            if (result.success) {
                totalMarcados += result.count;
            }
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

    // Aplica tarja (oculta visualmente com ████)
    aplicarTarjas() {
        const iframe = this.getEditorIframe();
        if (!iframe) {
            return { success: false, message: 'Editor não encontrado', count: 0 };
        }

        let count = 0;
        this.editor.focus();
        this.editor.fire('saveSnapshot');

        iframe.find(`span.${this.sigiloClass}`).each((index, element) => {
            const $el = $(element);
            const originalText = $el.html();
            const tarjaLength = randomNumber(8, 15);
            
            $el.data('text', originalText);
            $el.text(this.redactor.repeat(tarjaLength));
            $el.attr('class', this.tarjaClass);
            count++;
        });

        this.editor.fire('saveSnapshot');
        this.atualizarRodape(count);

        return {
            success: count > 0,
            message: count === 0 
                ? 'Nenhuma marca encontrada para tarjar'
                : `${count} ${count === 1 ? 'marca tarjada' : 'marcas tarjadas'}`,
            count: count
        };
    }

    // Remove todas as marcas e tarjas
    removerMarcas() {
        const iframe = this.getEditorIframe();
        if (!iframe) {
            return { success: false, message: 'Editor não encontrado', count: 0 };
        }

        let count = 0;
        this.editor.focus();
        this.editor.fire('saveSnapshot');

        // Remove marcas normais
        iframe.find(`span.${this.sigiloClass}`).each((index, element) => {
            const $el = $(element);
            $el.after($el.html()).remove();
            count++;
        });

        // Remove tarjas e recupera texto original
        iframe.find(`span.${this.tarjaClass}`).each((index, element) => {
            const $el = $(element);
            const originalText = $el.data('text');
            if (originalText) {
                $el.after(originalText).remove();
            } else {
                $el.after($el.html()).remove();
            }
            count++;
        });

        this.editor.fire('saveSnapshot');
        this.atualizarRodape(0);

        return {
            success: true,
            message: count === 0 
                ? 'Nenhuma marca encontrada'
                : `${count} ${count === 1 ? 'marca removida' : 'marcas removidas'}`,
            count: count
        };
    }

    // Conta marcas existentes
    contarMarcas() {
        const iframe = this.getEditorIframe();
        if (!iframe) return { marcas: 0, tarjas: 0, total: 0 };

        const marcas = iframe.find(`span.${this.sigiloClass}`).length;
        const tarjas = iframe.find(`span.${this.tarjaClass}`).length;

        return {
            marcas: marcas,
            tarjas: tarjas,
            total: marcas + tarjas
        };
    }

    // Funções auxiliares privadas
    getEditorIframe() {
        try {
            const frameId = this.editor.id;
            const iframe = $(`#cke_${frameId} iframe.cke_wysiwyg_frame`);
            return iframe.length ? iframe.contents() : null;
        } catch (e) {
            console.error('Erro ao obter iframe do editor:', e);
            return null;
        }
    }

    wrapTextInParagraphs(iframe, texto) {
        iframe.find('p').each(function() {
            const $p = $(this);
            const html = $p.html();
            const regex = new RegExp('\\b(' + texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b', 'gi');
            
            const newHtml = html.replace(regex, '<span class="sigiloSEI">$1</span>');
            $p.html(newHtml);
        });
    }

    atualizarRodape(count) {
        const iframe = this.getEditorIframe();
        if (!iframe) return;

        iframe.find('body .sigiloSEI_sigilo_mark').remove();
        
        if (count > 0) {
            const marca = `<p class="sigiloSEI_sigilo_mark" contenteditable="false" style="font-size: 6pt;color: #ccc;font-family: monospace;">#_contem_${count}_marcas_sigilo</p>`;
            iframe.find('body').append(marca);
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.SigiloManager = SigiloManager;
}

