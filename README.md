# Extensão SEI - Resposta com IA

Extensão do Chrome que ajuda a responder despachos do SEI usando uma API de IA generativa.

## Funcionalidades

- Área para colar o texto do despacho e adicionar contexto opcional.
- Integração com a API de chat da OpenAI (ou compatível) para gerar respostas.
- Botão que insere automaticamente a resposta sugerida no campo principal do despacho aberto no SEI.
- Botão flutuante opcional nas janelas do SEI para abrir rapidamente a interface da extensão.
- Interface ampliada com ícone de engrenagem no topo para acessar rapidamente as configurações.
- Atalho de teclado <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (ou <kbd>⌘</kbd> + <kbd>Enter</kbd> no macOS) para gerar rapidamente.
- Página de configurações para salvar chave de API, modelo e temperatura.

## Instalação e configuração

### Pré-requisitos

- Navegador **Google Chrome** (ou outro navegador compatível com extensões do Chrome).
- Chave de API ativa do provedor de IA generativa que você pretende utilizar (ex.: [OpenAI](https://platform.openai.com/)).

### Passo a passo

1. Clique em **Code → Download ZIP** ou execute `git clone https://github.com/<sua-conta>/SEI-extension.git` para obter os arquivos localmente.
2. Extraia o arquivo ZIP (caso tenha baixado o pacote) para uma pasta acessível no seu computador.
3. Abra o Chrome e acesse `chrome://extensions` na barra de endereços.
4. Ative o **Modo do desenvolvedor** no canto superior direito.
5. Clique em **Carregar sem compactação** e selecione a pasta `SEI-extension` que contém os arquivos da extensão.
6. A extensão aparecerá na lista. Clique em **Detalhes → Opções da extensão** para abrir a tela de configurações.
7. Na página de opções, informe a chave de API, modelo, temperatura desejados e escolha se o botão flutuante do SEI deve ficar ativo. Em seguida clique em **Salvar configurações**.
8. Abra o popup da extensão (ícone na barra de extensões), cole o despacho e clique em **Gerar resposta** para utilizar a IA. Sempre que precisar ajustar os dados da API, use o botão com ícone de engrenagem no topo do popup para abrir a página de opções.
9. Com o editor do despacho aberto no SEI, clique em **Usar resposta no despacho** para enviar automaticamente o texto sugerido para o CKEditor. O campo original do popup será limpo após a aplicação.

> **Importante:** As credenciais ficam salvas apenas no seu navegador por meio do `chrome.storage.sync`. Não compartilhe sua chave com outras pessoas.

## Personalização

- Para usar outro provedor compatível com a API da OpenAI, ajuste o `fetch` em `popup.js` para apontar para o endpoint desejado.
- Você pode modificar as instruções fornecidas ao modelo editando a mensagem com o papel `system` em `popup.js`.

## Licença

Distribuído sob a licença MIT. Consulte o arquivo `LICENSE` (caso aplicável) ou adapte conforme a necessidade da sua organização.
