# Extensão SEI - Resposta com IA

Extensão do Chrome que ajuda a responder despachos do SEI usando uma API de IA generativa.

## Funcionalidades

- Área para colar o texto do despacho e adicionar contexto opcional.
- Integração com a API de chat da OpenAI (ou compatível) para gerar respostas.
- Botão que aplica a resposta sugerida no campo principal do despacho.
- Atalho de teclado <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (ou <kbd>⌘</kbd> + <kbd>Enter</kbd> no macOS) para gerar rapidamente.
- Página de configurações para salvar chave de API, modelo e temperatura.

## Configuração

1. Obtenha uma chave de API da plataforma de IA que deseja utilizar (por exemplo, [OpenAI](https://platform.openai.com/)).
2. Clone este repositório ou faça o download do código.
3. Abra o Chrome e acesse `chrome://extensions`.
4. Ative o **Modo do desenvolvedor** (canto superior direito) e clique em **Carregar sem compactação**.
5. Selecione a pasta `SEI-extension` deste projeto.
6. Na lista de extensões, clique em **Detalhes → Opções da extensão** e informe a chave de API, modelo e temperatura desejados (também é possível abrir essa tela pelo botão **Configurar chave da IA** no popup).
7. Abra o popup da extensão, cole o despacho e clique em **Gerar resposta**.

> **Importante:** As credenciais ficam salvas apenas no seu navegador por meio do `chrome.storage.sync`. Não compartilhe sua chave com outras pessoas.

## Personalização

- Para usar outro provedor compatível com a API da OpenAI, ajuste o `fetch` em `popup.js` para apontar para o endpoint desejado.
- Você pode modificar as instruções fornecidas ao modelo editando a mensagem com o papel `system` em `popup.js`.

## Licença

Distribuído sob a licença MIT. Consulte o arquivo `LICENSE` (caso aplicável) ou adapte conforme a necessidade da sua organização.
