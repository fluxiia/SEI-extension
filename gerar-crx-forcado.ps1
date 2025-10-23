# Script para Forçar Geração de CRX - Remove todas as chaves existentes
Write-Host "=== GERADOR CRX FORÇADO - SEI SMART ===" -ForegroundColor Cyan
Write-Host ""

# Configurações
$extensionDir = $PSScriptRoot
$chromePath = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"

# Verificar Chrome
if (-not (Test-Path $chromePath)) {
    Write-Host "[ERRO] Chrome não encontrado em: $chromePath" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Chrome encontrado" -ForegroundColor Green

# Ler versão
$manifest = Get-Content "manifest.json" -Raw | ConvertFrom-Json
$version = $manifest.version
Write-Host "Versão: $version" -ForegroundColor Cyan

Write-Host ""
Write-Host "🧹 Limpando arquivos antigos..." -ForegroundColor Yellow

# Remover TODOS os arquivos CRX/PEM existentes
Get-ChildItem -Name "*.crx" | ForEach-Object { Remove-Item $_ -Force }
Get-ChildItem -Name "*.pem" | ForEach-Object { Remove-Item $_ -Force }
Get-ChildItem -Name "SEI-extension.*" | ForEach-Object { Remove-Item $_ -Force }

Write-Host "✅ Arquivos antigos removidos" -ForegroundColor Green

Write-Host ""
Write-Host "🔧 Fechando todas as instâncias do Chrome..." -ForegroundColor Yellow

# Fechar Chrome completamente
Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "✅ Chrome fechado" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Gerando CRX..." -ForegroundColor Yellow

try {
    # Método 1: Chrome normal
    Write-Host "Tentando método 1..." -ForegroundColor Gray
    $process1 = Start-Process -FilePath $chromePath -ArgumentList "--pack-extension=$extensionDir" -Wait -PassThru -WindowStyle Hidden
    
    Start-Sleep -Seconds 3
    
    if (Test-Path "SEI-extension.crx") {
        Write-Host "✅ Método 1 funcionou!" -ForegroundColor Green
        goto :Success
    }
    
    # Método 2: Chrome headless
    Write-Host "Tentando método 2 (headless)..." -ForegroundColor Gray
    $process2 = Start-Process -FilePath $chromePath -ArgumentList "--headless", "--pack-extension=$extensionDir", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage" -Wait -PassThru -WindowStyle Hidden
    
    Start-Sleep -Seconds 3
    
    if (Test-Path "SEI-extension.crx") {
        Write-Host "✅ Método 2 funcionou!" -ForegroundColor Green
        goto :Success
    }
    
    # Método 3: Chrome com perfil temporário
    Write-Host "Tentando método 3 (perfil temporário)..." -ForegroundColor Gray
    $tempProfile = Join-Path $env:TEMP "chrome-temp-profile"
    if (Test-Path $tempProfile) { Remove-Item $tempProfile -Recurse -Force }
    
    $process3 = Start-Process -FilePath $chromePath -ArgumentList "--pack-extension=$extensionDir", "--user-data-dir=$tempProfile", "--no-first-run", "--disable-default-apps" -Wait -PassThru -WindowStyle Hidden
    
    Start-Sleep -Seconds 3
    
    if (Test-Path "SEI-extension.crx") {
        Write-Host "✅ Método 3 funcionou!" -ForegroundColor Green
        goto :Success
    }
    
    # Se chegou aqui, falhou
    Write-Host "[ERRO] Todos os métodos falharam!" -ForegroundColor Red
    Write-Host "Use o arquivo ZIP: dist/SEI-Smart-v$version.zip" -ForegroundColor Yellow
    exit 1
    
    :Success
    # Renomear arquivos
    $newCrxName = "SEI-Smart-v$version.crx"
    $newPemName = "SEI-Smart-v$version.pem"
    
    Move-Item "SEI-extension.crx" $newCrxName -Force
    
    if (Test-Path "SEI-extension.pem") {
        Move-Item "SEI-extension.pem" $newPemName -Force
    }
    
    $fileSize = (Get-Item $newCrxName).Length
    $fileSizeKB = [math]::Round($fileSize / 1KB, 2)
    
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "   CRX GERADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Arquivo CRX: $newCrxName" -ForegroundColor Cyan
    Write-Host "Tamanho: $fileSizeKB KB" -ForegroundColor Cyan
    
    if (Test-Path $newPemName) {
        Write-Host "Chave privada: $newPemName" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "⚠️  GUARDE o arquivo .pem em local seguro!" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "✅ Processo concluído com sucesso!" -ForegroundColor Green
    
    # Limpar perfil temporário
    if (Test-Path $tempProfile) { Remove-Item $tempProfile -Recurse -Force }
    
} catch {
    Write-Host "[ERRO] Erro ao executar: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Use o arquivo ZIP: dist/SEI-Smart-v$version.zip" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
