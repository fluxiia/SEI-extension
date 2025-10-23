# Script Simples para Gerar CRX da Extensão SEI Smart
Write-Host "=== GERADOR CRX SIMPLES - SEI SMART ===" -ForegroundColor Cyan
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

# Remover arquivos CRX/PEM existentes
Remove-Item "*.crx" -Force -ErrorAction SilentlyContinue
Remove-Item "*.pem" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Gerando CRX..." -ForegroundColor Yellow

# Gerar CRX usando Chrome
try {
    # Executar comando
    $process = Start-Process -FilePath $chromePath -ArgumentList "--pack-extension=$extensionDir" -Wait -PassThru -WindowStyle Hidden
    
    # Aguardar um pouco
    Start-Sleep -Seconds 2
    
    # Verificar se arquivos foram criados
    $crxFile = "SEI-extension.crx"
    $pemFile = "SEI-extension.pem"
    
    if (Test-Path $crxFile) {
        # Renomear arquivos
        $newCrxName = "SEI-Smart-v$version.crx"
        $newPemName = "SEI-Smart-v$version.pem"
        
        Move-Item $crxFile $newCrxName -Force
        
        if (Test-Path $pemFile) {
            Move-Item $pemFile $newPemName -Force
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
        Write-Host "✅ Processo concluído!" -ForegroundColor Green
        
    } else {
        Write-Host "[ERRO] Arquivo CRX não foi gerado!" -ForegroundColor Red
        Write-Host "Tentando método alternativo..." -ForegroundColor Yellow
        
        # Método alternativo - usar Chrome com parâmetros diferentes
        Start-Process -FilePath $chromePath -ArgumentList "--headless", "--pack-extension=$extensionDir", "--disable-gpu", "--no-sandbox" -Wait -PassThru -WindowStyle Hidden
        
        Start-Sleep -Seconds 2
        
        if (Test-Path $crxFile) {
            $newCrxName = "SEI-Smart-v$version.crx"
            $newPemName = "SEI-Smart-v$version.pem"
            
            Move-Item $crxFile $newCrxName -Force
            
            if (Test-Path $pemFile) {
                Move-Item $pemFile $newPemName -Force
            }
            
            Write-Host "✅ CRX gerado com método alternativo!" -ForegroundColor Green
        } else {
            Write-Host "[ERRO] Falha ao gerar CRX!" -ForegroundColor Red
            Write-Host "Use o arquivo ZIP: dist/SEI-Smart-v$version.zip" -ForegroundColor Yellow
            exit 1
        }
    }
    
} catch {
    Write-Host "[ERRO] Erro ao executar: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Use o arquivo ZIP: dist/SEI-Smart-v$version.zip" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
