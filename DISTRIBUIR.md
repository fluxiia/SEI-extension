# 📦 Como Distribuir a Extensão SEI Smart

## Método 1: Compartilhar via ZIP (Recomendado)

### Passo a passo:

1. **Prepare a pasta:**
   - Certifique-se de que todos os arquivos estão atualizados
   - Remova arquivos desnecessários (.git, node_modules, etc.)

2. **Compacte a pasta:**
   ```
   - Clique com botão direito na pasta SEI-extension
   - Escolha "Enviar para" > "Pasta compactada"
   - Renomeie para: SEI-Smart-v1.0.zip
   ```

3. **Distribua:**
   - Envie o arquivo .zip por email, Google Drive, OneDrive, etc.
   - Junto com o arquivo `COMO_INSTALAR.md`

---

## Método 2: Empacotar como .crx

### Via Chrome:

1. **Abra:** `chrome://extensions/`

2. **Ative:** "Modo do desenvolvedor"

3. **Clique:** "Compactar extensão"

4. **Selecione:**
   - Diretório da extensão: `C:\dev_stef\SEI-extension`
   - Arquivo de chave privada: (deixe em branco na primeira vez)

5. **O Chrome vai gerar 2 arquivos:**
   - `SEI-extension.crx` - O arquivo da extensão
   - `SEI-extension.pem` - A chave privada (GUARDE COM SEGURANÇA!)

⚠️ **IMPORTANTE:** Guarde o arquivo `.pem` em local seguro! Você precisará dele para atualizar a extensão no futuro.

---

## Método 3: Publicar na Chrome Web Store (Profissional)

### Vantagens:
- ✅ Instalação com 1 clique
- ✅ Atualizações automáticas
- ✅ Confiança dos usuários
- ✅ Não precisa modo desenvolvedor

### Desvantagens:
- ❌ Taxa única de $5 USD para criar conta de desenvolvedor
- ❌ Processo de revisão (pode levar dias)
- ❌ Precisa cumprir políticas da Google

### Como publicar:

1. **Criar conta de desenvolvedor:**
   - Acesse: [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
   - Pague a taxa de $5 USD (uma única vez)

2. **Preparar a extensão:**
   - Crie ícones em vários tamanhos (16x16, 48x48, 128x128)
   - Tire screenshots da extensão
   - Escreva uma descrição completa

3. **Fazer upload:**
   - Compacte a pasta em .zip
   - Faça upload na Chrome Web Store
   - Preencha todas as informações
   - Envie para revisão

4. **Aguardar aprovação:**
   - Pode levar de 1 dia até 1 semana
   - Você receberá email quando for aprovada

---

## Método 4: GitHub (Open Source)

### Se quiser compartilhar o código:

1. **Criar repositório:**
   ```bash
   cd C:\dev_stef\SEI-extension
   git init
   git add .
   git commit -m "Primeira versão"
   ```

2. **Subir para GitHub:**
   - Crie um repositório em github.com
   - Siga as instruções para fazer push

3. **Distribua:**
   - Compartilhe o link do GitHub
   - As pessoas clonam e instalam

---

## 📋 Checklist Antes de Distribuir

### Arquivos Obrigatórios:
- ✅ manifest.json
- ✅ background.js
- ✅ contentScript.js
- ✅ contentScript.css
- ✅ popup.html
- ✅ popup.js
- ✅ popup.css
- ✅ options.html
- ✅ options.js
- ✅ options.css
- ✅ README.md
- ✅ COMO_INSTALAR.md

### Arquivos Opcionais:
- 📄 LICENSE (licença do software)
- 📄 CHANGELOG.md (histórico de versões)
- 🖼️ screenshots/ (capturas de tela)
- 🎨 icons/ (ícones da extensão)

### Teste Final:
1. ✅ Desinstale a extensão atual
2. ✅ Instale do .zip que você vai distribuir
3. ✅ Teste todas as funcionalidades
4. ✅ Verifique se as configurações funcionam
5. ✅ Teste geração de despacho
6. ✅ Teste inserção no SEI

---

## 🔒 Segurança

### NUNCA distribua:
- ❌ Sua chave da API OpenAI
- ❌ Dados pessoais salvos
- ❌ Arquivos .pem (chave privada)

### SEMPRE:
- ✅ Distribua apenas o código da extensão
- ✅ Instrua os usuários a obterem suas próprias chaves API
- ✅ Mantenha o arquivo .pem em local seguro

---

## 📊 Versionamento

Ao fazer atualizações, siga este padrão:

```json
// manifest.json
{
  "version": "1.0.0"  // Major.Minor.Patch
}
```

- **Major (1.x.x):** Mudanças grandes, pode quebrar compatibilidade
- **Minor (x.1.x):** Novas funcionalidades, compatível
- **Patch (x.x.1):** Correções de bugs

---

## 🆘 Suporte aos Usuários

Crie um canal de suporte:
- Email institucional
- Grupo no WhatsApp/Telegram
- Issues no GitHub
- Documento de FAQ

---

## 📝 Exemplo de Email de Distribuição

```
Assunto: Nova Extensão SEI Smart - Assistente IA para Despachos

Prezados colegas,

Estou compartilhando a extensão SEI Smart, desenvolvida para auxiliar
na elaboração de despachos administrativos no SEI.

A extensão utiliza inteligência artificial (OpenAI) para gerar respostas
profissionais e formatadas adequadamente.

COMO INSTALAR:
1. Baixe o arquivo anexo (SEI-Smart-v1.0.zip)
2. Siga as instruções no arquivo COMO_INSTALAR.md

REQUISITOS:
- Google Chrome
- Conta na OpenAI (gratuita para testar)
- Chave de API OpenAI

OBSERVAÇÕES:
- Você precisará de sua própria chave API da OpenAI
- Suas configurações ficam apenas no seu computador
- A extensão é 100% segura e não coleta dados

Em anexo:
- SEI-Smart-v1.0.zip (extensão)
- COMO_INSTALAR.md (instruções detalhadas)

Qualquer dúvida, estou à disposição.

Atenciosamente,
[Seu nome]
```

---

**Boa distribuição! 🚀**

