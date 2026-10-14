# PowerShell script to stop and remove Paaptol 4-Microservices & Databases containers

$ErrorActionPreference = "SilentlyContinue"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Stopping & Cleaning Up Paaptol 4-Microservices & Databases  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$containers = @(
    "paaptol-frontend",
    "paaptol-gateway-service",
    "paaptol-db-sync-service",
    "paaptol-order-service",
    "paaptol-cart-service",
    "paaptol-search-service",
    "paaptol-auth-service",
    "paaptol-order-db",
    "paaptol-cart-db",
    "paaptol-search-db",
    "paaptol-auth-db",
    # Legacy names cleanup
    "paaptol-buy-service",
    "paaptol-payment-service",
    "paaptol-payment-db",
    "paaptol-buy-db"
)

foreach ($c in $containers) {
    $exists = docker ps -a --format '{{.Names}}' | Select-String -Pattern "^$c$"
    if ($exists) {
        Write-Host "Stopping and removing '$c'..." -ForegroundColor Gray
        docker rm -f $c | Out-Null
    }
}

Write-Host "Removing network 'ecommerce-network'..." -ForegroundColor Gray
$netExists = docker network ls --format '{{.Name}}' | Select-String -Pattern '^ecommerce-network$'
if ($netExists) {
    docker network rm ecommerce-network | Out-Null
}

Write-Host "Cleanup completed successfully!" -ForegroundColor Green
