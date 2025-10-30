# Troubleshooting - SEI Tools Botão Flutuante

## 🔍 **Diagnóstico do Problema**

Se o botão "SEI Tools" não apareceu, siga estes passos para diagnosticar:

### **1. Verificar se a Extensão está Ativa**
1. Abra `chrome://extensions/`
2. Procure por "SEI Smart"
3. Certifique-se de que está **ativada** (toggle ligado)
4. Se não estiver, ative e recarregue a página do SEI

### **2. Verificar Console do Navegador**
1. Abra o **Console do Navegador** (F12 → Console)
2. Procure por mensagens que começam com "SEI Tools:"
3. Se não houver mensagens, o content script não está sendo executado

### **3. Verificar se está na Página Correta**
- O botão só aparece em páginas do SEI que contenham `*/sei/*` na URL
- Exemplo: `https://seu-dominio.gov.br/sei/`

### **4. Teste Manual**
Execute este código no console do navegador:

```javascript
// Verificar se o botão existe
const button = document.getElementById('sei-extension-tools-button');
console.log('Botão encontrado:', button);

// Criar botão de teste
const testButton = document.createElement('div');
testButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999999;
    background: #667eea;
    color: white;
    padding: 12px 20px;
    border-radius: 25px;
    cursor: pointer;
    font-family: Arial, sans-serif;
`;
testButton.innerHTML = '🛠️ SEI Tools (Teste)';
testButton.onclick = () => alert('Teste funcionando!');
document.body.appendChild(testButton);
```

## 🛠️ **Soluções**

### **Solução 1: Recarregar Extensão**
1. Vá para `chrome://extensions/`
2. Encontre "SEI Smart"
3. Clique no ícone de **recarregar** (🔄)
4. Recarregue a página do SEI

### **Solução 2: Verificar Permissões**
1. Vá para `chrome://extensions/`
2. Clique em "Detalhes" na extensão SEI Smart
3. Verifique se tem permissão para "Acessar dados do site"
4. Se não tiver, ative a permissão

### **Solução 3: Verificar Manifest**
O arquivo `manifest.json` deve conter:

```json
{
  "content_scripts": [
    {
      "matches": ["*://*/sei/*"],
      "js": ["content-script-sei-tools.js"],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["sei-extension-features.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### **Solução 4: Verificar Arquivos**
Certifique-se de que estes arquivos existem:
- ✅ `content-script-sei-tools.js`
- ✅ `sei-extension-features.js`
- ✅ `manifest.json`

### **Solução 5: Teste em Página Diferente**
1. Abra uma nova aba
2. Vá para uma página do SEI
3. Abra o editor de documento
4. Verifique se o botão aparece

## 🔧 **Debug Avançado**

### **Verificar Content Script**
1. Abra o Console (F12)
2. Digite: `console.log('SEI Tools: Content script carregado!')`
3. Se não aparecer, o content script não está sendo executado

### **Verificar CKEditor**
1. No console, digite: `console.log(typeof CKEDITOR)`
2. Se retornar "undefined", o CKEditor não está carregado
3. Isso é normal - o botão deve aparecer mesmo sem CKEditor

### **Verificar Elementos DOM**
1. No console, digite: `document.querySelectorAll('[id*="sei"]')`
2. Deve retornar elementos com ID contendo "sei"
3. Se retornar array vazio, o botão não foi criado

## 🚨 **Problemas Conhecidos**

### **Problema 1: Extensão Desabilitada**
- **Sintoma**: Botão não aparece
- **Solução**: Ativar extensão em `chrome://extensions/`

### **Problema 2: Página Não Suportada**
- **Sintoma**: Botão não aparece
- **Solução**: Usar em páginas que contenham `/sei/` na URL

### **Problema 3: Conflito com Outras Extensões**
- **Sintoma**: Botão aparece mas não funciona
- **Solução**: Desabilitar outras extensões temporariamente

### **Problema 4: Cache do Navegador**
- **Sintoma**: Botão não aparece após atualização
- **Solução**: Limpar cache (Ctrl+Shift+Delete)

## 📞 **Suporte**

Se nenhuma solução funcionar:

1. **Verifique os logs** no console do navegador
2. **Teste em modo incógnito** (para descartar conflitos)
3. **Verifique se a URL contém `/sei/`**
4. **Recarregue completamente** a extensão

## 🎯 **Teste Final**

Execute este código no console para criar o botão manualmente:

```javascript
// Criar botão SEI Tools manualmente
const button = document.createElement('div');
button.id = 'sei-extension-tools-button';
button.innerHTML = `
    <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 25px;
        padding: 12px 20px;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        user-select: none;
    ">
        <span style="font-size: 16px;">🛠️</span>
        <span>SEI Tools</span>
    </div>
`;

button.addEventListener('click', () => {
    alert('SEI Tools funcionando!');
});

document.body.appendChild(button);
console.log('✅ Botão SEI Tools criado manualmente!');
```

Se este código funcionar, o problema está no content script. Se não funcionar, há um problema mais fundamental.
