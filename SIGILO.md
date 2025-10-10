# 🔒 Guia Completo: Gerenciamento de Sigilo

**Versão:** 1.0.0  
**Atualizado:** Janeiro 2025  
**Para:** SEI Smart - Governo do Estado do Maranhão

---

## 📋 Sobre

O módulo de **Gerenciamento de Sigilo** permite marcar, ocultar e proteger informações confidenciais em documentos do SEI, garantindo conformidade com a Lei Geral de Proteção de Dados (LGPD) e normas de sigilo administrativo.

### 🎯 Principais Funcionalidades

- ✅ Localizar e marcar textos sigilosos
- ✅ Detectar automaticamente CPFs e e-mails
- ✅ Aplicar tarjas pretas para ocultar informações
- ✅ Remover marcas quando necessário
- ✅ Estatísticas em tempo real

---

## 🚀 Como Acessar

### Método 1: Via Popup da Extensão

1. Clique no ícone **🧠 SEI Smart** na barra do navegador
2. Clique no botão **🔒 Gerenciar Sigilo**
3. Uma nova janela será aberta com a interface de gerenciamento

### Método 2: Via Botão Flutuante (se ativado)

1. Abra um documento no SEI
2. Clique no botão flutuante **🧠 SEI Smart**
3. Clique em **🔒 Gerenciar Sigilo**

---

## 📖 Interface

A janela de gerenciamento possui 4 abas:

### 1️⃣ Localizar
Encontra e marca informações sigilosas no documento.

### 2️⃣ Tarjar
Converte marcas em tarjas pretas visuais (████).

### 3️⃣ Remover
Remove todas as marcas e tarjas aplicadas.

### 4️⃣ Guia
Instruções rápidas de uso.

---

## 🔍 Localizar e Marcar Informações

### Marcar Texto Específico

**Use quando:** Você sabe exatamente qual texto deve ser ocultado.

**Passo a passo:**

1. **Abra a aba "Localizar"**
2. **Digite o texto** a ser marcado (ex: "João da Silva")
3. **Clique em "🔒 Marcar"**
4. **Resultado:** Todas as ocorrências serão marcadas

**Exemplo prático:**

```
Texto digitado: 123.456.789-00
Resultado: 5 marcas adicionadas ✅
```

### Detecção Automática de Dados Pessoais

**Use quando:** Você quer localizar CPFs e e-mails automaticamente.

**Passo a passo:**

1. **Abra a aba "Localizar"**
2. **Clique em "🔍 Localizar CPF e E-mails"**
3. **Aguarde o processamento**
4. **Resultado:** Todos os CPFs e e-mails serão marcados

**Exemplo de detecção:**

```
✅ 12 dados pessoais marcados
   • 8 CPFs
   • 4 e-mails
```

### O Que é Detectado?

**CPFs:**
- Com formatação: 123.456.789-00
- Sem formatação: 12345678900

**E-mails:**
- joão.silva@ma.gov.br
- assessor@maranhao.gov.br
- contato.setor@gmail.com

---

## ████ Aplicar Tarjas Pretas

### Para Que Serve?

Tarjas **ocultam visualmente** informações sigilosas, substituindo o texto por blocos pretos:

```
Antes: João Silva (CPF 123.456.789-00)
Depois: João Silva (CPF ████████████)
```

### Como Aplicar

**Pré-requisito:** Você precisa ter **marcado** as informações primeiro!

**Passo a passo:**

1. **Marque as informações** (na aba "Localizar")
2. **Vá para a aba "Tarjar"**
3. **Clique em "████ Aplicar Tarjas"**
4. **Confira as estatísticas** atualizadas

**Resultado visual:**

```
📄 Documento ANTES:
Nome: Maria Oliveira Santos
CPF: 987.654.321-00
E-mail: maria.oliveira@exemplo.com

📄 Documento DEPOIS:
Nome: Maria Oliveira Santos
CPF: ████████████
E-mail: ████████████████
```

### ⚠️ Atenção: Reversibilidade

- ✅ **Antes de salvar:** Você pode reverter (remover marcas)
- ❌ **Depois de salvar:** Tarjas se tornam **permanentes**
- 💡 **Dica:** Revise cuidadosamente antes de salvar!

---

## 🗑️ Remover Marcas

### Quando Usar?

- Você marcou algo por engano
- Mudou de ideia sobre tarjar
- Quer recomeçar o processo

### Como Remover

**Passo a passo:**

1. **Vá para a aba "Remover"**
2. **Clique em "🗑️ Remover Todas as Marcas"**
3. **Confirme a ação** no diálogo
4. **Todas as marcas e tarjas** serão removidas

### ⚠️ Limitações

**O que pode ser revertido:**
- ✅ Marcas sem tarja
- ✅ Tarjas não salvas (editor ainda aberto)

**O que NÃO pode ser revertido:**
- ❌ Tarjas em documentos já salvos e fechados
- ❌ Documentos finalizados

---

## 📊 Estatísticas

As estatísticas aparecem após marcar ou tarjar informações:

```
┌─────────────────────┐
│  Marcas      │  8   │  ← Textos marcados (ainda não tarjados)
│  Tarjas      │  5   │  ← Textos já tarjados (████)
│  Total       │  13  │  ← Soma de marcas + tarjas
└─────────────────────┘
```

