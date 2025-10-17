# Script para Gerar Pacote da Extensão SEI Smart
# Autor: Desenvolvimento Governo do Maranhão
# Data: 2025

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   SEI Smart - Gerador de Pacote" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Configurações
$extensionDir = $PSScriptRoot
$version = "1.0.0"
$outputDir = Join-Path $PSScriptRoot "dist"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Criar diretório de saída se não existir
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
    Write-Host "[OK] Diretório dist/ criado" -ForegroundColor Green
}

# Lista de arquivos para incluir
$filesToInclude = @(
    "manifest.json",
    "background.js",
    "contentScript.js",
    "contentScript.css",
    "popup.html",
    "popup.js",
    "popup.css",
    "options.html",
    "options.js",
    "options.css",
    "README.md",
    "COMO_INSTALAR.md"
)

# Lista de arquivos opcionais
$optionalFiles = @(
    "icon16.png",
    "icon48.png",
    "icon128.png",
    "LICENSE"
)

Write-Host "[INFO] Verificando arquivos..." -ForegroundColor Yellow

# Verificar arquivos obrigatórios
$missingFiles = @()
foreach ($file in $filesToInclude) {
    $filePath = Join-Path $extensionDir $file
    if (Test-Path $filePath) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [ERRO] $file não encontrado!" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "[ERRO] Arquivos obrigatórios faltando!" -ForegroundColor Red
    Write-Host "Execute o script da pasta correta da extensão." -ForegroundColor Red
    exit 1
}

# Verificar arquivos opcionais
foreach ($file in $optionalFiles) {
    $filePath = Join-Path $extensionDir $file
    if (Test-Path $filePath) {
        Write-Host "  [OK] $file (opcional)" -ForegroundColor Green
        $filesToInclude += $file
    }
}

Write-Host ""
Write-Host "[INFO] Lendo versão do manifest.json..." -ForegroundColor Yellow

# Ler versão do manifest.json
$manifestPath = Join-Path $extensionDir "manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version

Write-Host "  Versão encontrada: $version" -ForegroundColor Cyan

# Nome do arquivo de saída
$zipFileName = "SEI-Smart-v$version.zip"
$zipFilePath = Join-Path $outputDir $zipFileName

# Remover arquivo existente se houver
if (Test-Path $zipFilePath) {
    Remove-Item $zipFilePath -Force
    Write-Host "[INFO] Removendo versão anterior..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[INFO] Criando pacote ZIP..." -ForegroundColor Yellow

# Criar pasta temporária
$tempDir = Join-Path $env:TEMP "SEI-Smart-temp-$timestamp"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    # Copiar arquivos para pasta temporária
    foreach ($file in $filesToInclude) {
        $sourcePath = Join-Path $extensionDir $file
        $destPath = Join-Path $tempDir $file
        
        if (Test-Path $sourcePath) {
            Copy-Item -Path $sourcePath -Destination $destPath -Force
            Write-Host "  Copiado: $file" -ForegroundColor Gray
        }
    }
    
    # Criar ZIP
    Write-Host ""
    Write-Host "[INFO] Compactando arquivos..." -ForegroundColor Yellow
    Compress-Archive -Path "$tempDir\*" -DestinationPath $zipFilePath -Force
    
    # Obter tamanho do arquivo
    $fileSize = (Get-Item $zipFilePath).Length
    $fileSizeKB = [math]::Round($fileSize / 1KB, 2)
    
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "   PACOTE CRIADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Arquivo: $zipFileName" -ForegroundColor Cyan
    Write-Host "Localização: $zipFilePath" -ForegroundColor Cyan
    Write-Host "Tamanho: $fileSizeKB KB" -ForegroundColor Cyan
    Write-Host "Versão: $version" -ForegroundColor Cyan
    Write-Host ""
    
    # Abrir pasta de saída
    Write-Host "[INFO] Abrindo pasta dist/..." -ForegroundColor Yellow
    Start-Process explorer.exe $outputDir
    
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Yellow
    Write-Host "1. Teste o arquivo ZIP instalando em uma nova aba anônima" -ForegroundColor White
    Write-Host "2. Distribua junto com o arquivo COMO_INSTALAR.md" -ForegroundColor White
    Write-Host "3. Para gerar .crx assinado, veja GERAR_CRX.md" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "[ERRO] Falha ao criar pacote!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Limpar pasta temporária
    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force
    }
}

# Criar também uma cópia com timestamp
$zipFileNameTimestamp = "SEI-Smart-v$version-$timestamp.zip"
$zipFilePathTimestamp = Join-Path $outputDir $zipFileNameTimestamp
Copy-Item -Path $zipFilePath -Destination $zipFilePathTimestamp

Write-Host "[INFO] Backup criado: $zipFileNameTimestamp" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

