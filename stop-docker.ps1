# PowerShell script to stop and remove all Paaptol Docker containers and network

Write-Host "============================================================" -ForegroundColor Yellow
Write-Host " Stopping & Cleaning Up Paaptol Docker Containers " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

$containers = @(
    "paaptol-frontend",
    "paaptol-gateway-service",
    "paaptol-buy-service",
    "paaptol-payment-service",
    "paaptol-cart-service",
    "paaptol-search-service",
    "paaptol-auth-service",
    "paaptol-payment-db",
    "paaptol-buy-db",
    "paaptol-cart-db",
    "paaptol-search-db",
    "paaptol-auth-db"
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
