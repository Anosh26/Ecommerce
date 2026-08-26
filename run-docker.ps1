# PowerShell script to run Paaptol E-Commerce application with Docker CLI (without Docker Compose)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Starting Paaptol Microservices (Docker CLI without Compose) " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Create Docker Network
Write-Host "`n[1/7] Creating bridge network 'ecommerce-network'..." -ForegroundColor Yellow
$networkExists = docker network ls --format '{{.Name}}' | Select-String -Pattern '^ecommerce-network$'
if (-not $networkExists) {
    docker network create ecommerce-network
    Write-Host "Network 'ecommerce-network' created." -ForegroundColor Green
} else {
    Write-Host "Network 'ecommerce-network' already exists." -ForegroundColor Gray
}

# 2. Create Named Volumes
Write-Host "`n[2/7] Creating persistent Docker volumes..." -ForegroundColor Yellow
$volumes = @("pgdata_auth", "pgdata_search", "pgdata_cart", "pgdata_buy", "pgdata_payment")
foreach ($vol in $volumes) {
    $volExists = docker volume ls --format '{{.Name}}' | Select-String -Pattern "^$vol$"
    if (-not $volExists) {
        docker volume create $vol | Out-Null
        Write-Host "Volume '$vol' created." -ForegroundColor Green
    } else {
        Write-Host "Volume '$vol' already exists." -ForegroundColor Gray
    }
}

# 3. Start Database Containers
Write-Host "`n[3/7] Launching PostgreSQL database containers..." -ForegroundColor Yellow
$pgPass = "Qwyhao268910_@&[+619hsksh2901h"

$dbConfigs = @(
    @{ Name = "paaptol-auth-db"; Port = "54321:5432"; Vol = "pgdata_auth"; DB = "paaptol_auth" },
    @{ Name = "paaptol-search-db"; Port = "54322:5432"; Vol = "pgdata_search"; DB = "paaptol_search" },
    @{ Name = "paaptol-cart-db"; Port = "54323:5432"; Vol = "pgdata_cart"; DB = "paaptol_cart" },
    @{ Name = "paaptol-buy-db"; Port = "54324:5432"; Vol = "pgdata_buy"; DB = "paaptol_buy" },
    @{ Name = "paaptol-payment-db"; Port = "54325:5432"; Vol = "pgdata_payment"; DB = "paaptol_payment" }
)

