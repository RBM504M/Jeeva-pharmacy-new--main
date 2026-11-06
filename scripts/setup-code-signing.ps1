# Setup Self-Signed Code Signing Certificate for Jeeva Pharmacy
# Run in PowerShell

param(
    [string]$CertName = "Jeeva Pharmacy",
    [string]$Password = "JeevaPharmacy2026!",
    [string]$OutputDir = "$PSScriptRoot\..\certs"
)

$ErrorActionPreference = "Stop"

# 1. Resolve output directory
$outPath = [System.IO.Path]::GetFullPath($OutputDir)
if (-not (Test-Path $outPath)) {
    New-Item -ItemType Directory -Path $outPath -Force | Out-Null
}

$cerFile = Join-Path $outPath "JeevaPharmacy.cer"
$pfxFile = Join-Path $outPath "JeevaPharmacy.pfx"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Jeeva Pharmacy - Code Signing Certificate Generator" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 2. Check if a certificate already exists with this Subject in CurrentUser\My
$existing = Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object { $_.Subject -like "*CN=$CertName*" } | Select-Object -First 1

if ($existing) {
    Write-Host "Found existing certificate: $($existing.Thumbprint)" -ForegroundColor Yellow
    $cert = $existing
} else {
    Write-Host "Creating new self-signed Code Signing certificate (valid for 10 years)..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject "CN=$CertName, O=Jeeva Pharmacy, C=IN" `
        -KeyUsage DigitalSignature `
        -FriendlyName "Jeeva Pharmacy Code Signing" `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -NotAfter (Get-Date).AddYears(10)
    Write-Host "Successfully generated certificate: $($cert.Thumbprint)" -ForegroundColor Green
}

# 3. Export public certificate (.cer)
Export-Certificate -Cert $cert -FilePath $cerFile -Force | Out-Null
Write-Host "[+] Exported Public Certificate: $cerFile" -ForegroundColor Green

# 4. Export private key certificate (.pfx) for electron-builder / signtool
$secPassword = ConvertTo-SecureString -String $Password -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxFile -Password $secPassword -Force | Out-Null
Write-Host "[+] Exported Private Key (.pfx): $pfxFile" -ForegroundColor Green

# 5. Install .cer into Windows Certificate Stores
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "Administrator privileges confirmed. Installing into LocalMachine 'Trusted Root' and 'Trusted Publisher'..." -ForegroundColor Yellow
    Import-Certificate -FilePath $cerFile -CertStoreLocation "Cert:\LocalMachine\Root" | Out-Null
    Import-Certificate -FilePath $cerFile -CertStoreLocation "Cert:\LocalMachine\TrustedPublisher" | Out-Null
    Write-Host "[+] Successfully installed into LocalMachine stores (All Users)." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[INFO] Current PowerShell window is not running as Administrator." -ForegroundColor Cyan
    Write-Host "To install system-wide into 'Trusted Root Certification Authorities' on this or any store PC:" -ForegroundColor Cyan
    Write-Host "  1. Right-click 'certs\install-cert-on-store-pc.bat' -> 'Run as administrator'" -ForegroundColor White
    Write-Host "  OR" -ForegroundColor Cyan
    Write-Host "  2. Open PowerShell as Administrator and run:" -ForegroundColor White
    Write-Host "     Import-Certificate -FilePath `"$cerFile`" -CertStoreLocation `"Cert:\LocalMachine\Root`"" -ForegroundColor Gray
    Write-Host "     Import-Certificate -FilePath `"$cerFile`" -CertStoreLocation `"Cert:\LocalMachine\TrustedPublisher`"" -ForegroundColor Gray
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Setup complete! Ready for packaging and store deployment." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
