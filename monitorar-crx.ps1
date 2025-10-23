# Script para monitorar e renomear arquivos CRX automaticamente
Write-Host "=== MONITOR CRX - SEI SMART ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔍 Monitorando criação de arquivos CRX..." -ForegroundColor Yellow
Write-Host "Execute o comando 'Compactar extensão' no Chrome e eu renomearei os arquivos automaticamente!" -ForegroundColor White
Write-Host ""

$extensionDir = $PSScriptRoot
$version = "1.1.0"

# Ler versão do manifest.json
$manifestPath = Join-Path $extensionDir "manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version

Write-Host "Versão: $version" -ForegroundColor Cyan
Write-Host "Monitorando pasta: $extensionDir" -ForegroundColor Gray
Write-Host ""

# Monitorar por 60 segundos
$timeout = 60
$elapsed = 0

while ($elapsed -lt $timeout) {
    # Verificar se arquivos CRX foram criados
    $crxFile = Join-Path $extensionDir "SEI-extension.crx"
    $pemFile = Join-Path $extensionDir "SEI-extension.pem"
    
    if (Test-Path $crxFile) {
        Write-Host "✅ Arquivo CRX encontrado!" -ForegroundColor Green
        
        # Renomear CRX
        $newCrxName = "SEI-Smart-v$version.crx"
        $newCrxPath = Join-Path $extensionDir $newCrxName
        Move-Item $crxFile $newCrxPath -Force
        
        $fileSize = (Get-Item $newCrxPath).Length
        $fileSizeKB = [math]::Round($fileSize / 1KB, 2)
        
        Write-Host "📦 CRX renomeado para: $newCrxName" -ForegroundColor Cyan
        Write-Host "📏 Tamanho: $fileSizeKB KB" -ForegroundColor Cyan
        
        # Renomear PEM se existir
        if (Test-Path $pemFile) {
            $newPemName = "SEI-Smart-v$version.pem"
            $newPemPath = Join-Path $extensionDir $newPemName
            Move-Item $pemFile $newPemPath -Force
            
            Write-Host "🔑 Chave privada renomeada para: $newPemName" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Red
            Write-Host "- GUARDE o arquivo .pem em local seguro!" -ForegroundColor Red
            Write-Host "- Você precisará dele para futuras atualizações" -ForegroundColor Red
            Write-Host "- NUNCA compartilhe o arquivo .pem" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "🎉 CRX gerado com sucesso!" -ForegroundColor Green
        Write-Host "Arquivos criados:" -ForegroundColor White
        Write-Host "- $newCrxName" -ForegroundColor Cyan
        if (Test-Path $pemFile) {
            Write-Host "- $newPemName" -ForegroundColor Yellow
        }
        
        # Abrir pasta
        Start-Process explorer.exe $extensionDir
        
        exit 0
    }
    
    # Aguardar 1 segundo
    Start-Sleep -Seconds 1
    $elapsed++
    
    # Mostrar progresso a cada 10 segundos
    if ($elapsed % 10 -eq 0) {
        $remaining = $timeout - $elapsed
        Write-Host "⏳ Aguardando... $remaining segundos restantes" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "⏰ Timeout atingido (60 segundos)" -ForegroundColor Yellow
Write-Host "Execute o comando 'Compactar extensão' no Chrome e rode este script novamente." -ForegroundColor White
Write-Host "Ou use o arquivo ZIP como alternativa: dist/SEI-Smart-v$version.zip" -ForegroundColor Yellow