foreach ($db in $dbConfigs) {
    $cName = $db.Name
    $exists = docker ps -a --format '{{.Names}}' | Select-String -Pattern "^$cName$"
    if ($exists) {
        Write-Host "Removing existing container '$cName'..." -ForegroundColor Gray
        docker rm -f $cName | Out-Null
    }
    
    docker run -d --name $cName `
        --network ecommerce-network `
        -p $db.Port `
        -v "$($db.Vol):/var/lib/postgresql" `
        -e "POSTGRES_USER=postgres" `
        -e "POSTGRES_PASSWORD=$pgPass" `
        -e "POSTGRES_DB=$($db.DB)" `
        postgres:16-alpine | Out-Null
    Write-Host "Database container '$cName' running on port $($db.Port)." -ForegroundColor Green
}

# 4. Build Application Docker Image
Write-Host "`n[4/7] Building application image 'ecommerce-app'..." -ForegroundColor Yellow
docker build -t ecommerce-app .
Write-Host "Image 'ecommerce-app' built successfully." -ForegroundColor Green

# 5. Wait for DB readiness & Run Setup Script
Write-Host "`n[5/7] Initializing microservice database schemas & seeds..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$authConn = "postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-auth-db:5432/paaptol_auth"
$searchConn = "postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-search-db:5432/paaptol_search"
$cartConn = "postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-cart-db:5432/paaptol_cart"
$buyConn = "postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-buy-db:5432/paaptol_buy"
$paymentConn = "postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-payment-db:5432/paaptol_payment"

docker run --rm --name paaptol-db-setup `
    --network ecommerce-network `
    -e "DATABASE_URL=$authConn" `
    -e "AUTH_DATABASE_URL=$authConn" `
    -e "SEARCH_DATABASE_URL=$searchConn" `
    -e "CART_DATABASE_URL=$cartConn" `
    -e "BUY_DATABASE_URL=$buyConn" `
    -e "PAYMENT_DATABASE_URL=$paymentConn" `
    ecommerce-app npx tsx src/scripts/setup-microservices-db.ts

Write-Host "Database schemas initialized successfully." -ForegroundColor Green

# Helper function to clear existing container
function Clear-Container($name) {
    $exists = docker ps -a --format '{{.Names}}' | Select-String -Pattern "^$name$"
    if ($exists) {
        docker rm -f $name | Out-Null
    }
}

# 6. Launch Microservice Containers
Write-Host "`n[6/7] Launching backend microservices and API Gateway..." -ForegroundColor Yellow

# Auth Service
Clear-Container "paaptol-auth-service"
docker run -d --name paaptol-auth-service `
    --network ecommerce-network `
    -p 3001:3001 `
    -e "AUTH_DATABASE_URL=$authConn" `
    ecommerce-app npx tsx src/services/auth.ts | Out-Null
Write-Host "Auth Service running on port 3001" -ForegroundColor Green

# Search Service
Clear-Container "paaptol-search-service"
docker run -d --name paaptol-search-service `
    --network ecommerce-network `
    -p 3002:3002 `
    -e "SEARCH_DATABASE_URL=$searchConn" `
    ecommerce-app npx tsx src/services/search.ts | Out-Null
Write-Host "Search Service running on port 3002" -ForegroundColor Green

# Cart Service
Clear-Container "paaptol-cart-service"
docker run -d --name paaptol-cart-service `
    --network ecommerce-network `
    -p 3003:3003 `
    -e "CART_DATABASE_URL=$cartConn" `
    ecommerce-app npx tsx src/services/cart.ts | Out-Null
Write-Host "Cart Service running on port 3003" -ForegroundColor Green

# Payment Service
Clear-Container "paaptol-payment-service"
docker run -d --name paaptol-payment-service `
    --network ecommerce-network `
    -p 3005:3005 `
    -e "PAYMENT_DATABASE_URL=$paymentConn" `
    ecommerce-app npx tsx src/services/payment.ts | Out-Null
Write-Host "Payment Service running on port 3005" -ForegroundColor Green

# Buy Service
Clear-Container "paaptol-buy-service"
docker run -d --name paaptol-buy-service `
    --network ecommerce-network `
    -p 3004:3004 `
    -e "BUY_DATABASE_URL=$buyConn" `
    -e "SEARCH_SERVICE_URL=http://paaptol-search-service:3002" `
    -e "PAYMENT_SERVICE_URL=http://paaptol-payment-service:3005" `
    ecommerce-app npx tsx src/services/buy.ts | Out-Null
Write-Host "Buy Service running on port 3004" -ForegroundColor Green

# Gateway Service
Clear-Container "paaptol-gateway-service"
docker run -d --name paaptol-gateway-service `
    --network ecommerce-network `
    -p 5000:5000 `
    -e "AUTH_SERVICE_URL=http://paaptol-auth-service:3001" `
    -e "SEARCH_SERVICE_URL=http://paaptol-search-service:3002" `
    -e "CART_SERVICE_URL=http://paaptol-cart-service:3003" `
    -e "BUY_SERVICE_URL=http://paaptol-buy-service:3004" `
    -e "PAYMENT_SERVICE_URL=http://paaptol-payment-service:3005" `
    ecommerce-app npx tsx src/services/gateway.ts | Out-Null
Write-Host "API Gateway Service running on port 5000" -ForegroundColor Green

# 7. Launch Frontend Container
Write-Host "`n[7/7] Launching Next.js Frontend..." -ForegroundColor Yellow
Clear-Container "paaptol-frontend"
docker run -d --name paaptol-frontend `
    --network ecommerce-network `
    -p 3000:3000 `
    -e "NEXT_GATEWAY_URL=http://paaptol-gateway-service:5000" `
    ecommerce-app npm run dev | Out-Null
Write-Host "Frontend application running on port 3000" -ForegroundColor Green

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " All services started successfully without Docker Compose!" -ForegroundColor Cyan
Write-Host " Frontend URL: http://localhost:3000" -ForegroundColor Green
Write-Host " API Gateway:  http://localhost:5000" -ForegroundColor Green
Write-Host " Run .\stop-docker.ps1 to stop and clean up." -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
