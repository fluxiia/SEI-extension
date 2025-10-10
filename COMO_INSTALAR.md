# 📦 Como Instalar a Extensão SEI Smart

## Opção 1: Instalação via Modo Desenvolvedor (Recomendado)

### Passo 1: Baixar a Extensão
1. Baixe e extraia o arquivo `SEI-extension.zip`
2. Salve em uma pasta permanente (NÃO delete depois!)

### Passo 2: Instalar no Chrome
1. Abra o Google Chrome
2. Digite na barra de endereços: `chrome://extensions/`
3. No canto superior direito, **ative** o "Modo do desenvolvedor"
4. Clique no botão **"Carregar sem compactação"**
5. Selecione a pasta `SEI-extension` que você extraiu
6. Pronto! A extensão está instalada ✅

### Passo 3: Configurar
1. Clique no ícone da extensão (🧠) na barra do Chrome
2. Clique no ⚙️ (Configurações)
3. Preencha:
   - **Chave da API OpenAI**: Obtenha em [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - **Dados do Signatário**: Seu nome e cargo
   - **Estrutura do Órgão**: Seu órgão e setores
4. Clique em "💾 Salvar configurações"

---

## Opção 2: Instalação via Arquivo .crx

### Se você recebeu um arquivo .crx:
1. Baixe o arquivo `SEI-Smart.crx`
2. Abra `chrome://extensions/`
3. Ative o "Modo do desenvolvedor"
4. Arraste o arquivo `.crx` para a janela do Chrome
5. Clique em "Adicionar extensão"

⚠️ **Nota:** O Chrome pode bloquear extensões não publicadas na Web Store. Neste caso, use a Opção 1.

---

## 🔑 Obter Chave da API OpenAI

1. Acesse: [https://platform.openai.com/signup](https://platform.openai.com/signup)
2. Crie uma conta (se não tiver)
3. Vá em: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
4. Clique em "Create new secret key"
5. Copie a chave (começa com `sk-proj-...`)
6. Cole nas configurações da extensão

💡 **Dica:** Você precisará adicionar créditos na sua conta OpenAI para usar a API.

---

## 📋 Como Usar

### 1. No Editor de Despacho do SEI:
1. Clique no botão flutuante **🧠 SEI Smart** (aparece na página)
   - OU clique no ícone da extensão na barra do Chrome

### 2. Gerar Resposta com IA:
1. **Capturar texto**: Clique em "📋 Capturar do SEI" para pegar o texto do documento aberto
   - OU cole manualmente o despacho recebido
2. Adicione contexto extra se necessário (opcional)
3. Clique em "✨ Gerar Resposta com IA"
4. Aguarde a IA gerar o texto
5. Revise e edite se necessário
6. Clique em "📋 Usar esta resposta no despacho"
7. O texto será inserido automaticamente no editor!

### 3. Escrever Manualmente:
1. Clique em "✍️ Escrever Manualmente"
2. Digite seu texto
3. Clique em "📋 Usar esta resposta no despacho"

---

## ⚠️ Solução de Problemas

### "Erro ao aplicar resposta"
1. Certifique-se de que está na **janela POPUP do editor** (a janela pequena que abre)
2. Clique em "🔄 Atualizar" ao lado de "Janela de Destino"
3. Selecione a janela com ✅ "Despacho" no nome
4. Tente novamente

### "Chave da API inválida"
1. Verifique se copiou a chave completa (sem espaços)
2. Certifique-se de que a chave começa com `sk-proj-` ou `sk-`
3. Verifique se tem créditos na conta OpenAI

### Extensão não aparece
1. Verifique se está em `chrome://extensions/`
2. Certifique-se de que a extensão está **ativada** (toggle azul)
3. Se necessário, clique em "🔄 Recarregar"

---

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verifique se seguiu todos os passos corretamente
2. Recarregue a extensão em `chrome://extensions/`
3. Feche e abra o Chrome novamente
4. Entre em contato com o desenvolvedor

---

## 🔒 Segurança e Privacidade

- ✅ Suas configurações ficam armazenadas apenas no seu navegador
- ✅ A chave da API é armazenada de forma segura localmente
- ✅ Nenhum dado é enviado para servidores externos (exceto OpenAI)
- ✅ A extensão só funciona em páginas do SEI

---

**Desenvolvido para o Governo do Estado do Maranhão**
**Versão:** 1.0.0