### O Que Significa Cada Número?

- **Marcas:** Informações identificadas, mas ainda visíveis
- **Tarjas:** Informações ocultadas visualmente (████)
- **Total:** Quantidade total de proteções aplicadas

---

## 🎯 Casos de Uso Práticos

### Caso 1: Proteger CPF em Despacho

**Situação:** Você precisa mencionar um CPF, mas quer ocultá-lo.

**Solução:**

1. Escreva o despacho normalmente
2. Abra "Gerenciar Sigilo"
3. Clique em "Localizar CPF e E-mails"
4. Vá em "Tarjar" → "Aplicar Tarjas"
5. Salve o documento

**Resultado:**
```
O servidor de CPF ████████████ apresentou recurso...
```

---

### Caso 2: Ocultar Dados de Terceiros

**Situação:** Documento cita nome, CPF e e-mail de um cidadão.

**Solução:**

1. **Marcar o nome:**
   - Digite "João da Silva"
   - Clique em "Marcar"

2. **Marcar dados pessoais:**
   - Clique em "Localizar CPF e E-mails"

3. **Aplicar tarjas:**
   - Vá em "Tarjar"
   - Clique em "Aplicar Tarjas"

**Resultado:**
```
O requerente ████████████ (CPF ████████████, 
e-mail ████████████) solicitou...
```

---

### Caso 3: Documento com Informações Sensíveis

**Situação:** Parecer que cita telefones, endereços e valores.

**Solução:**

1. **Marcar telefones:**
   ```
   Digite: (98) 98765-4321
   Clique: Marcar
   ```

2. **Marcar endereço:**
   ```
   Digite: Rua das Flores, 123
   Clique: Marcar
   ```

3. **Marcar valores:**
   ```
   Digite: R$ 125.000,00
   Clique: Marcar
   ```

4. **Aplicar tarjas em tudo:**
   - Vá em "Tarjar"
   - Clique em "Aplicar Tarjas"

---

## ⚡ Dicas e Boas Práticas

### ✅ Faça

- **Marque ANTES de tarjar** (não funciona ao contrário!)
- **Revise ANTES de salvar** (tarjas são permanentes)
- **Use detecção automática** para CPF/e-mail (mais rápido)
- **Confira as estatísticas** (garante que nada ficou de fora)
- **Teste em rascunho** (se for a primeira vez)

### ❌ Evite

- **Tarjar sem marcar** (não vai funcionar)
- **Salvar sem revisar** (não dá para reverter depois)
- **Confiar 100% na detecção** (sempre revise manualmente)
- **Usar em documentos finalizados** (não tem como reverter)

---

## 🔧 Resolução de Problemas

### Problema: "Editor CKEditor não encontrado"

**Causa:** Você não está em um documento editável do SEI.

**Solução:**
1. Abra um documento no SEI para edição
2. Certifique-se que o editor está carregado
3. Tente novamente

---

### Problema: "Nenhum texto encontrado"

**Causa:** O texto digitado não existe no documento.

**Solução:**
1. Verifique a digitação (maiúsculas/minúsculas)
2. Copie o texto exato do documento
3. Tente novamente

---

### Problema: "Nenhuma marca encontrada para tarjar"

**Causa:** Você tentou tarjar sem marcar antes.

**Solução:**
1. Vá na aba "Localizar"
2. Marque as informações
3. Depois vá em "Tarjar"

---

### Problema: Não consigo reverter as tarjas

**Causa:** Você salvou e fechou o documento.

**Solução:**
- ❌ Não há solução (tarjas são permanentes)
- 💡 Próxima vez: teste antes de salvar!

---

## 🔒 Segurança e Privacidade

### Onde os Dados São Processados?

- ✅ **Localmente no seu navegador**
- ✅ **Nenhum dado é enviado para servidores externos**
- ✅ **Nenhum registro é mantido pela extensão**

### O Que é Armazenado?

- ❌ **Nenhuma informação sigilosa é armazenada**
- ❌ **Nenhum log de textos marcados**
- ❌ **Nenhuma comunicação externa**

### Compatibilidade com LGPD

A funcionalidade de sigilo auxilia na conformidade com:

- ✅ Art. 6º - Princípio da segurança
- ✅ Art. 46 - Minimização de dados
- ✅ Art. 48 - Comunicação de vazamento

---

## 📞 Suporte

**Problemas?** 

1. Consulte a aba "Guia" na interface
2. Verifique se está em um documento editável
3. Teste com um texto simples primeiro
4. Revise as estatísticas para confirmar

**Bugs ou sugestões?**

Contate o desenvolvedor ou o setor de TI do seu órgão.

---

## 📄 Informações Legais

**Responsabilidade:** O uso adequado da funcionalidade de sigilo é responsabilidade do usuário. A extensão fornece as ferramentas, mas cabe ao servidor público decidir quais informações devem ser protegidas conforme legislação vigente.

**Legislação aplicável:**
- Lei nº 13.709/2018 (LGPD)
- Lei nº 12.527/2011 (Lei de Acesso à Informação)
- Decreto nº 7.724/2012
- Normas internas do órgão

---

**Desenvolvido para o Governo do Estado do Maranhão**  
**SEI Smart v1.0.0** | Janeiro 2025

