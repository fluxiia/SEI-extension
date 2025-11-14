(function (global) {
  var TEMPLATE = [
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
  ].join("");

  function getHtml() {
    return TEMPLATE;
  }

  function inject(container, options) {
    if (!container) return null;
    container.innerHTML = getHtml();
    var closeBtn = container.querySelector('[data-sei-credits-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (ev) {
        try { ev.preventDefault(); } catch (e) {}
        if (options && typeof options.onClose === 'function') {
          options.onClose();
        }
      });
    }
    return container;
  }

  global.SeiCreditsTemplate = {
    getHtml: getHtml,
    inject: inject
  };
})(typeof window !== 'undefined' ? window : this);

