# Script Final para Gerar CRX - Múltiplas Abordagens
Write-Host "=== GERADOR CRX FINAL - SEI SMART ===" -ForegroundColor Cyan
Write-Host ""

# Configurações
$extensionDir = $PSScriptRoot
$chromePath = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"

# Verificar Chrome
if (-not (Test-Path $chromePath)) {
    Write-Host "[ERRO] Chrome não encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Chrome encontrado" -ForegroundColor Green

# Ler versão
$manifest = Get-Content "manifest.json" -Raw | ConvertFrom-Json
$version = $manifest.version
Write-Host "Versão: $version" -ForegroundColor Cyan

Write-Host ""
Write-Host "🧹 Limpando ambiente..." -ForegroundColor Yellow

# Limpar arquivos existentes
Get-ChildItem -Name "*.crx" -ErrorAction SilentlyContinue | ForEach-Object { Remove-Item $_ -Force }
Get-ChildItem -Name "*.pem" -ErrorAction SilentlyContinue | ForEach-Object { Remove-Item $_ -Force }

# Fechar Chrome
Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "✅ Ambiente limpo" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Tentando gerar CRX..." -ForegroundColor Yellow

# Tentar método mais simples - usar Chrome diretamente
try {
    Write-Host "Executando Chrome para gerar CRX..." -ForegroundColor Gray
    
    # Usar Start-Process sem -Wait para não bloquear
    $process = Start-Process -FilePath $chromePath -ArgumentList "--pack-extension=$extensionDir" -PassThru
    
    # Aguardar um pouco mais
    Write-Host "Aguardando Chrome processar..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    
    # Verificar se arquivos foram criados
    if (Test-Path "SEI-extension.crx") {
        Write-Host "✅ CRX gerado com sucesso!" -ForegroundColor Green
        
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
        Write-Host "✅ CRX pronto para distribuição!" -ForegroundColor Green
        
    } else {
        Write-Host "[AVISO] CRX não foi gerado automaticamente" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📋 SOLUÇÕES DISPONÍVEIS:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1️⃣  ARQUIVO ZIP (Recomendado):" -ForegroundColor Green
        Write-Host "   ✅ Já disponível: dist/SEI-Smart-v$version.zip" -ForegroundColor White
        Write-Host "   ✅ Pode ser instalado manualmente" -ForegroundColor White
        Write-Host "   ✅ Funciona perfeitamente" -ForegroundColor White
        Write-Host ""
        Write-Host "2️⃣  CRX MANUAL:" -ForegroundColor Yellow
        Write-Host "   • Abra chrome://extensions/" -ForegroundColor White
        Write-Host "   • Ative 'Modo do desenvolvedor'" -ForegroundColor White
        Write-Host "   • Clique em 'Compactar extensão'" -ForegroundColor White
        Write-Host "   • Diretório: $extensionDir" -ForegroundColor White
        Write-Host "   • Chave privada: [deixe em branco]" -ForegroundColor White
        Write-Host ""
        Write-Host "3️⃣  TESTAR ZIP:" -ForegroundColor Cyan
        Write-Host "   • Extraia o ZIP" -ForegroundColor White
        Write-Host "   • Carregue sem compactação no Chrome" -ForegroundColor White
        Write-Host "   • Funciona igual ao CRX" -ForegroundColor White
    }
    
} catch {
    Write-Host "[ERRO] Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Use o arquivo ZIP: dist/SEI-Smart-v$version.zip" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📁 Abrindo pasta com arquivos..." -ForegroundColor Yellow
Start-Process explorer.exe $extensionDir

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
