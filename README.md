# 🧠 SEI Smart - Assistente IA para Despachos

<div align="center">

**Extensão Chrome para gerar despachos administrativos inteligentes no SEI**

*Desenvolvida para o Governo do Estado do Maranhão*

[![Chrome](https://img.shields.io/badge/Chrome-Extension-green)](https://www.google.com/chrome/)
[![OpenAI](https://img.shields.io/badge/OpenAI-API-blue)](https://platform.openai.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

</div>

---

## 📋 Sobre

**SEI Smart** é uma extensão do Google Chrome que utiliza Inteligência Artificial (OpenAI) para auxiliar servidores públicos na elaboração de despachos administrativos no Sistema Eletrônico de Informações (SEI).

A extensão gera automaticamente:
- ✅ Despachos formatados conforme padrões do SEI
- ✅ Linguagem formal e adequada ao contexto governamental
- ✅ Estrutura correta com cabeçalho, corpo e fecho
- ✅ Referências adequadas à hierarquia organizacional
- ✅ Inserção automática no editor do SEI

---

## ✨ Funcionalidades

### 🤖 Geração Inteligente
- **IA Avançada**: Utiliza GPT-4, GPT-4o ou outros modelos da OpenAI
- **Contexto Personalizado**: Considera seu órgão, setor e estrutura organizacional
- **Formatação Automática**: Aplica estilos do SEI automaticamente
- **Captura de Texto**: Extrai texto de documentos abertos no SEI

### 📝 Estrutura de Documentos
Gera despachos com:
1. **Processo nº** e **Assunto** (em negrito)
2. **Título do documento** (centralizado, maiúsculas)
3. **Destinatário** (Ao/À)
4. **Corpo do texto** (justificado, formal)
5. **Fecho padrão** (São Luís/MA, Atenciosamente)
6. **Assinatura** (nome e cargo do signatário)

### ⚙️ Configurações Personalizáveis
- **Dados do Signatário**: Nome e cargo
- **Estrutura do Órgão**: Nome e setores com gestores
- **Parâmetros da IA**: Modelo, temperatura, criatividade
- **Interface**: Botão flutuante opcional

### 🎯 Recursos Adicionais
- **Dois Modos de Uso**: Resposta a documento existente OU criação de novo documento
- **Múltiplos Tipos**: Despacho, Ofício, Memorando e Nota Técnica
- **Templates Personalizados**: Configure formatos específicos por tipo de documento
- **Modo Manual**: Escreva sem IA e formate automaticamente
- **Edição Livre**: Revise e ajuste o texto gerado antes de usar
- **Múltiplas Janelas**: Suporte para vários editores SEI abertos
- **Atalhos**: Ctrl+Enter para gerar rapidamente


---

## 🚀 Instalação

### Requisitos
- Google Chrome (versão 88 ou superior)
- Conta OpenAI com créditos de API
- Acesso ao SEI do Governo do Maranhão

### Passo a Passo

1. **Baixe a extensão**
   ```
   - Clone este repositório OU
   - Baixe o arquivo .zip
   ```

2. **Instale no Chrome**
   ```
   1. Abra chrome://extensions/
   2. Ative "Modo do desenvolvedor"
   3. Clique em "Carregar sem compactação"
   4. Selecione a pasta da extensão
   ```

3. **Configure a API**
   ```
   1. Obtenha sua chave em: platform.openai.com/api-keys
   2. Clique no ícone da extensão
   3. Clique em ⚙️ (Configurações)
   4. Cole sua chave da API
   5. Configure seus dados e órgão
   6. Salve
   ```

📄 **Instruções detalhadas:** Veja [COMO_INSTALAR.md](COMO_INSTALAR.md)

---

## 📖 Como Usar

### Método 1: Resposta a Documento (Modo Atual)

1. **Selecione "📄 Resposta a Documento"** (modo padrão)
2. **Abra o editor de despacho** no SEI
3. **Clique em 🧠 SEI Smart** (botão flutuante ou ícone da extensão)
4. **Capture ou cole** o despacho recebido
5. **Adicione contexto** extra (opcional)
6. **Clique em "✨ Gerar Resposta com IA"**
7. **Revise e edite** o texto gerado
8. **Clique em "📋 Usar esta resposta no despacho"**
9. **Pronto!** O texto é inserido automaticamente

### Método 2: Novo Documento (NOVO!)

1. **Selecione "✨ Novo Documento"**
2. **Escolha o tipo**: Despacho, Ofício, Memorando ou Nota Técnica
3. **Defina o nome do documento** (ex: "DESPACHO 123/STC")
4. **Descreva o contexto detalhado**:
   - Situação administrativa
   - Destinatário
   - Objetivo do documento
   - Processo relacionado
5. **Adicione informações extras** (opcional)
6. **Clique em "✨ Gerar Novo Documento"**
7. **Revise e edite** o documento gerado
8. **Aplique no SEI** com formatação automática

### Método 3: Modo Manual

1. **Clique em "✍️ Escrever Manualmente"**
2. **Digite seu texto**
3. **Clique em "📋 Usar esta resposta no despacho"**
4. **A formatação é aplicada automaticamente**


---

## ⚙️ Configurações

### 🔐 Autenticação
- **Chave da API OpenAI**: Sua chave secreta (sk-proj-...)
- **Modelo**: GPT-4o, GPT-4, GPT-3.5-turbo, etc.
- **Temperatura**: Criatividade (0.0-1.0, recomendado: 0.2)

### 👤 Dados do Signatário
- **Nome Completo**: Aparece no final dos documentos
- **Cargo**: Aparece abaixo do nome

### 🏛️ Estrutura do Órgão
- **Nome do Órgão**: Ex: "Secretaria de Estado de Transparência e Controle"
- **Setores e Gestores**: Lista no formato:
  ```
  Secretaria Adjunta - SEATRAN/STC - Maria Silva Costa
  Gabinete do Secretário - João Santos Oliveira
  Coordenadoria de Controle - Pedro Costa
  ```

---

## 🎨 Exemplo de Documento Gerado

```
Processo nº: 2025.110122.01442
Assunto: Recurso de 2ª Instância - PAI nº 1001281202574 - EMAP

DESPACHO Nº 31 - SEATRAN/STC

Ao Gabinete do Secretário

    Encaminhamos o presente processo para apreciação e deliberação 
de Vossa Senhoria, conforme solicitado...

    [Corpo do texto formatado automaticamente]


                          São Luís/MA, data da assinatura eletrônica.

    Atenciosamente,

                          JOÃO SILVA SANTOS
                          Assessor Administrativo
```

---

## 🔧 Tecnologias Utilizadas

- **Chrome Extension API**: Manifest V3
- **OpenAI API**: GPT-4, GPT-4o, GPT-3.5
- **JavaScript**: ES6+
- **HTML/CSS**: Interface moderna e responsiva
- **CKEditor**: Integração com editor do SEI

---

## 📦 Distribuição

Para compartilhar esta extensão com colegas:

📄 **Veja:** [DISTRIBUIR.md](DISTRIBUIR.md)

Opções disponíveis:
- 📁 Compartilhar pasta (.zip)
- 📦 Gerar arquivo .crx
- 🌐 Publicar na Chrome Web Store
- 💻 Compartilhar via GitHub

---

## ⚠️ Importante

### Segurança
- ✅ Suas configurações ficam **apenas no seu navegador**
- ✅ A chave da API é armazenada **localmente**
- ✅ Nenhum dado é enviado para servidores externos (exceto OpenAI)
- ⚠️ **NUNCA compartilhe sua chave da API**

### Privacidade
- A extensão **NÃO coleta dados pessoais**
- A extensão **NÃO armazena conteúdo dos despachos**
- A extensão **NÃO envia dados para terceiros**
- Comunicação **apenas com a API OpenAI** quando você solicita

### Custos
- A extensão é **gratuita**
- Você paga **apenas pelo uso da API OpenAI**
- Custos típicos: **$0.01 a $0.05 por despacho**
- Configure limites de gastos na OpenAI

---

## 🆘 Suporte e Problemas

### Problemas Comuns

**Erro: "Chave da API inválida"**
- Verifique se copiou a chave completa
- Certifique-se de ter créditos na OpenAI

**Erro: "CKEditor não encontrado"**
- Clique em "🔄 Atualizar" nas janelas
- Selecione a janela POPUP do editor
- Certifique-se de estar no editor de despacho

**Texto não é inserido**
- Recarregue a extensão em chrome://extensions/
- Reabra a janela do editor SEI
- Tente selecionar manualmente a janela de destino

---

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👥 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 🎯 Roadmap

- [ ] Suporte para mais tipos de documentos (Ofícios, Memorandos)
- [ ] Templates personalizáveis
- [ ] Histórico de despachos gerados
- [ ] Suporte para outros provedores de IA (Anthropic, etc.)
- [ ] Modo offline com modelos locais
- [ ] Integração com outros sistemas governamentais

---

## 📧 Contato

Desenvolvido para o **Governo do Estado do Maranhão**

Para dúvidas e sugestões, entre em contato com o desenvolvedor.

---

<div align="center">

**Feito com ❤️ para facilitar o trabalho dos servidores públicos**

⭐ Se esta extensão foi útil, considere dar uma estrela no repositório!

</div>
