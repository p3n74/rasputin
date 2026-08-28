# Allow Winnow (and optional preview ports) from the Linux VM subnet only.
#
# Winnow must bind 0.0.0.0, not 127.0.0.1:
#   npm run ui -- --remote --token <WINNOW_UI_TOKEN> --port 3210
#
# Dev servers (Vite/Next) on the Windows host must also bind 0.0.0.0, e.g.:
#   npm run dev -- --host 0.0.0.0 --port 5173
#
# Run from an elevated PowerShell:
#   .\allow-winnow-ports.ps1 -VmSubnet 192.168.56.0/24 -Ports 3210,5173,3000

param(
    [Parameter(Mandatory = $false)]
    [string]$VmSubnet = "192.168.56.0/24",

    [Parameter(Mandatory = $false)]
    [int[]]$Ports = @(3210, 5173, 3000, 8080)
)

$ErrorActionPreference = "Stop"

foreach ($Port in $Ports) {
    $Name = "Rasputin allow TCP $Port from VM subnet"
    $existing = Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue
    if ($existing) {
        Remove-NetFirewallRule -DisplayName $Name
    }

    New-NetFirewallRule `
        -DisplayName $Name `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort $Port `
        -RemoteAddress $VmSubnet `
        -Profile Any | Out-Null

    Write-Host "Allowed inbound TCP $Port from $VmSubnet"
}

Write-Host "Done. Keep Winnow on --remote so it listens on 0.0.0.0."
