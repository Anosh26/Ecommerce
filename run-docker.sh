#!/usr/bin/env bash
set -e

echo "============================================================"
echo " Starting Paaptol Microservices (Docker CLI without Compose) "
echo "============================================================"

# 1. Create Docker Network
echo -e "\n[1/7] Creating bridge network 'ecommerce-network'..."
if ! docker network ls --format '{{.Name}}' | grep -q '^ecommerce-network$'; then
    docker network create ecommerce-network
    echo "Network 'ecommerce-network' created."
else
    echo "Network 'ecommerce-network' already exists."
fi

# 2. Create Named Volumes
echo -e "\n[2/7] Creating persistent Docker volumes..."
volumes=("pgdata_auth" "pgdata_search" "pgdata_cart" "pgdata_buy" "pgdata_payment")
for vol in "${volumes[@]}"; do
    if ! docker volume ls --format '{{.Name}}' | grep -q "^${vol}$"; then
        docker volume create "${vol}" > /dev/null
        echo "Volume '${vol}' created."
    else
        echo "Volume '${vol}' already exists."
    fi
done

# 3. Start Database Containers
echo -e "\n[3/7] Launching PostgreSQL database containers..."
PG_PASS="Qwyhao268910_@&[+619hsksh2901h"

run_db () {
    local name=$1
    local port=$2
    local vol=$3
    local db=$4

    docker rm -f "$name" 2>/dev/null || true
    docker run -d --name "$name" \
        --network ecommerce-network \
        -p "$port" \
        -v "${vol}:/var/lib/postgresql" \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD="$PG_PASS" \
        -e POSTGRES_DB="$db" \
        postgres:16-alpine > /dev/null
    echo "Database container '$name' running on port $port."
}

run_db "paaptol-auth-db" "54321:5432" "pgdata_auth" "paaptol_auth"
run_db "paaptol-search-db" "54322:5432" "pgdata_search" "paaptol_search"
run_db "paaptol-cart-db" "54323:5432" "pgdata_cart" "paaptol_cart"
run_db "paaptol-buy-db" "54324:5432" "pgdata_buy" "paaptol_buy"
run_db "paaptol-payment-db" "54325:5432" "pgdata_payment" "paaptol_payment"

# 4. Build Application Docker Image
echo -e "\n[4/7] Building application image 'ecommerce-app'..."
docker build -t ecommerce-app .
echo "Image 'ecommerce-app' built successfully."

# 5. Wait for DB readiness & Run Setup Script
echo -e "\n[5/7] Initializing microservice database schemas & seeds..."
sleep 5

AUTH_CONN="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-auth-db:5432/paaptol_auth"
SEARCH_CONN="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-search-db:5432/paaptol_search"
CART_CONN="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-cart-db:5432/paaptol_cart"
BUY_CONN="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-buy-db:5432/paaptol_buy"
PAYMENT_CONN="postgresql://postgres:Qwyhao268910_%40%26%5B%2B619hsksh2901h@paaptol-payment-db:5432/paaptol_payment"

docker run --rm --name paaptol-db-setup \
    --network ecommerce-network \
    -e DATABASE_URL="$AUTH_CONN" \
    -e AUTH_DATABASE_URL="$AUTH_CONN" \
    -e SEARCH_DATABASE_URL="$SEARCH_CONN" \
    -e CART_DATABASE_URL="$CART_CONN" \
    -e BUY_DATABASE_URL="$BUY_CONN" \
    -e PAYMENT_DATABASE_URL="$PAYMENT_CONN" \
    ecommerce-app npx tsx src/scripts/setup-microservices-db.ts

echo "Database schemas initialized successfully."

clear_container () {
    docker rm -f "$1" 2>/dev/null || true
}

# 6. Launch Microservice Containers
echo -e "\n[6/7] Launching backend microservices and API Gateway..."

# Auth Service
clear_container "paaptol-auth-service"
docker run -d --name paaptol-auth-service \
    --network ecommerce-network \
    -p 3001:3001 \
    -e AUTH_DATABASE_URL="$AUTH_CONN" \
    ecommerce-app npx tsx src/services/auth.ts > /dev/null
echo "Auth Service running on port 3001"

# Search Service
clear_container "paaptol-search-service"
docker run -d --name paaptol-search-service \
    --network ecommerce-network \
    -p 3002:3002 \
    -e SEARCH_DATABASE_URL="$SEARCH_CONN" \
    ecommerce-app npx tsx src/services/search.ts > /dev/null
echo "Search Service running on port 3002"

# Cart Service
clear_container "paaptol-cart-service"
docker run -d --name paaptol-cart-service \
    --network ecommerce-network \
    -p 3003:3003 \
    -e CART_DATABASE_URL="$CART_CONN" \
    ecommerce-app npx tsx src/services/cart.ts > /dev/null
echo "Cart Service running on port 3003"

# Payment Service
clear_container "paaptol-payment-service"
docker run -d --name paaptol-payment-service \
    --network ecommerce-network \
    -p 3005:3005 \
    -e PAYMENT_DATABASE_URL="$PAYMENT_CONN" \
    ecommerce-app npx tsx src/services/payment.ts > /dev/null
echo "Payment Service running on port 3005"

# Buy Service
clear_container "paaptol-buy-service"
docker run -d --name paaptol-buy-service \
    --network ecommerce-network \
    -p 3004:3004 \
    -e BUY_DATABASE_URL="$BUY_CONN" \
    -e SEARCH_SERVICE_URL="http://paaptol-search-service:3002" \
    -e PAYMENT_SERVICE_URL="http://paaptol-payment-service:3005" \
    ecommerce-app npx tsx src/services/buy.ts > /dev/null
echo "Buy Service running on port 3004"

# Gateway Service
clear_container "paaptol-gateway-service"
docker run -d --name paaptol-gateway-service \
    --network ecommerce-network \
    -p 5000:5000 \
    -e AUTH_SERVICE_URL="http://paaptol-auth-service:3001" \
    -e SEARCH_SERVICE_URL="http://paaptol-search-service:3002" \
    -e CART_SERVICE_URL="http://paaptol-cart-service:3003" \
    -e BUY_SERVICE_URL="http://paaptol-buy-service:3004" \
    -e PAYMENT_SERVICE_URL="http://paaptol-payment-service:3005" \
    ecommerce-app npx tsx src/services/gateway.ts > /dev/null
echo "API Gateway Service running on port 5000"

# 7. Launch Frontend Container
echo -e "\n[7/7] Launching Next.js Frontend..."
clear_container "paaptol-frontend"
docker run -d --name paaptol-frontend \
    --network ecommerce-network \
    -p 3000:3000 \
    -e NEXT_GATEWAY_URL="http://paaptol-gateway-service:5000" \
    ecommerce-app npm run dev > /dev/null
echo "Frontend application running on port 3000"

echo "============================================================"
echo " All services started successfully without Docker Compose!"
echo " Frontend URL: http://localhost:3000"
echo " API Gateway:  http://localhost:5000"
echo " Run ./stop-docker.sh to stop and clean up."
echo "============================================================"
