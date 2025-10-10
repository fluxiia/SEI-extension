# 📦 Como Gerar o Arquivo .crx da Extensão

## Método 1: Usando o Chrome (Recomendado)

### Passo a Passo:

1. **Abra o Chrome e vá para:**
   ```
   chrome://extensions/
   ```

2. **Ative o "Modo do desenvolvedor"**
   - No canto superior direito, ative o toggle

3. **Certifique-se que a extensão está carregada**
   - Se não estiver, clique em "Carregar sem compactação"
   - Selecione a pasta `C:\dev_stef\SEI-extension`

4. **Clique em "Compactar extensão"**
   - Botão fica visível quando o modo desenvolvedor está ativo

5. **Preencha os campos:**
   ```
   Diretório da extensão: C:\dev_stef\SEI-extension
   Arquivo de chave privada: [deixe em branco na primeira vez]
   ```

6. **Clique em "Compactar extensão"**

7. **O Chrome vai gerar 2 arquivos:**
   ```
   📦 SEI-extension.crx - O arquivo da extensão
   🔑 SEI-extension.pem - A chave privada (GUARDE!)
   ```

### ⚠️ IMPORTANTE:
- **GUARDE o arquivo .pem** em local seguro!
- Você precisará dele para gerar atualizações futuras
- **NUNCA compartilhe** o arquivo .pem
- **NUNCA comite** o .pem no Git

---

## Método 2: Via Linha de Comando (Avançado)

### Para Windows PowerShell:

```powershell
# Navegue até a pasta da extensão
cd C:\dev_stef\SEI-extension

# Compacte em ZIP primeiro
Compress-Archive -Path * -DestinationPath SEI-Smart-v1.0.zip -Force

# Renomeie para .crx (não é o ideal, mas funciona para distribuição)
Rename-Item SEI-Smart-v1.0.zip SEI-Smart-v1.0.crx
```

⚠️ **Nota:** Este método gera um arquivo que precisa ser instalado manualmente, não é um .crx "assinado".

---

## Método 3: Usando o Chromium (Mais Técnico)

### Requisitos:
- Python 3.x instalado
- Chromium instalado

### Script Python:

```python
import subprocess
import os

# Caminhos (ajuste conforme necessário)
extension_dir = r"C:\dev_stef\SEI-extension"
output_crx = r"C:\dev_stef\SEI-Smart.crx"
pem_file = r"C:\dev_stef\SEI-Smart.pem"

# Se já existe chave, use ela; senão, será gerada
chromium_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

cmd = [
    chromium_path,
    "--pack-extension=" + extension_dir,
]

# Se já tem chave privada, adicione
if os.path.exists(pem_file):
    cmd.append("--pack-extension-key=" + pem_file)

subprocess.run(cmd)
```

---

## 📋 Checklist Antes de Gerar

- [ ] Testou a extensão completamente
- [ ] Atualizou o número de versão em `manifest.json`
- [ ] Removeu console.logs desnecessários
- [ ] Verificou se não há erros no console
- [ ] Testou em uma instalação limpa
- [ ] Atualizou o README.md se necessário

---

## 🔄 Atualizando a Extensão

### Quando lançar uma nova versão:

1. **Atualize o `manifest.json`:**
   ```json
   {
     "version": "1.0.1"  // Incremente a versão
   }
   ```

2. **Gere novo .crx usando o MESMO .pem:**
   ```
   Diretório da extensão: C:\dev_stef\SEI-extension
   Arquivo de chave privada: [SELECIONE O .pem ANTERIOR]
   ```

3. **IMPORTANTE:** Use sempre a MESMA chave .pem
   - Caso contrário, será tratada como extensão diferente
   - Usuários não conseguirão atualizar automaticamente

---

## 📦 Distribuindo o .crx

### Opção A: Email/Drive
```
1. Envie o arquivo .crx
2. Usuários arrastam para chrome://extensions/
3. Chrome pode bloquear (extensão não verificada)
4. Solução: Use distribuição via ZIP (Método 1 do DISTRIBUIR.md)
```

### Opção B: Servidor Web
```
1. Hospede o .crx em um servidor HTTPS
2. Crie um link direto
3. Usuários clicam e instalam
4. Chrome pode bloquear (extensão não verificada)
```

### Opção C: Chrome Web Store (Recomendado)
```
1. Cria conta de desenvolvedor ($5 USD)
2. Faz upload do .zip
3. Aguarda aprovação
4. Instalação com 1 clique
5. Atualizações automáticas
```

---

## 🔐 Segurança do Arquivo .pem

### O que É:
- Chave privada usada para assinar a extensão
- Garante que atualizações vêm do mesmo desenvolvedor
- ID da extensão é derivado desta chave

### Como Proteger:
```
✅ Faça backup em local seguro (nuvem criptografada)
✅ Não compartilhe com ninguém
✅ Adicione ao .gitignore
✅ Mantenha cópia offline
❌ NUNCA comite no Git
❌ NUNCA envie por email
❌ NUNCA compartilhe publicamente
```

### Se Perder o .pem:
```
⚠️ Você NÃO poderá atualizar a extensão existente
⚠️ Terá que criar uma NOVA extensão (novo ID)
⚠️ Usuários terão que DESINSTALAR a antiga e instalar a nova
```

---

## 📁 Estrutura de Arquivos Resultante

```
C:\dev_stef\
├── SEI-extension\           (pasta original - não delete!)
│   ├── manifest.json
│   ├── popup.js
│   └── ...
│
├── SEI-Smart.crx           (arquivo para distribuir)
└── SEI-Smart.pem           (GUARDE COM SEGURANÇA!)
```

---

## ✅ Validação do .crx

### Teste antes de distribuir:

1. **Desinstale a extensão atual**
   ```
   chrome://extensions/ > Remover
   ```

2. **Instale do .crx**
   ```
   Arraste o .crx para chrome://extensions/
   ```

3. **Teste todas as funcionalidades**
   - [ ] Configurações salvam
   - [ ] Gera despachos
   - [ ] Insere no SEI
   - [ ] Botão flutuante aparece

4. **Verifique o console**
   ```
   F12 > Console
   Não deve ter erros
   ```

---

## 🎯 Guia Rápido

**Para distribuir rapidamente:**

1. ✅ **Gere o .crx** (Método 1 acima)
2. ✅ **Guarde o .pem** em local seguro
3. ✅ **Teste o .crx** em instalação limpa
4. ✅ **Comprima também em .zip** para fallback
5. ✅ **Envie ambos** (.crx E .zip) para usuários
6. ✅ **Inclua** o COMO_INSTALAR.md

**Arquivos para enviar:**
```
📦 SEI-Smart-v1.0.crx
📦 SEI-Smart-v1.0.zip
📄 COMO_INSTALAR.md
```

---

## 🆘 Troubleshooting

### "Este item não pode ser adicionado"
```
Solução: Distribua via .zip em vez de .crx
O Chrome bloqueia .crx de fontes não verificadas
```

### ".crx não é válido"
```
Verifique:
- Gerou corretamente via Chrome?
- Arquivo não corrompeu durante download?
- Tentando instalar no Chrome (não outro navegador)?
```

### "Versão do manifesto inválida"
```
Certifique-se de usar Manifest V3
Verifique manifest.json está correto
```

---

**Pronto para gerar! 🚀**

Siga o **Método 1** para a forma mais confiável.

