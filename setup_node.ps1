# Configurazione ambiente per Node.js Portable
Set-ExecutionPolicy Bypass -Scope Process
$NODE_PATH = "C:\Users\DemelaA\OneDrive - Vodafone Group\Documents\PERSONAL\node_portable"
$env:Path = "$NODE_PATH;$env:Path"

Write-Host "------------------------------------------" -ForegroundColor Cyan
Write-Host "Ambiente configurato con Node.js Portable" -ForegroundColor Green
Write-Host "Percorso: $NODE_PATH" -ForegroundColor Gray
Write-Host "------------------------------------------" -ForegroundColor Cyan

# Verifica versioni
try {
    Write-Host "Node version: $(node -v)"
    Write-Host "NPM version:  $(npm -v)"
} catch {
    Write-Host "Errore: Node.js non trovato nel percorso specificato." -ForegroundColor Red
}
