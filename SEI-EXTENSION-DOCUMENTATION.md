# SEI Extension - Documentação de Funcionalidades

## Visão Geral

A SEI Extension é uma extensão baseada nas funcionalidades avançadas do `sei-pro-editor.js`, oferecendo ferramentas poderosas para melhorar a experiência de edição no Sistema Eletrônico de Informações (SEI).

## Arquivos Criados

### 1. `sei-extension-features.js`
Arquivo principal contendo todas as funcionalidades JavaScript adaptadas para extensão.

### 2. `sei-extension-interface.html`
Interface web moderna e responsiva para acessar todas as funcionalidades.

## Funcionalidades Implementadas

### 🎨 **Formatação de Texto**

#### Alinhamento de Texto
- **Função**: `setTextAlignment(mode)`
- **Parâmetros**: `'left'`, `'center'`, `'right'`, `'justify'`
- **Utilidade**: Aplica alinhamento rápido ao texto selecionado
- **Exemplo de uso**:
```javascript
setTextAlignment('center'); // Centraliza o texto
```

#### Controle de Tamanho da Fonte
- **Função**: `changeFontSize(mode)`
- **Parâmetros**: `'increase'` ou `'decrease'`
- **Utilidade**: Aumenta ou diminui o tamanho da fonte em incrementos de 2px
- **Limites**: 8px a 24px

#### Conversão de Primeira Letra
- **Função**: `convertFirstLetter()`
- **Utilidade**: Converte a primeira letra do texto selecionado para maiúscula
- **Aplicação**: Útil para títulos e nomes próprios

### 🔒 **Funcionalidades de Sigilo**

#### Marcação de Sigilo
- **Função**: `addSigiloMark(mode, text)`
- **Modos disponíveis**:
  - `'mark'`: Fundo amarelo com bordas arredondadas
  - `'tarja'`: Fundo vermelho com texto em branco
  - `'box'`: Borda laranja com fundo claro
- **Utilidade**: Marca informações sigilosas no documento
- **Exemplo**:
```javascript
addSigiloMark('tarja', 'INFORMAÇÃO SIGILOSA');
```

### 📊 **Funcionalidades de Tabela**

#### Criação de Tabelas Rápidas
- **Função**: `createQuickTable(rows, cols)`
- **Parâmetros**: Número de linhas e colunas
- **Utilidade**: Cria tabelas com formatação padrão
- **Estilos aplicados**: Bordas, padding e largura responsiva

#### Estilização de Tabelas
- **Função**: `applyTableStyle(style)`
- **Estilos disponíveis**:
  - `'zebra'`: Linhas alternadas
  - `'bordered'`: Bordas definidas
  - `'striped'`: Listras coloridas
  - `'hover'`: Efeito hover nas linhas

### 🖼️ **Otimização de Imagens**

#### Controle de Qualidade
- **Função**: `optimizeImageQuality(quality)`
- **Parâmetros**: Qualidade de 0 a 100
- **Utilidade**: Reduz o tamanho dos arquivos de imagem
- **Aplicação**: Especialmente útil para imagens base64

#### Redimensionamento Automático
- **Função**: `resizeImages(maxWidth, maxHeight)`
- **Parâmetros**: Dimensões máximas em pixels
- **Utilidade**: Mantém proporções e otimiza para web
- **Padrão**: 600x400px

### 💾 **Salvamento Automático**

#### Configuração de Auto Save
- **Função**: `toggleAutoSave(enabled, interval)`
- **Parâmetros**: 
  - `enabled`: true/false
  - `interval`: minutos (padrão: 5)
- **Utilidade**: Salva automaticamente o documento
- **Armazenamento**: LocalStorage com rotação de 5 versões

#### Salvamento Manual
- **Função**: `saveDocument()`
- **Utilidade**: Força o salvamento imediato
- **Feedback**: Log no console

### 🔗 **Referências e Citações**

#### Referências Internas
- **Função**: `insertInternalReference(text, target)`
- **Parâmetros**: Texto da referência e ID do alvo
- **Utilidade**: Cria links internos no documento
- **Estilo**: Azul com sublinhado

#### Notas de Rodapé
- **Função**: `insertFootnote(text)`
- **Parâmetros**: Texto da nota
- **Utilidade**: Adiciona notas explicativas
- **Formato**: Numeração automática

#### Citações de Documentos
- **Função**: `insertDocumentCitation(protocolo, titulo)`
- **Parâmetros**: Número do protocolo e título
- **Utilidade**: Cita documentos do SEI
- **Formato**: Caixa com borda azul

### 📱 **QR Code**

#### Geração de QR Code
- **Função**: `generateQRCode(url, size)`
- **Parâmetros**: URL e tamanho em pixels
- **Utilidade**: Cria códigos QR para URLs
- **API**: qrserver.com (gratuita)
- **Formato**: Imagem com URL abaixo

### 🎨 **Modos de Interface**

#### Modo Escuro
- **Função**: `toggleDarkMode(enabled)`
- **Utilidade**: Interface com cores escuras
- **Persistência**: Salvo no LocalStorage
- **Aplicação**: Reduz fadiga visual

