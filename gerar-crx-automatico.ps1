# Script Automático para Gerar CRX da Extensão SEI Smart
# Este script usa o Chrome para gerar um arquivo CRX assinado automaticamente

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   SEI Smart - Gerador Automático de CRX" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Configurações
$extensionDir = $PSScriptRoot
$version = "1.1.0"

# Verificar se o Chrome está instalado
$chromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
)

$chromePath = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chromePath = $path
        break
    }
}

if (-not $chromePath) {
    Write-Host "[ERRO] Chrome não encontrado!" -ForegroundColor Red
    Write-Host "Instale o Google Chrome para gerar o arquivo CRX." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Chrome encontrado em: $chromePath" -ForegroundColor Green

# Ler versão do manifest.json
$manifestPath = Join-Path $extensionDir "manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version

Write-Host "Versão da extensão: $version" -ForegroundColor Cyan
Write-Host ""

# Verificar se já existe um arquivo .pem (chave privada)
$pemFile = Join-Path $extensionDir "SEI-Smart.pem"
$hasExistingKey = Test-Path $pemFile

if ($hasExistingKey) {
    Write-Host "[INFO] Chave privada existente encontrada: SEI-Smart.pem" -ForegroundColor Yellow
    Write-Host "Usando chave existente para manter compatibilidade..." -ForegroundColor Yellow
} else {
    Write-Host "[INFO] Primeira geração - nova chave privada será criada" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Gerando CRX automaticamente..." -ForegroundColor Yellow

# Executar comando para gerar CRX
try {
    if ($hasExistingKey) {
        Write-Host "Executando com chave existente..." -ForegroundColor Gray
        & $chromePath --pack-extension=$extensionDir --pack-extension-key=$pemFile
    } else {
        Write-Host "Executando sem chave (primeira geração)..." -ForegroundColor Gray
        & $chromePath --pack-extension=$extensionDir
    }
    
    # Aguardar um pouco para o Chrome processar
    Start-Sleep -Seconds 3
    
    # Verificar se os arquivos foram criados
    $crxFile = Join-Path $extensionDir "SEI-extension.crx"
    $pemFileOutput = Join-Path $extensionDir "SEI-extension.pem"
    
    if (Test-Path $crxFile) {
        # Renomear para nome mais amigável
        $newCrxName = "SEI-Smart-v$version.crx"
        $newCrxPath = Join-Path $extensionDir $newCrxName
        Move-Item $crxFile $newCrxPath -Force
        
        $fileSize = (Get-Item $newCrxPath).Length
        $fileSizeKB = [math]::Round($fileSize / 1KB, 2)
        
        Write-Host ""
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host "   CRX GERADO COM SUCESSO!" -ForegroundColor Green
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Arquivo CRX: $newCrxName" -ForegroundColor Cyan
        Write-Host "Tamanho: $fileSizeKB KB" -ForegroundColor Cyan
        Write-Host "Localização: $newCrxPath" -ForegroundColor Cyan
        
        if (Test-Path $pemFileOutput) {
            # Renomear arquivo PEM
            $newPemName = "SEI-Smart-v$version.pem"
            $newPemPath = Join-Path $extensionDir $newPemName
            Move-Item $pemFileOutput $newPemPath -Force
            
            Write-Host "Chave privada: $newPemName" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Red
            Write-Host "- GUARDE o arquivo .pem em local seguro!" -ForegroundColor Red
            Write-Host "- Você precisará dele para futuras atualizações" -ForegroundColor Red
            Write-Host "- NUNCA compartilhe o arquivo .pem" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "Próximos passos:" -ForegroundColor Yellow
        Write-Host "1. Teste o CRX em uma instalação limpa do Chrome" -ForegroundColor White
        Write-Host "2. Distribua junto com o COMO_INSTALAR.md" -ForegroundColor White
        Write-Host "3. Para atualizações futuras, use a MESMA chave .pem" -ForegroundColor White
        
        # Abrir pasta para mostrar os arquivos
        Write-Host ""
        Write-Host "Abrindo pasta com os arquivos gerados..." -ForegroundColor Yellow
        Start-Process explorer.exe $extensionDir
        
    } else {
        Write-Host "[ERRO] Arquivo CRX não foi gerado!" -ForegroundColor Red
        Write-Host "Verifique se há erros no console do Chrome." -ForegroundColor Red
        Write-Host "Tentando método alternativo..." -ForegroundColor Yellow
        
        # Método alternativo: usar o Chrome em modo headless
        Write-Host "Executando Chrome em modo headless..." -ForegroundColor Gray
        & $chromePath --headless --pack-extension=$extensionDir --disable-gpu --no-sandbox
        
        Start-Sleep -Seconds 2
        
        if (Test-Path $crxFile) {
            Write-Host "✅ CRX gerado com método alternativo!" -ForegroundColor Green
            # Renomear arquivos
            $newCrxName = "SEI-Smart-v$version.crx"
            $newCrxPath = Join-Path $extensionDir $newCrxName
            Move-Item $crxFile $newCrxPath -Force
            
            if (Test-Path $pemFileOutput) {
                $newPemName = "SEI-Smart-v$version.pem"
                $newPemPath = Join-Path $extensionDir $newPemName
                Move-Item $pemFileOutput $newPemPath -Force
            }
            
            Write-Host "Arquivos criados com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "[ERRO] Falha ao gerar CRX com ambos os métodos." -ForegroundColor Red
            Write-Host "Use o arquivo ZIP como alternativa: dist/SEI-Smart-v$version.zip" -ForegroundColor Yellow
            exit 1
        }
    }
    
} catch {
    Write-Host "[ERRO] Falha ao gerar CRX!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Use o arquivo ZIP como alternativa: dist/SEI-Smart-v$version.zip" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Processo concluído com sucesso!" -ForegroundColor Green
