# 📝 Histórico de Versões - SEI Smart

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.1.0] - 2025-01-10

### ✨ Novas Funcionalidades

#### Modo "Novo Documento" 
- **Toggle de Modo**: Escolha entre "Resposta a Documento" ou "Novo Documento"
- **Múltiplos Tipos**: Suporte para Despacho, Ofício, Memorando e Nota Técnica
- **Interface Dinâmica**: Campos se adaptam ao modo selecionado
- **Contexto Detalhado**: Campo específico para descrever situação, destinatário e objetivo
- **Validação Inteligente**: Valida campos baseado no modo selecionado

#### Templates por Tipo de Documento
- **Templates Específicos**: Configure formato diferente para cada tipo de documento
- **Templates na Configuração**: 
  - Template para Respostas (modo atual)
  - Template para Despachos
  - Template para Ofícios
  - Template para Memorandos
- **Formato Padrão**: Estrutura padrão se não configurar templates

#### Campo para Nome do Documento
- Adicionado campo para especificar o nome do documento (ex: "DESPACHO 123/STC")
- O nome fornecido é usado automaticamente como título no documento gerado
- Campo opcional que aparece na interface principal

#### Melhorias na Interface
- **Seletor Visual**: Toggle com ícones e descrições para escolher o modo
- **Campos Condicionais**: Interface se adapta ao modo selecionado
- **Placeholders Dinâmicos**: Dicas contextuais baseadas no tipo de documento
- **Botões Adaptativos**: Texto do botão muda baseado no modo

---

## [1.0.0] - 2025-01-10

### 🎉 Lançamento Inicial

Primeira versão estável da extensão SEI Smart desenvolvida para o Governo do Estado do Maranhão.

### ✨ Funcionalidades

#### Geração Inteligente de Despachos
- Integração com OpenAI GPT-4, GPT-4o e GPT-3.5
- Geração automática de despachos formatados
- Captura de texto de documentos abertos no SEI
- Modo manual para escrita sem IA

#### Formatação Automática
- Detecção inteligente de elementos do documento
- Aplicação automática de classes CSS do SEI
- Estrutura padronizada:
  - Processo nº (negrito, alinhado à esquerda)
  - Assunto (negrito, alinhado à esquerda)
  - Título do documento (centralizado, maiúsculas)
  - Destinatário (com recuo)
  - Corpo do texto (justificado com recuo)
  - Fecho padrão (São Luís/MA)
  - Assinatura (centralizada)

#### Configurações Personalizáveis
- Dados do signatário (nome e cargo)
- Estrutura organizacional (órgão e setores com gestores)
- Parâmetros da IA (modelo, temperatura)
- Interface (botão flutuante)

#### Inserção Automática no SEI
- Injeção em todos os frames (allFrames: true)
- Sincronização via world: MAIN para acesso ao CKEditor
- Suporte para múltiplas janelas do SEI
- Seleção manual de janela de destino

#### Interface
- Popup intuitivo e responsivo
- Botão flutuante nas páginas do SEI
- Atalho Ctrl+Enter para geração rápida
- Feedback visual de status

### 🔧 Tecnologias
- Chrome Extension API (Manifest V3)
- OpenAI API
- JavaScript ES6+
- HTML5/CSS3
- CKEditor Integration

### 🏛️ Personalização para Governo do Maranhão
- Contexto específico do órgão
- Formatação conforme padrões do SEI/GOVMA
- Linguagem formal administrativa
- Referências à estrutura organizacional

### 📚 Documentação
- README.md completo
- COMO_INSTALAR.md para usuários
- DISTRIBUIR.md para gestores
- GERAR_CRX.md para empacotamento

### 🔒 Segurança e Privacidade
- Armazenamento local das configurações
- Nenhuma coleta de dados
- Comunicação apenas com OpenAI
- Proteção da chave privada (.pem)

---

## [Não Publicado]

### 🚀 Planejado para Próximas Versões

#### v1.1.0 (Planejado)
- [ ] Templates personalizáveis
- [ ] Histórico de despachos gerados
- [ ] Exportar/importar configurações
- [ ] Melhorias na detecção de destinatário

#### v1.2.0 (Planejado)
- [ ] Suporte para Ofícios
- [ ] Suporte para Memorandos
- [ ] Biblioteca de textos padrão

#### v2.0.0 (Futuro)
- [ ] Suporte para outros provedores de IA (Anthropic Claude, etc.)
- [ ] Modo offline com modelos locais
- [ ] Integração com outros sistemas governamentais
- [ ] Dashboard de estatísticas

---

## Tipos de Mudanças

- `Adicionado` para novas funcionalidades
- `Modificado` para mudanças em funcionalidades existentes
- `Descontinuado` para funcionalidades que serão removidas
- `Removido` para funcionalidades removidas
- `Corrigido` para correção de bugs
- `Segurança` para vulnerabilidades corrigidas

---

## Versionamento

Este projeto segue o [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Mudanças incompatíveis com versões anteriores
- **MINOR** (0.X.0): Novas funcionalidades compatíveis
- **PATCH** (0.0.X): Correções de bugs compatíveis

---

**Desenvolvido para o Governo do Estado do Maranhão**