#### Modo Slim
- **Função**: `toggleSlimMode(enabled)`
- **Utilidade**: Interface simplificada
- **Efeito**: Oculta elementos desnecessários
- **Aplicação**: Foco no conteúdo

### 📁 **Import/Export**

#### Exportação HTML
- **Função**: `exportToHTML()`
- **Retorno**: String HTML completa
- **Utilidade**: Backup do documento
- **Formato**: HTML5 com CSS embutido

#### Importação de Documentos
- **Função**: `importDocument(file)`
- **Parâmetros**: Objeto File
- **Utilidade**: Carrega documentos externos
- **Formatos**: HTML, TXT, DOCX

### 📊 **Utilitários**

#### Contagem de Palavras
- **Função**: `countWords()`
- **Retorno**: Número de palavras
- **Utilidade**: Estatísticas do documento
- **Algoritmo**: Remove tags HTML

#### Contagem de Caracteres
- **Função**: `countCharacters()`
- **Retorno**: Número de caracteres
- **Utilidade**: Limites de texto
- **Algoritmo**: Remove tags HTML

#### Busca e Substituição
- **Função**: `findAndReplace(find, replace, caseSensitive)`
- **Parâmetros**: Texto a buscar, substituto, case-sensitive
- **Utilidade**: Edição em massa
- **Regex**: Escape automático de caracteres especiais

## Interface Web

### Características da Interface

#### Design Responsivo
- **Grid System**: CSS Grid para layout adaptativo
- **Breakpoints**: Mobile-first design
- **Componentes**: Cards, modais, botões estilizados

#### Funcionalidades da Interface
- **Toolbar**: Acesso rápido às funções principais
- **Modais**: Janelas para configurações detalhadas
- **Estatísticas**: Contadores em tempo real
- **Toggle Switches**: Controles visuais para modos

#### Organização por Categorias
1. **Formatação**: Alinhamento, fonte, conversão
2. **Sigilo**: Marcação, tarja, caixa
3. **Tabelas**: Criação e estilização
4. **Imagens**: Otimização e redimensionamento
5. **Salvamento**: Auto save e manual
6. **Referências**: Links, notas, citações
7. **QR Code**: Geração de códigos
8. **Import/Export**: Carregamento e exportação

## Integração com SEI

### Inicialização
```javascript
// Inicializar a extensão
SEIExtension.init(editorInstance);
```

### Uso Básico
```javascript
// Exemplo de uso
setTextAlignment('center');
addSigiloMark('tarja', 'CONFIDENCIAL');
createQuickTable(5, 3);
toggleDarkMode(true);
```

### Configurações Persistentes
- **LocalStorage**: Salva preferências do usuário
- **Auto Save**: Configuração de intervalo
- **Modos**: Dark e Slim mode
- **Qualidade**: Configuração de imagens

## Vantagens da Extensão

### Para Usuários
- **Produtividade**: Ferramentas rápidas e eficientes
- **Qualidade**: Formatação profissional
- **Segurança**: Marcação de sigilo adequada
- **Organização**: Referências e citações estruturadas

### Para Administradores
- **Padronização**: Formatação consistente
- **Controle**: Configurações centralizadas
- **Otimização**: Redução de tamanho de arquivos
- **Auditoria**: Rastreamento de alterações

## Compatibilidade

### Navegadores Suportados
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Versões SEI
- SEI 4.x
- SEI 5.x
- Compatibilidade com CKEditor

## Instalação e Uso

### 1. Incluir Arquivos
```html
<script src="sei-extension-features.js"></script>
```

### 2. Inicializar
```javascript
// Após carregar o editor SEI
SEIExtension.init(editorInstance);
```

### 3. Usar Interface
```html
<!-- Abrir interface web -->
<iframe src="sei-extension-interface.html" width="100%" height="600px"></iframe>
```

## Exemplos Práticos

### Documento com Sigilo
```javascript
// Marcar informações sigilosas
addSigiloMark('tarja', 'DADOS PESSOAIS');
addSigiloMark('box', 'INFORMAÇÃO CONFIDENCIAL');

// Criar tabela de dados
createQuickTable(4, 2);
```

### Documento Técnico
```javascript
// Inserir referências
insertInternalReference('Ver seção 2.1', 'sec-2-1');
insertFootnote('Conforme Lei 12.527/2011');

// Citar documento
insertDocumentCitation('123456', 'Parecer Técnico');
```

### Otimização de Performance
```javascript
// Otimizar imagens
optimizeImageQuality(70);
resizeImages(800, 600);

// Ativar auto save
toggleAutoSave(true, 3);
```

## Conclusão

A SEI Extension oferece um conjunto abrangente de ferramentas para melhorar significativamente a experiência de edição no SEI. Com foco na produtividade, qualidade e segurança, as funcionalidades implementadas atendem às necessidades tanto de usuários finais quanto de administradores do sistema.

A interface moderna e intuitiva facilita o acesso às funcionalidades, enquanto a arquitetura modular permite fácil manutenção e expansão futura.
